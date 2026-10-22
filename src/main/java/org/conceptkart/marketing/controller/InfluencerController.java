package org.conceptkart.marketing.controller;

import org.conceptkart.marketing.model.Influencer;
import org.conceptkart.marketing.model.ProductCampaign;
import org.conceptkart.marketing.repository.InfluencerRepository;
import org.conceptkart.marketing.repository.ProductCampaignRepository;
import org.conceptkart.marketing.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/influencers")
public class InfluencerController {

    private final InfluencerRepository influencerRepository;
    private final ProductCampaignRepository campaignRepository;
    private final AuditService auditService;

    public InfluencerController(InfluencerRepository influencerRepository,
                                ProductCampaignRepository campaignRepository,
                                AuditService auditService) {
        this.influencerRepository = influencerRepository;
        this.campaignRepository = campaignRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<Influencer>> getAllInfluencers() {
        return ResponseEntity.ok(influencerRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Influencer> createInfluencer(@RequestBody Influencer influencer) {
        if (influencer.getId() == null || influencer.getId().trim().isEmpty()) {
            influencer.setId(newId("inf"));
        }
        Influencer saved = influencerRepository.save(influencer);
        auditService.record("CREATED", "INFLUENCER", saved.getId(), label(saved), "Added influencer " + label(saved),
                auditService.diff(Map.of(), auditService.snapshot(saved)));
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Influencer> updateInfluencer(@PathVariable String id, @RequestBody Influencer updatedData) {
        return influencerRepository.findById(id)
                .map(existing -> {
                    Map<String, String> before = auditService.snapshot(existing);
                    copyDetails(updatedData, existing);
                    Influencer saved = influencerRepository.save(existing);
                    List<AuditService.FieldChange> changes = auditService.diff(before, auditService.snapshot(saved));
                    if (!changes.isEmpty()) {
                        auditService.record("UPDATED", "INFLUENCER", saved.getId(), label(saved), "Edited influencer " + label(saved), changes);
                    }
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> {
                    updatedData.setId(id);
                    Influencer saved = influencerRepository.save(updatedData);
                    auditService.record("CREATED", "INFLUENCER", saved.getId(), label(saved), "Added influencer " + label(saved),
                            auditService.diff(Map.of(), auditService.snapshot(saved)));
                    return ResponseEntity.ok(saved);
                });
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteInfluencer(@PathVariable String id) {
        influencerRepository.findById(id).ifPresent(existing -> {
            int tracking = campaignRepository.findByInfluencerId(id).size();
            auditService.record("DELETED", "INFLUENCER", id, label(existing),
                    "Deleted influencer " + label(existing) + (tracking > 0 ? " and their tracking for " + tracking + " product" + (tracking == 1 ? "" : "s") : ""),
                    auditService.diff(auditService.snapshot(existing), Map.of()));
        });
        campaignRepository.deleteByInfluencerId(id);
        if (influencerRepository.existsById(id)) {
            influencerRepository.deleteById(id);
        }
        return ResponseEntity.noContent().build();
    }

    /**
     * Imports flat spreadsheet rows (influencer details + optional product tracking columns).
     * Rows are matched to existing influencers by name + channel; a row with a product
     * creates or updates that influencer's campaign for the product.
     */
    @PostMapping("/batch")
    @Transactional
    public ResponseEntity<List<Influencer>> batchImport(@RequestBody Map<String, Object> payload) {
        String mode = (String) payload.getOrDefault("mode", "replace");
        List<Map<String, Object>> recordsRaw = (List<Map<String, Object>>) payload.get("records");

        long removedInfluencers = 0;
        if (mode.equalsIgnoreCase("replace")) {
            removedInfluencers = influencerRepository.count();
            campaignRepository.deleteAll();
            influencerRepository.deleteAll();
        }
        int rows = 0;
        long influencersBefore = influencerRepository.count();
        long trackingBefore = campaignRepository.count();

        Map<String, Influencer> byKey = new HashMap<>();
        for (Influencer existing : influencerRepository.findAll()) {
            byKey.put(matchKey(existing.getName(), existing.getChannelName()), existing);
        }

        if (recordsRaw != null) {
            for (Map<String, Object> raw : recordsRaw) {
                String name = str(raw, "name");
                String channelName = str(raw, "channelName");
                if (name.isEmpty() && channelName.isEmpty()) {
                    continue;
                }
                rows++;

                Influencer inf = byKey.computeIfAbsent(matchKey(name, channelName), k -> {
                    Influencer created = new Influencer();
                    created.setId(newId("inf"));
                    return created;
                });
                setIfPresent(raw, "name", inf::setName);
                setIfPresent(raw, "channelName", inf::setChannelName);
                setIfPresent(raw, "instagram", inf::setInstagram);
                setIfPresent(raw, "youtube", inf::setYoutube);
                setIfPresent(raw, "twitter", inf::setTwitter);
                setIfPresent(raw, "language", inf::setLanguage);
                setIfPresent(raw, "barterStatus", inf::setBarterStatus);
                setIfPresent(raw, "email", inf::setEmail);
                setIfPresent(raw, "phone", inf::setPhone);
                setIfPresent(raw, "address", inf::setAddress);
                setIfPresent(raw, "extraInfo", inf::setExtraInfo);
                setIfPresent(raw, "extraLink", inf::setExtraLink);
                influencerRepository.save(inf);

                String product = str(raw, "product");
                if (!product.isEmpty()) {
                    ProductCampaign campaign = campaignRepository
                            .findByInfluencerIdAndProduct(inf.getId(), product)
                            .orElseGet(() -> {
                                ProductCampaign created = new ProductCampaign();
                                created.setId(newId("cmp"));
                                created.setInfluencerId(inf.getId());
                                created.setProduct(product);
                                return created;
                            });
                    setIfPresent(raw, "orderMade", campaign::setOrderMade);
                    setIfPresent(raw, "orderDate", campaign::setOrderDate);
                    setIfPresent(raw, "received", campaign::setReceived);
                    setIfPresent(raw, "receivedDate", campaign::setReceivedDate);
                    setIfPresent(raw, "reviewVideoLink", campaign::setReviewVideoLink);
                    setIfPresent(raw, "toBeReturned", campaign::setToBeReturned);
                    setIfPresent(raw, "returnPickUpDate", campaign::setReturnPickUpDate);
                    setIfPresent(raw, "pickedUp", campaign::setPickedUp);
                    setIfPresent(raw, "returnReceived", campaign::setReturnReceived);
                    setIfPresent(raw, "returnReceivedDate", campaign::setReturnReceivedDate);
                    setIfPresent(raw, "notes", campaign::setNotes);
                    campaignRepository.save(campaign);
                }
            }
        }

        long addedInfluencers = influencerRepository.count() - influencersBefore;
        long addedTracking = campaignRepository.count() - trackingBefore;
        auditService.record("IMPORTED", "INFLUENCER", null, "Spreadsheet import",
                "Imported " + rows + " spreadsheet row" + (rows == 1 ? "" : "s") + " (" + mode.toLowerCase() + " mode): "
                        + addedInfluencers + " new influencer" + (addedInfluencers == 1 ? "" : "s") + ", "
                        + addedTracking + " new product tracking" + (addedTracking == 1 ? "" : "s")
                        + (removedInfluencers > 0 ? "; replaced " + removedInfluencers + " existing influencers" : ""),
                List.of());
        return ResponseEntity.ok(influencerRepository.findAll());
    }

    private static String label(Influencer inf) {
        String name = inf.getName() == null ? "" : inf.getName().trim();
        String channel = inf.getChannelName() == null ? "" : inf.getChannelName().trim();
        if (name.isEmpty()) return channel;
        return channel.isEmpty() || channel.equalsIgnoreCase(name) ? name : name + " (" + channel + ")";
    }

    private static void copyDetails(Influencer from, Influencer to) {
        to.setName(from.getName());
        to.setChannelName(from.getChannelName());
        to.setInstagram(from.getInstagram());
        to.setYoutube(from.getYoutube());
        to.setTwitter(from.getTwitter());
        to.setLanguage(from.getLanguage());
        to.setBarterStatus(from.getBarterStatus());
        to.setEmail(from.getEmail());
        to.setPhone(from.getPhone());
        to.setAddress(from.getAddress());
        to.setExtraInfo(from.getExtraInfo());
        to.setExtraLink(from.getExtraLink());
    }

    private static String matchKey(String name, String channelName) {
        return (name == null ? "" : name.trim().toLowerCase()) + "|" + (channelName == null ? "" : channelName.trim().toLowerCase());
    }

    private static String str(Map<String, Object> raw, String key) {
        Object v = raw.get(key);
        return v == null ? "" : String.valueOf(v).trim();
    }

    private static void setIfPresent(Map<String, Object> raw, String key, java.util.function.Consumer<String> setter) {
        String v = str(raw, key);
        if (!v.isEmpty()) {
            setter.accept(v);
        }
    }

    private static String newId(String prefix) {
        return prefix + "-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4);
    }
}
