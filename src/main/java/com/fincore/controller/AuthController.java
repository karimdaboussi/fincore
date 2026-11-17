package com.fincore.controller;

import com.fincore.dto.request.Requests.Login;
import com.fincore.dto.request.Requests.Register;
import com.fincore.dto.response.Views.CustomerView;
import com.fincore.dto.response.Views.Token;
import com.fincore.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService auth;

  public AuthController(AuthService auth) {
    this.auth = auth;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public CustomerView register(@Valid @RequestBody Register r) {
    return auth.register(r);
  }

  @PostMapping("/login")
  public Token login(@Valid @RequestBody Login r) {
    return auth.login(r);
  }
}
