package org.conceptkart.marketing.controller;

import org.conceptkart.marketing.dto.AuthenticationRequest;
import org.conceptkart.marketing.dto.AuthenticationResponse;
import org.conceptkart.marketing.service.AuthenticationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationService service;
    private final boolean demoEnabled;
    private final String demoUsername;
    private final String demoPassword;

    public AuthController(AuthenticationService service,
                          @Value("${app.demo.enabled:false}") boolean demoEnabled,
                          @Value("${app.demo.username:demo}") String demoUsername,
                          @Value("${app.demo.password:}") String demoPassword) {
        this.service = service;
        this.demoEnabled = demoEnabled;
        this.demoUsername = demoUsername;
        this.demoPassword = demoPassword;
    }

    /** Public read-only demo login shown on the sign-in page; 404 when the demo account is turned off. */
    @GetMapping("/demo")
    public ResponseEntity<Map<String, String>> demoAccount() {
        if (!demoEnabled || demoPassword.isBlank()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("username", demoUsername, "password", demoPassword));
    }


    @PostMapping("/authenticate")
    public ResponseEntity<AuthenticationResponse> authenticate(
            @RequestBody AuthenticationRequest request
    ) {
        return ResponseEntity.ok(service.authenticate(request));
    }
}
