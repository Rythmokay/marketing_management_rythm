package org.conceptkart.marketing.repository;

import org.conceptkart.marketing.model.ProductCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductCampaignRepository extends JpaRepository<ProductCampaign, String> {
    List<ProductCampaign> findByInfluencerId(String influencerId);
    Optional<ProductCampaign> findByInfluencerIdAndProduct(String influencerId, String product);
    void deleteByInfluencerId(String influencerId);
    void deleteByProduct(String product);
    long countByProduct(String product);
}
