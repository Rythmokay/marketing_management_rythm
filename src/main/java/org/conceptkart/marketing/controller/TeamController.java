package org.conceptkart.marketing.controller;

import org.conceptkart.marketing.dto.UserDto;
import org.conceptkart.marketing.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

/** Everyone signed in can see who is on the marketing team; managing members is in AdminController. */
@RestController
@RequestMapping("/api/v1/team")
public class TeamController {

    private final UserRepository userRepository;

    public TeamController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> getTeam() {
        return ResponseEntity.ok(userRepository.findAll().stream()
                .sorted(Comparator.comparing(u -> u.getDisplayName().toLowerCase()))
                .map(UserDto::from)
                .toList());
    }
}
