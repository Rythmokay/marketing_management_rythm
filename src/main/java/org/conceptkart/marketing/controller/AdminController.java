package org.conceptkart.marketing.controller;

import org.conceptkart.marketing.dto.RegisterRequest;
import org.conceptkart.marketing.dto.UserDto;
import org.conceptkart.marketing.model.Role;
import org.conceptkart.marketing.model.User;
import org.conceptkart.marketing.repository.UserRepository;
import org.conceptkart.marketing.service.AuditService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Marketing team management. SecurityConfig limits "/api/v1/admin/**" to the ADMIN role,
 * so only admins can add, edit and remove members or set their passwords.
 */
@RestController
@RequestMapping("/api/v1/admin/team")
public class AdminController {

    private static final int MIN_PASSWORD_LENGTH = 6;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public AdminController(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @PostMapping
    public ResponseEntity<?> createMember(@RequestBody RegisterRequest request) {
        String username = request.getUsername() == null ? "" : request.getUsername().trim();
        if (username.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "Enter a username.");
        }
        if (userRepository.findByUsername(username).isPresent()) {
            return error(HttpStatus.CONFLICT, "Username \"" + username + "\" is already taken.");
        }
        if (request.getPassword() == null || request.getPassword().length() < MIN_PASSWORD_LENGTH) {
            return error(HttpStatus.BAD_REQUEST, "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.");
        }
        User user = new User(username, passwordEncoder.encode(request.getPassword()),
                request.getRole() == null ? Role.EMPLOYEE : request.getRole());
        user.setFullName(blankToNull(request.getFullName()));
        user.setCreatedAt(Instant.now());
        User saved = userRepository.save(user);
        auditService.record("CREATED", "TEAM_MEMBER", String.valueOf(saved.getId()), saved.getDisplayName(),
                "Added team member " + saved.getDisplayName() + " (" + roleLabel(saved.getRole()) + ")",
                auditService.diff(Map.of(), memberSnapshot(saved)));
        return ResponseEntity.ok(UserDto.from(saved));
    }

    /** Change a member's full name or role. */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateMember(@PathVariable Long id, @RequestBody RegisterRequest request) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return error(HttpStatus.NOT_FOUND, "Team member not found.");
        }
        if (request.getRole() != null && user.getRole() == Role.ADMIN && request.getRole() != Role.ADMIN && adminCount() <= 1) {
            return error(HttpStatus.CONFLICT, "The portal needs at least one admin. Make someone else an admin first.");
        }
        Map<String, String> before = memberSnapshot(user);
        if (request.getFullName() != null) user.setFullName(blankToNull(request.getFullName()));
        if (request.getRole() != null) user.setRole(request.getRole());
        User saved = userRepository.save(user);
        List<AuditService.FieldChange> changes = auditService.diff(before, memberSnapshot(saved));
        if (!changes.isEmpty()) {
            auditService.record("UPDATED", "TEAM_MEMBER", String.valueOf(id), saved.getDisplayName(),
                    "Edited team member " + saved.getDisplayName(), changes);
        }
        return ResponseEntity.ok(UserDto.from(saved));
    }

    /** Set a new password; the member is signed out everywhere and must log in with the new one. */
    @PutMapping("/{id}/password")
    public ResponseEntity<?> changePassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return error(HttpStatus.NOT_FOUND, "Team member not found.");
        }
        String password = body.get("password");
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            return error(HttpStatus.BAD_REQUEST, "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.");
        }
        user.setPassword(passwordEncoder.encode(password));
        user.setCredentialsChangedAt(Instant.now());
        userRepository.save(user);
        // The password itself is never logged
        auditService.record("PASSWORD_CHANGED", "TEAM_MEMBER", String.valueOf(id), user.getDisplayName(),
                "Changed the password for " + user.getDisplayName(), List.of());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMember(@PathVariable Long id, @AuthenticationPrincipal User currentUser) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.noContent().build();
        }
        if (currentUser != null && currentUser.getId().equals(id)) {
            return error(HttpStatus.CONFLICT, "You can't remove yourself. Ask another admin to do it.");
        }
        if (user.getRole() == Role.ADMIN && adminCount() <= 1) {
            return error(HttpStatus.CONFLICT, "The portal needs at least one admin.");
        }
        auditService.record("DELETED", "TEAM_MEMBER", String.valueOf(id), user.getDisplayName(),
                "Removed team member " + user.getDisplayName() + " (" + roleLabel(user.getRole()) + ")",
                auditService.diff(memberSnapshot(user), Map.of()));
        userRepository.delete(user);
        return ResponseEntity.noContent().build();
    }

    private long adminCount() {
        return userRepository.findAll().stream().filter(u -> u.getRole() == Role.ADMIN).count();
    }

    private static Map<String, String> memberSnapshot(User user) {
        return Map.of(
                "username", user.getUsername(),
                "fullName", user.getFullName() == null ? "" : user.getFullName(),
                "role", roleLabel(user.getRole()));
    }

    private static String roleLabel(Role role) {
        return role == Role.ADMIN ? "Admin" : "Team member";
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }
}
