package org.conceptkart.marketing.config;

import org.conceptkart.marketing.model.Influencer;
import org.conceptkart.marketing.model.Product;
import org.conceptkart.marketing.model.ProductCampaign;
import org.conceptkart.marketing.model.Role;
import org.conceptkart.marketing.model.User;
import org.conceptkart.marketing.repository.InfluencerRepository;
import org.conceptkart.marketing.repository.ProductCampaignRepository;
import org.conceptkart.marketing.repository.ProductRepository;
import org.conceptkart.marketing.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final InfluencerRepository influencerRepository;
    private final ProductCampaignRepository campaignRepository;
    private final PasswordEncoder passwordEncoder;
    private final JsonMapper jsonMapper;
    private final JdbcTemplate jdbcTemplate;

    @Value("${app.admin.initial-password}")
    private String initialAdminPassword;

    @Value("${app.seed.demo-employee:false}")
    private boolean seedDemoEmployee;

    @Value("${app.demo.enabled:false}")
    private boolean demoEnabled;

    @Value("${app.demo.username:demo}")
    private String demoUsername;

    @Value("${app.demo.password:}")
    private String demoPassword;

    public DataInitializer(UserRepository userRepository,
                           ProductRepository productRepository,
                           InfluencerRepository influencerRepository,
                           ProductCampaignRepository campaignRepository,
                           PasswordEncoder passwordEncoder,
                           JsonMapper jsonMapper,
                           JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.influencerRepository = influencerRepository;
        this.campaignRepository = campaignRepository;
        this.passwordEncoder = passwordEncoder;
        this.jsonMapper = jsonMapper;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        allowAllRolesInDatabase();

        // 1. Default accounts only on a brand-new database. Passwords are never reset here,
        //    so changes made on the Marketing Team page survive restarts.
        if (userRepository.count() == 0) {
            User admin = new User("admin", passwordEncoder.encode(initialAdminPassword), Role.ADMIN);
            admin.setFullName("Admin");
            admin.setCreatedAt(Instant.now());
            userRepository.save(admin);
            if (seedDemoEmployee) {
                User employee = new User("employee", passwordEncoder.encode("emp123"), Role.EMPLOYEE);
                employee.setCreatedAt(Instant.now());
                userRepository.save(employee);
            }
        } else if (userRepository.findAll().stream().noneMatch(u -> u.getRole() == Role.ADMIN)) {
            // Safety net: the portal always keeps at least one admin who can manage the team
            User admin = userRepository.findByUsername("admin").orElseGet(() -> new User("admin", passwordEncoder.encode(initialAdminPassword), Role.ADMIN));
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
        }

        // 2. Public read-only demo account. Its password is shown on the sign-in page, so it is
        //    reset to the configured one on every start instead of being kept like other passwords.
        if (demoEnabled && !demoPassword.isBlank()) {
            User demo = userRepository.findByUsername(demoUsername).orElseGet(() -> {
                User created = new User(demoUsername, null, Role.DEMO);
                created.setFullName("Demo (read-only)");
                created.setCreatedAt(Instant.now());
                return created;
            });
            if (demo.getRole() != Role.ADMIN) {
                demo.setRole(Role.DEMO);
                if (demo.getPassword() == null || !passwordEncoder.matches(demoPassword, demo.getPassword())) {
                    demo.setPassword(passwordEncoder.encode(demoPassword));
                }
                userRepository.save(demo);
            }
        }

        // 3. Members created before join dates were recorded show as joined at first start-up
        userRepository.findAll().stream().filter(u -> u.getCreatedAt() == null).forEach(u -> {
            u.setCreatedAt(Instant.now());
            userRepository.save(u);
        });

        // 4. Seed products, influencers and their per-product campaigns from seed/influencers.json
        //    (cleaned from frontend/data/lol.xlsx) only on an empty DB, so UI edits survive restarts
        SeedData seed;
        try (InputStream in = new ClassPathResource("seed/influencers.json").getInputStream()) {
            seed = jsonMapper.readValue(in, SeedData.class);
        }
        if (productRepository.count() == 0) {
            for (String prodName : seed.products()) {
                productRepository.save(new Product(prodName));
            }
        }
        if (influencerRepository.count() == 0) {
            influencerRepository.saveAll(seed.influencers());
            campaignRepository.saveAll(seed.campaigns());
        }
    }

    /**
     * Hibernate adds a PostgreSQL check constraint listing the Role values when it creates the users table,
     * but ddl-auto=update never changes it, so a database created before a role was added would reject it.
     */
    private void allowAllRolesInDatabase() {
        String product = jdbcTemplate.execute((java.sql.Connection c) -> c.getMetaData().getDatabaseProductName());
        if (!"PostgreSQL".equals(product)) return;
        String roles = Arrays.stream(Role.values()).map(r -> "'" + r.name() + "'").collect(Collectors.joining(", "));
        jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
        jdbcTemplate.execute("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (" + roles + "))");
    }

    private record SeedData(List<String> products, List<Influencer> influencers, List<ProductCampaign> campaigns) {}
}
