package org.conceptkart.marketing.controller;

import org.conceptkart.marketing.model.AuditLog;
import org.conceptkart.marketing.repository.AuditLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The change log, newest first. */
@RestController
@RequestMapping("/api/v1/history")
public class HistoryController {

    private static final int MAX_LIMIT = 5000;

    private final AuditLogRepository auditLogRepository;

    public HistoryController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<List<AuditLog>> getHistory(@RequestParam(defaultValue = "2000") int limit) {
        int size = Math.max(1, Math.min(limit, MAX_LIMIT));
        return ResponseEntity.ok(auditLogRepository.findAllByOrderByTimestampDescIdDesc(PageRequest.of(0, size)));
    }
}
