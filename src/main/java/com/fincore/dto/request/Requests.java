package com.fincore.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public final class Requests {
  private Requests() {}

  public record Register(
      @NotBlank @Size(max = 100) String fullName,
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(min = 12, max = 72) String password) {
    @Override
    public String toString() {
      return "Credentials[REDACTED]";
    }
  }

  public record Login(@NotBlank @Email String email, @NotBlank @Size(max = 72) String password) {
    @Override
    public String toString() {
      return "Credentials[REDACTED]";
    }
  }

  public record Profile(@NotBlank @Size(max = 100) String fullName) {}

  public record Money(
      @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount) {}

  public record Transfer(
      @NotBlank String destinationAccountNumber,
      @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount) {}
}
