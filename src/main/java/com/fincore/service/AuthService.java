package com.fincore.service;

import com.fincore.dto.request.Requests.Login;
import com.fincore.dto.request.Requests.Register;
import com.fincore.dto.response.Views.CustomerView;
import com.fincore.dto.response.Views.Token;
import com.fincore.entity.Account;
import com.fincore.entity.Customer;
import com.fincore.exception.ApiException;
import com.fincore.repository.AccountRepository;
import com.fincore.repository.CustomerRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final CustomerRepository customers;
  private final AccountRepository accounts;
  private final PasswordEncoder passwords;
  private final JwtEncoder encoder;

  public AuthService(
      CustomerRepository customers,
      AccountRepository accounts,
      PasswordEncoder passwords,
      JwtEncoder encoder) {
    this.customers = customers;
    this.accounts = accounts;
    this.passwords = passwords;
    this.encoder = encoder;
  }

  @Transactional
  public CustomerView register(Register request) {
    if (request.password().getBytes(StandardCharsets.UTF_8).length > 72)
      throw ApiException.bad("Password exceeds BCrypt's 72-byte limit");
    String email = request.email().trim().toLowerCase(Locale.ROOT);
    if (customers.findByEmail(email).isPresent())
      throw new ApiException(
          org.springframework.http.HttpStatus.CONFLICT, "Email already registered");
    Customer customer = new Customer();
    customer.setFullName(request.fullName().trim());
    customer.setEmail(email);
    customer.setPasswordHash(passwords.encode(request.password()));
    customers.save(customer);
    Account account = new Account();
    account.setCustomer(customer);
    account.setAccountNumber(
        "ACC" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT));
    accounts.save(account);
    return new CustomerView(customer);
  }

  @Transactional(readOnly = true)
  public Token login(Login request) {
    Customer customer =
        customers
            .findByEmail(request.email().trim().toLowerCase(Locale.ROOT))
            .orElseThrow(this::unauthorized);
    if (request.password().getBytes(StandardCharsets.UTF_8).length > 72
        || !passwords.matches(request.password(), customer.getPasswordHash())) throw unauthorized();
    Instant now = Instant.now();
    String token =
        encoder
            .encode(
                JwtEncoderParameters.from(
                    JwsHeader.with(MacAlgorithm.HS256).build(),
                    JwtClaimsSet.builder()
                        .issuer("fincore")
                        .subject(customer.getId().toString())
                        .issuedAt(now)
                        .expiresAt(now.plusSeconds(3600))
                        .build()))
            .getTokenValue();
    return new Token(token, "Bearer", 3600, new CustomerView(customer));
  }

  private ApiException unauthorized() {
    return new ApiException(
        org.springframework.http.HttpStatus.UNAUTHORIZED, "Invalid credentials");
  }
}
