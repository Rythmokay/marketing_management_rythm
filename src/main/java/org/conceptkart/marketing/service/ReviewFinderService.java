package org.conceptkart.marketing.service;

import org.conceptkart.marketing.model.Influencer;
import org.conceptkart.marketing.model.ProductCampaign;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.CompletionException;
import java.util.concurrent.TimeUnit;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Looks for an influencer's review video of a product: Gemini searches the web (Google Search grounding),
 * then the suggested video is checked against YouTube itself, so an invented link or a video from
 * another channel is never reported as found.
 */
@Service
public class ReviewFinderService {

    /**
     * status: FOUND (video exists on the influencer's channel), NEEDS_REVIEW (a video exists but the
     * channel or the match is uncertain), NOT_FOUND.
     */
    public record ReviewSearchResult(String status, String videoUrl, String videoTitle, String videoChannel,
                                     String publishedDate, String confidence, String reason,
                                     String thumbnailUrl, List<String> searchQueries) {}


    /** A failure the person should see, with the HTTP status to answer with. */
    public static class ReviewFinderException extends RuntimeException {
        private final HttpStatus status;

        public ReviewFinderException(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }

        public HttpStatus getStatus() { return status; }
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ReviewFinderService.class);
    /** Per call; a grounded search usually answers in 10–30 s but sometimes takes over a minute. */
    private static final Duration CALL_TIMEOUT = Duration.ofSeconds(120);
    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";
    private static final Pattern VIDEO_ID = Pattern.compile("(?:[?&]v=|youtu\\.be/|/shorts/|/embed/|/live/)([A-Za-z0-9_-]{11})");

    private final JsonMapper jsonMapper;
    private final HttpClient http;
    private final String apiKey;
    private final String model;

    public ReviewFinderService(JsonMapper jsonMapper,
                               @Value("${app.gemini.api-key:}") String apiKey,
                               @Value("${app.gemini.model:gemini-flash-latest}") String model) {
        this.jsonMapper = jsonMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public boolean isConfigured() {
        return !apiKey.isEmpty();
    }

    public String getModel() {
        return model;
    }

    /**
     * What to look for: a channel (handle or link, and/or its name) and a product.
     * productDetails (brand, model, other names) and context (e.g. when it was sent) help the search.
     */
    public record CheckTarget(String channel, String channelName, String ownerName, String language,
                              String product, String productDetails, String context) {}

    /** Review search for an influencer we track. */
    public ReviewSearchResult find(Influencer influencer, String product, ProductCampaign campaign) {
        if (blank(influencer.getYoutube()) && blank(influencer.getChannelName())) {
            throw new ReviewFinderException(HttpStatus.BAD_REQUEST,
                    "Add the influencer's YouTube link or channel name first.");
        }
        String context = null;
        if (campaign != null) {
            if (!blank(campaign.getReceivedDate())) context = "They received the product on " + campaign.getReceivedDate() + ".";
            else if (!blank(campaign.getOrderDate())) context = "The product was ordered for them on " + campaign.getOrderDate() + ".";
        }
        return check(new CheckTarget(influencer.getYoutube(), influencer.getChannelName(), influencer.getName(),
                influencer.getLanguage(), product, null, context));
    }

    /** Checks whether the channel has uploaded a video of the product. */
    public ReviewSearchResult check(CheckTarget target) {
        if (!isConfigured()) {
            throw new ReviewFinderException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Gemini is not set up. Add GEMINI_API_KEY to the server's environment and restart.");
        }
        if (blank(target.channel()) && blank(target.channelName())) {
            throw new ReviewFinderException(HttpStatus.BAD_REQUEST, "Enter the YouTube channel handle or link.");
        }
        if (blank(target.product())) {
            throw new ReviewFinderException(HttpStatus.BAD_REQUEST, "Enter the product name.");
        }
        String product = target.product().trim();

        // Step 1: research with Google Search. Asking for JSON here makes Gemini skip the search, so the
        // research is free text and step 2 turns it into fields.
        String prompt = buildResearchPrompt(target);
        GeminiReply research = callGemini(prompt, true);
        if (research.searchQueries().isEmpty()) {
            // Answered from memory: its "not found" means nothing, so ask once more
            research = callGemini(prompt + "\nRun the Google searches before answering.", true);
        }
        List<String> queries = new java.util.ArrayList<>(research.searchQueries());
        Map<String, Object> answer = extractFields(research.text(), target);
        if (!Boolean.TRUE.equals(answer.get("found")) && Boolean.TRUE.equals(answer.get("videoMentionedWithoutUrl"))
                && !str(answer.get("videoTitle")).isEmpty()) {
            // The notes name a matching video but not its link: look that exact video up
            GeminiReply lookup = callGemini("Use Google Search to find the exact YouTube URL of the video titled \""
                    + str(answer.get("videoTitle")) + "\" uploaded by the YouTube channel " + channelLabel(target)
                    + ". Reply with the URL, title, uploader and upload date. Never guess or build a URL.", true);
            queries.addAll(lookup.searchQueries());
            answer = extractFields(research.text() + "\n\nFollow-up search for the video's link:\n" + lookup.text(), target);
        }
        String reason = str(answer.get("reason"));
        String confidence = str(answer.get("confidence")).toLowerCase(Locale.ROOT);
        String videoId = videoId(str(answer.get("videoUrl")));

        if (!Boolean.TRUE.equals(answer.get("found")) || videoId == null) {
            if (queries.isEmpty()) {
                return new ReviewSearchResult("NOT_FOUND", null, null, null, null, "low",
                        "Gemini answered without searching the web, so this isn't reliable. Try \"Search again\".", null, queries);
            }
            return new ReviewSearchResult("NOT_FOUND", null, null, null, null, confidence,
                    reason.isEmpty() ? "No review video of " + product + " was found on this channel." : reason, null, queries);
        }

        String videoUrl = str(answer.get("videoUrl")).contains("/shorts/")
                ? "https://www.youtube.com/shorts/" + videoId
                : "https://www.youtube.com/watch?v=" + videoId;
        String published = str(answer.get("publishedDate"));
        HttpResult oembedReply;
        try {
            oembedReply = youtubeOembed(videoId);
        } catch (IOException e) {
            return new ReviewSearchResult("NEEDS_REVIEW", videoUrl, str(answer.get("videoTitle")), null, published,
                    confidence, "YouTube couldn't be reached to confirm this video. Open it to check. " + reason,
                    thumbnail(videoId), queries);
        }
        if (oembedReply.status() != 200) {
            if (oembedReply.status() == 401 || oembedReply.status() == 403) {
                // The video exists but YouTube won't describe it (embedding disabled), so the channel can't be confirmed
                return new ReviewSearchResult("NEEDS_REVIEW", videoUrl, str(answer.get("videoTitle")), null, published,
                        confidence, "YouTube couldn't confirm which channel uploaded this video. Open it to check. " + reason,
                        thumbnail(videoId), queries);
            }
            return new ReviewSearchResult("NOT_FOUND", null, null, null, null, confidence,
                    "Gemini suggested a video that doesn't exist on YouTube, so it was discarded.", null, queries);
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> oembed = jsonMapper.readValue(oembedReply.body(), Map.class);

        String title = str(oembed.get("title"));
        String author = str(oembed.get("author_name"));
        if (!sameChannel(target, str(oembed.get("author_url")), author)) {
            return new ReviewSearchResult("NEEDS_REVIEW", videoUrl, title, author, published, confidence,
                    "This video was uploaded by \"" + author + "\", which doesn't look like " + channelLabel(target)
                            + ". Check before using it.", thumbnail(videoId), queries);
        }
        return new ReviewSearchResult("low".equals(confidence) ? "NEEDS_REVIEW" : "FOUND",
                videoUrl, title, author, published, confidence, reason, thumbnail(videoId), queries);
    }

    /** "@handle" or "handle" becomes a channel link; links are kept as they are. */
    static String channelUrl(String channel) {
        if (blank(channel)) return null;
        String c = channel.trim();
        if (c.toLowerCase(Locale.ROOT).contains("youtube.com") || c.toLowerCase(Locale.ROOT).contains("youtu.be")) {
            return c.matches("(?i)^https?://.*") ? c : "https://" + c;
        }
        return "https://www.youtube.com/@" + c.replaceFirst("^@", "");
    }

    private static String channelLabel(CheckTarget t) {
        if (!blank(t.channelName())) return "\"" + t.channelName().trim() + "\"";
        String key = channelKey(channelUrl(t.channel()));
        return key == null ? "this channel" : key.startsWith("channel/") ? "this channel" : "@" + key;
    }

    private String buildResearchPrompt(CheckTarget t) {
        String url = channelUrl(t.channel());
        StringBuilder p = new StringBuilder();
        p.append("Use Google Search to find out whether the YouTube channel ").append(channelLabel(t));
        if (url != null) p.append(" (").append(url).append(')');
        if (!blank(t.ownerName()) && !t.ownerName().equals(t.channelName())) p.append(", run by ").append(t.ownerName());
        p.append(", has uploaded a video or Short that reviews, unboxes or features the \"").append(t.product().trim()).append("\".\n");
        if (!blank(t.productDetails())) p.append("About the product: ").append(t.productDetails().trim()).append('\n');
        if (!blank(t.language())) p.append("The channel posts in ").append(t.language()).append(", so titles may be in that language.\n");
        if (!blank(t.context())) p.append(t.context().trim()).append('\n');
        p.append("""
                Search for the product together with the channel name or handle, and try a shortened product name and
                the brand or model too. Only count videos uploaded by this channel, not other channels. Report each
                matching video you find in the search results with its exact URL, title, uploader channel and upload
                date, or say clearly that none was found. Never guess or build a URL.
                """);
        return p.toString();
    }

    /** Step 2: turns the research text into fields, with Gemini's JSON mode (no searching). */
    @SuppressWarnings("unchecked")
    private Map<String, Object> extractFields(String research, CheckTarget t) {
        String prompt = "Below are research notes on whether the YouTube channel " + channelLabel(t) + " uploaded a video featuring \""
                + t.product().trim() + "\". Fill in the fields from the notes only. If several videos match, pick the main review. "
                + "found is true only when the notes give a YouTube URL of a matching video from this channel; "
                + "if they describe one without a URL, set videoMentionedWithoutUrl and put its title in videoTitle. "
                + "reason is one short sentence for the marketing team.\n\nNotes:\n" + research;
        String json = callGemini(prompt, false).text();
        try {
            return jsonMapper.readValue(json, Map.class);
        } catch (RuntimeException e) {
            throw new ReviewFinderException(HttpStatus.BAD_GATEWAY, "Gemini gave an answer that couldn't be read. Try again.");
        }
    }

    private static final Map<String, Object> ANSWER_SCHEMA = Map.of(
            "type", "OBJECT",
            "properties", Map.of(
                    "found", Map.of("type", "BOOLEAN"),
                    "videoUrl", Map.of("type", "STRING", "description", "Full YouTube URL, or empty"),
                    "videoTitle", Map.of("type", "STRING"),
                    "publishedDate", Map.of("type", "STRING", "description", "YYYY-MM-DD, or empty"),
                    "confidence", Map.of("type", "STRING", "enum", List.of("high", "medium", "low")),
                    "reason", Map.of("type", "STRING"),
                    "videoMentionedWithoutUrl", Map.of("type", "BOOLEAN",
                            "description", "True when the notes describe a matching video from this channel but give no YouTube URL for it")),
            "required", List.of("found", "videoUrl", "videoTitle", "publishedDate", "confidence", "reason", "videoMentionedWithoutUrl"));

    private record GeminiReply(String text, List<String> searchQueries) {}

    /** One generateContent call: with Google Search grounding, or (without) as a JSON answer. */
    @SuppressWarnings("unchecked")
    private GeminiReply callGemini(String prompt, boolean withSearch) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))));
        if (withSearch) {
            body.put("tools", List.of(Map.of("google_search", Map.of())));
        } else {
            body.put("generationConfig", Map.of("responseMimeType", "application/json", "responseSchema", ANSWER_SCHEMA));
        }
        HttpResult reply;
        try {
            reply = send(HttpRequest.newBuilder(URI.create(GEMINI_URL.formatted(model)))
                    .header("x-goog-api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonMapper.writeValueAsString(body)))
                    .build());
        } catch (IOException e) {
            log.warn("Gemini request failed: {}", e.toString());
            throw new ReviewFinderException(HttpStatus.BAD_GATEWAY, e instanceof java.net.http.HttpTimeoutException
                    ? "Gemini took too long to answer. Try again." : "Couldn't reach Gemini. Try again.");
        }
        if (reply.status() != 200) {
            String detail = geminiErrorMessage(reply.body());
            log.warn("Gemini returned HTTP {}: {}", reply.status(), detail);
            String message = reply.status() == 429 ? "Gemini's usage limit was reached. Try again in a minute."
                    : reply.status() == 400 || reply.status() == 401 || reply.status() == 403
                    ? "Gemini rejected the request (check GEMINI_API_KEY and GEMINI_MODEL): " + detail
                    : "Gemini returned an error: " + detail;
            throw new ReviewFinderException(HttpStatus.BAD_GATEWAY, message);
        }
        String response = reply.body();

        StringBuilder text = new StringBuilder();
        List<String> queries = new java.util.ArrayList<>();
        Map<String, Object> root = jsonMapper.readValue(response, Map.class);
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) root.getOrDefault("candidates", List.of());
        if (candidates.isEmpty()) {
            throw new ReviewFinderException(HttpStatus.BAD_GATEWAY, "Gemini returned no answer. Try again.");
        }
        // The Google searches Gemini ran, shown to the person so they can see what was checked
        if (candidates.get(0).get("groundingMetadata") instanceof Map<?, ?> grounding
                && grounding.get("webSearchQueries") instanceof List<?> list) {
            list.forEach(q -> { if (q instanceof String query && !query.isBlank()) queries.add(query); });
        }
        if (candidates.get(0).get("content") instanceof Map<?, ?> content && content.get("parts") instanceof List<?> parts) {
            for (Object part : parts) {
                if (part instanceof Map<?, ?> m && m.get("text") instanceof String t && !Boolean.TRUE.equals(m.get("thought"))) {
                    text.append(t);
                }
            }
        }
        return new GeminiReply(text.toString(), queries);
    }

    private HttpResult youtubeOembed(String videoId) throws IOException {
        String watchUrl = URLEncoder.encode("https://www.youtube.com/watch?v=" + videoId, StandardCharsets.UTF_8);
        return send(HttpRequest.newBuilder(URI.create("https://www.youtube.com/oembed?format=json&url=" + watchUrl)).GET().build());
    }

    private record HttpResult(int status, String body) {}

    /**
     * Sends with a hard deadline on the whole exchange. A request timeout alone only covers the
     * response headers, and a stalled connection to Google once kept a search open for an hour.
     */
    private HttpResult send(HttpRequest request) throws IOException {
        try {
            HttpResponse<String> response = http.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .orTimeout(CALL_TIMEOUT.toSeconds(), TimeUnit.SECONDS)
                    .join();
            return new HttpResult(response.statusCode(), response.body());
        } catch (CompletionException e) {
            if (e.getCause() instanceof java.util.concurrent.TimeoutException) {
                throw new java.net.http.HttpTimeoutException("No answer within " + CALL_TIMEOUT.toSeconds() + "s");
            }
            throw e.getCause() instanceof IOException io ? io : new IOException(e.getCause());
        }
    }

    @SuppressWarnings("unchecked")
    private String geminiErrorMessage(String body) {
        try {
            Map<String, Object> root = jsonMapper.readValue(body, Map.class);
            if (root.get("error") instanceof Map<?, ?> error && error.get("message") instanceof String m) return m;
        } catch (RuntimeException ignored) {
            // not JSON
        }
        return body == null || body.isBlank() ? "no details" : body.substring(0, Math.min(200, body.length()));
    }

    /** The uploader matches when the channel handle/path or the channel name is the same. */
    private boolean sameChannel(CheckTarget t, String authorUrl, String authorName) {
        String expected = channelKey(channelUrl(t.channel()));
        String actual = channelKey(authorUrl);
        if (expected != null && expected.equals(actual)) return true;
        String author = letters(authorName);
        return !author.isEmpty() && (author.equals(letters(t.channelName())) || author.equals(letters(t.ownerName())));
    }

    /** "youtube.com/@Handle/videos" → "handle", "youtube.com/channel/UC…" → "channel/uc…", "youtube.com/name" → "name". */
    static String channelKey(String url) {
        if (blank(url)) return null;
        String path = url.trim().toLowerCase(Locale.ROOT)
                .replaceFirst("^https?://", "")
                .replaceFirst("^(www\\.|m\\.)?youtube\\.com/?", "");
        path = path.split("[?#]")[0];
        String[] parts = path.split("/");
        if (parts.length == 0 || parts[0].isEmpty()) return null;
        if (parts[0].equals("channel") && parts.length > 1) return "channel/" + parts[1];
        if ((parts[0].equals("c") || parts[0].equals("user")) && parts.length > 1) return parts[1];
        return parts[0].replaceFirst("^@", "");
    }

    private static String thumbnail(String videoId) {
        return "https://i.ytimg.com/vi/" + videoId + "/mqdefault.jpg";
    }

    static String videoId(String url) {
        if (blank(url)) return null;
        Matcher m = VIDEO_ID.matcher(url);
        return m.find() ? m.group(1) : null;
    }

    private static String letters(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]", "");
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
