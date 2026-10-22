package org.conceptkart.marketing.model;

import jakarta.persistence.*;

/**
 * Order / review / return tracking for one influencer on one product
 * (one row of a product sheet in the source spreadsheet).
 */
@Entity
@Table(name = "product_campaigns")
public class ProductCampaign {

    @Id
    private String id;

    private String influencerId;
    private String product;

    private String orderMade;
    private String orderDate;
    private String received;
    private String receivedDate;

    @Column(length = 1000)
    private String reviewVideoLink;

    private String toBeReturned;
    private String returnPickUpDate;
    private String pickedUp;
    private String returnReceived;
    private String returnReceivedDate;

    @Column(length = 1000)
    private String notes;

    public ProductCampaign() {}

    /** Copies every tracking field (not id / influencerId / product) from another campaign. */
    public void copyTrackingFrom(ProductCampaign other) {
        this.orderMade = other.orderMade;
        this.orderDate = other.orderDate;
        this.received = other.received;
        this.receivedDate = other.receivedDate;
        this.reviewVideoLink = other.reviewVideoLink;
        this.toBeReturned = other.toBeReturned;
        this.returnPickUpDate = other.returnPickUpDate;
        this.pickedUp = other.pickedUp;
        this.returnReceived = other.returnReceived;
        this.returnReceivedDate = other.returnReceivedDate;
        this.notes = other.notes;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getInfluencerId() { return influencerId; }
    public void setInfluencerId(String influencerId) { this.influencerId = influencerId; }

    public String getProduct() { return product; }
    public void setProduct(String product) { this.product = product; }

    public String getOrderMade() { return orderMade; }
    public void setOrderMade(String orderMade) { this.orderMade = orderMade; }

    public String getOrderDate() { return orderDate; }
    public void setOrderDate(String orderDate) { this.orderDate = orderDate; }

    public String getReceived() { return received; }
    public void setReceived(String received) { this.received = received; }

    public String getReceivedDate() { return receivedDate; }
    public void setReceivedDate(String receivedDate) { this.receivedDate = receivedDate; }

    public String getReviewVideoLink() { return reviewVideoLink; }
    public void setReviewVideoLink(String reviewVideoLink) { this.reviewVideoLink = reviewVideoLink; }

    public String getToBeReturned() { return toBeReturned; }
    public void setToBeReturned(String toBeReturned) { this.toBeReturned = toBeReturned; }

    public String getReturnPickUpDate() { return returnPickUpDate; }
    public void setReturnPickUpDate(String returnPickUpDate) { this.returnPickUpDate = returnPickUpDate; }

    public String getPickedUp() { return pickedUp; }
    public void setPickedUp(String pickedUp) { this.pickedUp = pickedUp; }

    public String getReturnReceived() { return returnReceived; }
    public void setReturnReceived(String returnReceived) { this.returnReceived = returnReceived; }

    public String getReturnReceivedDate() { return returnReceivedDate; }
    public void setReturnReceivedDate(String returnReceivedDate) { this.returnReceivedDate = returnReceivedDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
