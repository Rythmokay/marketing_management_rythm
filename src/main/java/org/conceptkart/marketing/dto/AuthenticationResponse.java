package org.conceptkart.marketing.dto;

import org.conceptkart.marketing.model.Role;

public class AuthenticationResponse {
    private String token;
    private Role role;
    private String username;
    private String displayName;

    public AuthenticationResponse() {}

    public AuthenticationResponse(String token, Role role, String username, String displayName) {
        this.token = token;
        this.role = role;
        this.username = username;
        this.displayName = displayName;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
}
