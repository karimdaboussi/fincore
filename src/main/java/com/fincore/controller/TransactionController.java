package com.fincore.controller;

import com.fincore.dto.request.Requests.Money;
import com.fincore.dto.request.Requests.Transfer;
import com.fincore.dto.response.Views.TransactionView;
import com.fincore.entity.TransactionType;
import com.fincore.service.TransactionService;
import jakarta.validation.Valid;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionController {
  private final TransactionService transactions;

  public TransactionController(TransactionService transactions) {
    this.transactions = transactions;
  }

  @PostMapping("/transfer")
  public TransactionView transfer(
      @AuthenticationPrincipal Jwt jwt,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Transfer r) {
    return transactions.transfer(
        Long.valueOf(jwt.getSubject()), r.destinationAccountNumber(), r.amount(), key);
  }

  @PostMapping("/withdraw")
  public TransactionView withdraw(
      @AuthenticationPrincipal Jwt jwt,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Money r) {
    return transactions.withdraw(Long.valueOf(jwt.getSubject()), r.amount(), key);
  }

  @GetMapping("/me")
  public Page<TransactionView> history(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) TransactionType type,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return transactions.history(Long.valueOf(jwt.getSubject()), false, type, from, to, page, size);
  }

  @GetMapping("/{id}")
  public TransactionView detail(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return transactions.detail(Long.valueOf(jwt.getSubject()), id);
  }
}
