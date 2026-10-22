package org.conceptkart.marketing.service;

import org.conceptkart.marketing.model.AuditLog;
import org.conceptkart.marketing.model.User;
import org.conceptkart.marketing.repository.AuditLogRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Records every change made in the portal (who, when, what, and field-by-field before/after)
 * so the team can see who updated what.
 */
@Service
public class AuditService {

    public record FieldChange(String field, String label, String from, String to) {}

    /** Readable names for influencer and tracking fields, in display order. Fields not listed are not compared. */
    private static final Map<String, String> FIELD_LABELS = new LinkedHashMap<>();
    static {
        FIELD_LABELS.put("name", "Name");
        FIELD_LABELS.put("channelName", "Channel name");
        FIELD_LABELS.put("product", "Product");
        FIELD_LABELS.put("language", "Language");
        FIELD_LABELS.put("barterStatus", "Deal type");
        FIELD_LABELS.put("email", "Email");
        FIELD_LABELS.put("phone", "Phone number");
        FIELD_LABELS.put("address", "Address");
        FIELD_LABELS.put("youtube", "YouTube");
        FIELD_LABELS.put("instagram", "Instagram");
        FIELD_LABELS.put("twitter", "X / Twitter");
        FIELD_LABELS.put("extraInfo", "Sheet column C");
        FIELD_LABELS.put("extraLink", "Other link");
        FIELD_LABELS.put("orderMade", "Order made");
        FIELD_LABELS.put("orderDate", "Order date");
        FIELD_LABELS.put("received", "Received");
        FIELD_LABELS.put("receivedDate", "Received date");
        FIELD_LABELS.put("reviewVideoLink", "Review video link");
        FIELD_LABELS.put("toBeReturned", "To be returned");
        FIELD_LABELS.put("returnPickUpDate", "Pick-up date");
        FIELD_LABELS.put("pickedUp", "Picked up");
        FIELD_LABELS.put("returnReceived", "Return received");
        FIELD_LABELS.put("returnReceivedDate", "Return received date");
        FIELD_LABELS.put("notes", "Notes");
        FIELD_LABELS.put("fullName", "Full name");
        FIELD_LABELS.put("username", "Username");
        FIELD_LABELS.put("role", "Role");
    }

    private final AuditLogRepository auditLogRepository;
    private final JsonMapper jsonMapper;

    public AuditService(AuditLogRepository auditLogRepository, JsonMapper jsonMapper) {
        this.auditLogRepository = auditLogRepository;
        this.jsonMapper = jsonMapper;
    }

    /** Field values of a record as trimmed strings ("" when empty), for comparing before and after. */
    @SuppressWarnings("unchecked")
    public Map<String, String> snapshot(Object record) {
        Map<String, Object> raw = record == null ? Map.of() : jsonMapper.convertValue(record, Map.class);
        Map<String, String> values = new LinkedHashMap<>();
        FIELD_LABELS.keySet().forEach(field -> {
            if (raw.containsKey(field)) {
                Object v = raw.get(field);
                values.put(field, v == null ? "" : String.valueOf(v).trim());
            }
        });
        return values;
    }

    /** Fields whose value differs between two snapshots; pass an empty map for "before" on create or "after" on delete. */
    public List<FieldChange> diff(Map<String, String> before, Map<String, String> after) {
        List<FieldChange> changes = new ArrayList<>();
        FIELD_LABELS.forEach((field, label) -> {
            if (!before.containsKey(field) && !after.containsKey(field)) return;
            String from = before.getOrDefault(field, "");
            String to = after.getOrDefault(field, "");
            if (!from.equals(to)) {
                changes.add(new FieldChange(field, label, from, to));
            }
        });
        return changes;
    }

    public void record(String action, String entityType, String entityId, String entityLabel, String summary, List<FieldChange> changes) {
        AuditLog log = new AuditLog();
        log.setTimestamp(Instant.now());
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            log.setActor(user.getUsername());
            log.setActorName(user.getDisplayName());
        } else {
            log.setActor("system");
            log.setActorName("System");
        }
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setEntityLabel(entityLabel);
        log.setSummary(summary);
        log.setChanges(jsonMapper.writeValueAsString(changes == null ? List.of() : changes));
        auditLogRepository.save(log);
    }
}
