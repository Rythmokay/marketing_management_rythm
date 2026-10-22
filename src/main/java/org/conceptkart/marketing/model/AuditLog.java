package org.conceptkart.marketing.model;

import jakarta.persistence.*;

import java.time.Instant;

/** One recorded change in the portal: who did what to which record, and which fields changed. */
@Entity
@Table(name = "audit_logs", indexes = @Index(columnList = "timestamp"))
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant timestamp;

    /** Username of the person who made the change, plus their display name at the time. */
    private String actor;
    private String actorName;

    /** CREATED, UPDATED, DELETED, IMPORTED or PASSWORD_CHANGED. */
    private String action;

    /** INFLUENCER, PRODUCT, TRACKING or TEAM_MEMBER. */
    private String entityType;
    private String entityId;

    /** Human label of the record, e.g. "Rishabh Jain · Spark Pro". */
    private String entityLabel;

    @Column(length = 1000)
    private String summary;

    /** JSON array of {field, label, from, to}. */
    @Column(columnDefinition = "TEXT")
    private String changes;

    public AuditLog() {}

    public Long getId() { return id; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }
    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }
    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }
    public String getEntityLabel() { return entityLabel; }
    public void setEntityLabel(String entityLabel) { this.entityLabel = entityLabel; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getChanges() { return changes; }
    public void setChanges(String changes) { this.changes = changes; }
}
