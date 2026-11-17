package com.fincore.controller;

import com.fincore.dto.request.Requests.Money;
import com.fincore.dto.response.Views.AccountView;
import com.fincore.dto.response.Views.CustomerView;
import com.fincore.dto.response.Views.TransactionView;
import com.fincore.entity.AccountStatus;
import com.fincore.entity.CustomerStatus;
import com.fincore.entity.TransactionType;
import com.fincore.service.AdminService;
import com.fincore.service.CustomerService;
import com.fincore.service.TransactionService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
  private final CustomerService customers;
  private final TransactionService transactions;
  private final AdminService admin;

  public AdminController(
      CustomerService customers, TransactionService transactions, AdminService admin) {
    this.customers = customers;
    this.transactions = transactions;
    this.admin = admin;
  }

  private Long actorId(Jwt jwt) {
    return Long.valueOf(jwt.getSubject());
  }

  @GetMapping("/customers")
  public Page<CustomerView> customers(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return admin.customers(actorId(jwt), page, size);
  }

  @PatchMapping("/customers/{id}/approve")
  public CustomerView approve(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return customers.decision(actorId(jwt), id, CustomerStatus.APPROVED);
  }

  @PatchMapping("/customers/{id}/reject")
  public CustomerView reject(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return customers.decision(actorId(jwt), id, CustomerStatus.REJECTED);
  }

  @GetMapping("/accounts")
  public Page<AccountView> accounts(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return admin.accounts(actorId(jwt), page, size);
  }

  @PatchMapping("/accounts/{id}/freeze")
  public AccountView freeze(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return customers.accountStatus(actorId(jwt), id, AccountStatus.FROZEN);
  }

  @PatchMapping("/accounts/{id}/unfreeze")
  public AccountView unfreeze(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return customers.accountStatus(actorId(jwt), id, AccountStatus.ACTIVE);
  }

  @PatchMapping("/accounts/{id}/close")
  public AccountView close(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return customers.accountStatus(actorId(jwt), id, AccountStatus.CLOSED);
  }

  @PostMapping("/accounts/{id}/deposit")
  public TransactionView deposit(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Money r) {
    return transactions.deposit(actorId(jwt), id, r.amount(), key);
  }

  @GetMapping("/transactions")
  public Page<TransactionView> transactions(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) TransactionType type,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return transactions.history(actorId(jwt), true, type, from, to, page, size);
  }

  @GetMapping("/statistics")
  public Map<String, Object> statistics(@AuthenticationPrincipal Jwt jwt) {
    return admin.statistics(actorId(jwt));
  }
}
