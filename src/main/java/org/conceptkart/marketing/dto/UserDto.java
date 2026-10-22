package org.conceptkart.marketing.dto;

import org.conceptkart.marketing.model.Role;
import org.conceptkart.marketing.model.User;

import java.time.Instant;

/**
 * Data Transfer Object (DTO) for User information.
 * FUNDAMENTAL CONCEPT: DTOs are used to transfer data between the client and server.
 * We use DTOs instead of raw Entities (like User.java) to prevent leaking sensitive
 * database information (like passwords) to the frontend.
 */
public class UserDto {
    private Long id;
    private String username;
    private String fullName;
    private Role role;
    private Instant createdAt;

    public UserDto(Long id, String username, String fullName, Role role, Instant createdAt) {
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.role = role;
        this.createdAt = createdAt;
    }

    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getUsername(), user.getFullName(), user.getRole(), user.getCreatedAt());
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getFullName() { return fullName; }
    public Role getRole() { return role; }
    public Instant getCreatedAt() { return createdAt; }
}
