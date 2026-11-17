package com.fincore.controller;

import com.fincore.dto.request.Requests.Profile;
import com.fincore.dto.response.Views.CustomerView;
import com.fincore.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers/me")
public class CustomerController {
  private final CustomerService customers;

  public CustomerController(CustomerService customers) {
    this.customers = customers;
  }

  @GetMapping
  public CustomerView me(@AuthenticationPrincipal Jwt jwt) {
    return customers.profile(Long.valueOf(jwt.getSubject()));
  }

  @PatchMapping
  public CustomerView update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Profile r) {
    return customers.update(Long.valueOf(jwt.getSubject()), r.fullName());
  }
}
