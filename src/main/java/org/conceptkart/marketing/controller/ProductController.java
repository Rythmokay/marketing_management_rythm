package org.conceptkart.marketing.controller;

import org.conceptkart.marketing.model.Product;
import org.conceptkart.marketing.repository.ProductCampaignRepository;
import org.conceptkart.marketing.repository.ProductRepository;
import org.conceptkart.marketing.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final ProductCampaignRepository campaignRepository;
    private final AuditService auditService;

    public ProductController(ProductRepository productRepository, ProductCampaignRepository campaignRepository,
                             AuditService auditService) {
        this.productRepository = productRepository;
        this.campaignRepository = campaignRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts() {
        return ResponseEntity.ok(productRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        name = name.trim();
        if (productRepository.existsByName(name)) {
            return ResponseEntity.ok(productRepository.findByName(name).get());
        }
        Product newProduct = productRepository.save(new Product(name));
        auditService.record("CREATED", "PRODUCT", name, name, "Added product " + name, List.of());
        return ResponseEntity.ok(newProduct);
    }

    @DeleteMapping("/{name}")
    @Transactional
    public ResponseEntity<Void> deleteProduct(@PathVariable String name) {
        // Tracking rows belong to the product, so remove them with it
        if (productRepository.existsByName(name)) {
            long tracking = campaignRepository.countByProduct(name);
            auditService.record("DELETED", "PRODUCT", name, name,
                    "Deleted product " + name + (tracking > 0 ? " and its tracking for " + tracking + " influencer" + (tracking == 1 ? "" : "s") : ""),
                    List.of());
        }
        campaignRepository.deleteByProduct(name);
        if (productRepository.existsByName(name)) {
            productRepository.deleteByName(name);
        }
        return ResponseEntity.noContent().build();
    }
}
