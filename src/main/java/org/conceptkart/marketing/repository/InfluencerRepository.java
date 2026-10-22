package org.conceptkart.marketing.repository;

import org.conceptkart.marketing.model.Influencer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InfluencerRepository extends JpaRepository<Influencer, String> {
}
