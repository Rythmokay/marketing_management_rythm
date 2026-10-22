package org.conceptkart.marketing.controller;

import org.conceptkart.marketing.service.ReviewFinderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Review checker: has a YouTube channel (any handle, tracked or not) uploaded a video of a product?
 * Read-only; saving a found link to tracking goes through the campaigns API.
 */
@RestController
@RequestMapping("/api/v1/review-check")
public class ReviewCheckController {

    private static final int MAX_LENGTH = 500;

    private final ReviewFinderService reviewFinderService;

    public ReviewCheckController(ReviewFinderService reviewFinderService) {
        this.reviewFinderService = reviewFinderService;
    }

    /** Body: channel (handle or link), product, and optional channelName, productDetails, postedAfter (YYYY-MM-DD). */
    @PostMapping
    public ResponseEntity<?> check(@RequestBody Map<String, String> request) {
        for (String value : request.values()) {
            if (value != null && value.length() > MAX_LENGTH) {
                return ResponseEntity.badRequest().body(Map.of("message", "Keep each field under " + MAX_LENGTH + " characters."));
            }
        }
        String postedAfter = request.get("postedAfter");
        String context = postedAfter == null || postedAfter.isBlank() ? null
                : "Only count videos uploaded on or after " + postedAfter.trim() + " (the product was sent around then).";
        try {
            return ResponseEntity.ok(reviewFinderService.check(new ReviewFinderService.CheckTarget(
                    request.get("channel"), request.get("channelName"), null, request.get("language"),
                    request.get("product"), request.get("productDetails"), context)));
        } catch (ReviewFinderService.ReviewFinderException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
        }
    }
}
