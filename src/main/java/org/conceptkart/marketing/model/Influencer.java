package org.conceptkart.marketing.model;

import jakarta.persistence.*;

@Entity
@Table(name = "influencers")
public class Influencer {

    @Id
    private String id;

    private String name;
    private String channelName;
    private String instagram;
    private String youtube;
    private String twitter;
    private String language;
    private String barterStatus;
    private String email;
    private String phone;

    @Column(length = 1000)
    private String address;

    // Unlabelled columns C and M of the "Influencers Details" sheet
    private String extraInfo;
    private String extraLink;


    public Influencer() {}

    public Influencer(String id, String name, String channelName, String instagram, String youtube,
                      String twitter, String language, String barterStatus, String email,
                      String phone, String address) {
        this.id = id;
        this.name = name;
        this.channelName = channelName;
        this.instagram = instagram;
        this.youtube = youtube;
        this.twitter = twitter;
        this.language = language;
        this.barterStatus = barterStatus;
        this.email = email;
        this.phone = phone;
        this.address = address;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getChannelName() { return channelName; }
    public void setChannelName(String channelName) { this.channelName = channelName; }

    public String getInstagram() { return instagram; }
    public void setInstagram(String instagram) { this.instagram = instagram; }

    public String getYoutube() { return youtube; }
    public void setYoutube(String youtube) { this.youtube = youtube; }

    public String getTwitter() { return twitter; }
    public void setTwitter(String twitter) { this.twitter = twitter; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getBarterStatus() { return barterStatus; }
    public void setBarterStatus(String barterStatus) { this.barterStatus = barterStatus; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getExtraInfo() { return extraInfo; }
    public void setExtraInfo(String extraInfo) { this.extraInfo = extraInfo; }

    public String getExtraLink() { return extraLink; }
    public void setExtraLink(String extraLink) { this.extraLink = extraLink; }
}
