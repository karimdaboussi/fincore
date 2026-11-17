package com.fincore.controller;

import com.fincore.dto.response.Views.AccountView;
import com.fincore.service.CustomerService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/accounts/me")
public class AccountController {
  private final CustomerService customers;

  public AccountController(CustomerService customers) {
    this.customers = customers;
  }

  @GetMapping
  public AccountView me(@AuthenticationPrincipal Jwt jwt) {
    return new AccountView(customers.own(Long.valueOf(jwt.getSubject())));
  }

  @GetMapping("/balance")
  public java.util.Map<String, Object> balance(@AuthenticationPrincipal Jwt jwt) {
    var a = customers.own(Long.valueOf(jwt.getSubject()));
    return java.util.Map.of("balance", a.getBalance(), "currency", a.getCurrency());
  }
}
