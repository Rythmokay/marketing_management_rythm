package org.conceptkart.marketing.controller;

import org.conceptkart.marketing.model.Influencer;
import org.conceptkart.marketing.model.ProductCampaign;
import org.conceptkart.marketing.repository.InfluencerRepository;
import org.conceptkart.marketing.repository.ProductCampaignRepository;
import org.conceptkart.marketing.service.AuditService;
import org.conceptkart.marketing.service.ReviewFinderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Per-product order / review / return tracking for influencers. */
@RestController
@RequestMapping("/api/v1/campaigns")
public class CampaignController {

    private final ProductCampaignRepository campaignRepository;
    private final InfluencerRepository influencerRepository;
    private final AuditService auditService;
    private final ReviewFinderService reviewFinderService;

    public CampaignController(ProductCampaignRepository campaignRepository,
                              InfluencerRepository influencerRepository,
                              AuditService auditService,
                              ReviewFinderService reviewFinderService) {
        this.campaignRepository = campaignRepository;
        this.influencerRepository = influencerRepository;
        this.auditService = auditService;
        this.reviewFinderService = reviewFinderService;
    }

    @GetMapping
    public ResponseEntity<List<ProductCampaign>> getAllCampaigns() {
        return ResponseEntity.ok(campaignRepository.findAll());
    }

    /** Creates the campaign, or updates the existing one for the same influencer + product. */
    @PostMapping
    public ResponseEntity<ProductCampaign> createCampaign(@RequestBody ProductCampaign campaign) {
        if (campaign.getInfluencerId() == null || campaign.getProduct() == null) {
            return ResponseEntity.badRequest().build();
        }
        Optional<ProductCampaign> existing = campaignRepository
                .findByInfluencerIdAndProduct(campaign.getInfluencerId(), campaign.getProduct());
        Map<String, String> before = existing.map(auditService::snapshot).orElse(Map.of());
        ProductCampaign target = existing.orElseGet(() -> {
            ProductCampaign created = new ProductCampaign();
            created.setId(campaign.getId() == null || campaign.getId().isBlank()
                    ? "cmp-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4)
                    : campaign.getId());
            created.setInfluencerId(campaign.getInfluencerId());
            created.setProduct(campaign.getProduct());
            return created;
        });
        target.copyTrackingFrom(campaign);
        ProductCampaign saved = campaignRepository.save(target);
        List<AuditService.FieldChange> changes = auditService.diff(before, auditService.snapshot(saved));
        if (existing.isEmpty()) {
            auditService.record("CREATED", "TRACKING", saved.getId(), label(saved),
                    "Added " + saved.getProduct() + " for " + influencerName(saved), changes);
        } else if (!changes.isEmpty()) {
            auditService.record("UPDATED", "TRACKING", saved.getId(), label(saved), "Updated tracking for " + label(saved), changes);
        }
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductCampaign> updateCampaign(@PathVariable String id, @RequestBody ProductCampaign updatedData) {
        return campaignRepository.findById(id)
                .map(existing -> {
                    Map<String, String> before = auditService.snapshot(existing);
                    existing.copyTrackingFrom(updatedData);
                    ProductCampaign saved = campaignRepository.save(existing);
                    List<AuditService.FieldChange> changes = auditService.diff(before, auditService.snapshot(saved));
                    if (!changes.isEmpty()) {
                        auditService.record("UPDATED", "TRACKING", saved.getId(), label(saved), "Updated tracking for " + label(saved), changes);
                    }
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Whether the AI review search can be used (a Gemini key is set on the server). */
    @GetMapping("/find-review/status")
    public ResponseEntity<Map<String, Object>> findReviewStatus() {
        return ResponseEntity.ok(Map.of("configured", reviewFinderService.isConfigured(), "model", reviewFinderService.getModel()));
    }

    /**
     * Searches the influencer's YouTube channel for a review of the product (Gemini + a check on YouTube).
     * Nothing is saved: the person decides whether to use the link. Works before the tracking row is saved too.
     */
    @PostMapping("/find-review")
    public ResponseEntity<?> findReview(@RequestBody Map<String, String> request) {
        String influencerId = request.get("influencerId");
        String product = request.get("product");
        if (influencerId == null || product == null || product.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Choose an influencer and a product."));
        }
        Optional<Influencer> influencer = influencerRepository.findById(influencerId);
        if (influencer.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Influencer not found."));
        }
        ProductCampaign campaign = campaignRepository.findByInfluencerIdAndProduct(influencerId, product).orElse(null);
        try {
            return ResponseEntity.ok(reviewFinderService.find(influencer.get(), product, campaign));
        } catch (ReviewFinderService.ReviewFinderException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCampaign(@PathVariable String id) {
        campaignRepository.findById(id).ifPresent(existing -> {
            auditService.record("DELETED", "TRACKING", id, label(existing),
                    "Removed " + existing.getProduct() + " from " + influencerName(existing),
                    auditService.diff(auditService.snapshot(existing), Map.of()));
            campaignRepository.deleteById(id);
        });
        return ResponseEntity.noContent().build();
    }

    private String influencerName(ProductCampaign c) {
        return influencerRepository.findById(c.getInfluencerId()).map(i -> i.getName()).orElse("unknown influencer");
    }

    private String label(ProductCampaign c) {
        return influencerName(c) + " · " + c.getProduct();
    }
}
