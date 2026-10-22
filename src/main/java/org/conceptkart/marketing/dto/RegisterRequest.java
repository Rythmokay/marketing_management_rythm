package org.conceptkart.marketing.dto;

import org.conceptkart.marketing.model.Role;

/** New team member, or changes to one (blank fields are left unchanged on update). */
public class RegisterRequest {
    private String username;
    private String fullName;
    private String password;
    private Role role;

    public RegisterRequest() {}

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
}
