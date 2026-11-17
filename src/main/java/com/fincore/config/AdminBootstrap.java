package com.fincore.config;

import com.fincore.entity.Customer;
import com.fincore.entity.CustomerStatus;
import com.fincore.entity.Role;
import com.fincore.repository.CustomerRepository;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminBootstrap implements ApplicationRunner {
  private final CustomerRepository customers;
  private final PasswordEncoder passwords;
  private final String email, password;

  public AdminBootstrap(
      CustomerRepository c,
      PasswordEncoder p,
      @Value("${fincore.admin-email}") String e,
      @Value("${fincore.admin-password}") String pass) {
    customers = c;
    passwords = p;
    email = e;
    password = pass;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (email.isBlank()) return;
    String normalized = email.trim().toLowerCase(Locale.ROOT);
    var existing = customers.findByEmail(normalized);
    if (existing.isPresent()) {
      if (existing.get().getRole() != Role.ADMIN)
        throw new IllegalStateException("Bootstrap email belongs to a customer");
      return;
    }
    if (password.length() < 12
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new IllegalStateException("Bootstrap admin password must be 12-72 bytes");
    Customer c = new Customer();
    c.setFullName("Administrator");
    c.setEmail(normalized);
    c.setPasswordHash(passwords.encode(password));
    c.setRole(Role.ADMIN);
    c.setStatus(CustomerStatus.APPROVED);
    customers.save(c);
  }
}
