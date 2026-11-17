package com.fincore.dto.response;

import com.fincore.entity.Account;
import com.fincore.entity.AccountStatus;
import com.fincore.entity.Customer;
import com.fincore.entity.CustomerStatus;
import com.fincore.entity.Role;
import com.fincore.entity.Transaction;
import com.fincore.entity.TransactionType;
import java.math.BigDecimal;
import java.time.Instant;

public final class Views {
  private Views() {}

  public record CustomerView(
      Long id, String fullName, String email, Role role, CustomerStatus status, Instant createdAt) {
    public CustomerView(Customer customer) {
      this(
          customer.getId(),
          customer.getFullName(),
          customer.getEmail(),
          customer.getRole(),
          customer.getStatus(),
          customer.getCreatedAt());
    }
  }

  public record AccountView(
      Long id, String accountNumber, BigDecimal balance, String currency, AccountStatus status) {
    public AccountView(Account account) {
      this(
          account.getId(),
          account.getAccountNumber(),
          account.getBalance(),
          account.getCurrency(),
          account.getStatus());
    }
  }

  public record TransactionView(
      Long id,
      String reference,
      String sourceAccountNumber,
      String destinationAccountNumber,
      BigDecimal amount,
      TransactionType type,
      String status,
      Instant createdAt) {
    public TransactionView(Transaction transaction) {
      this(
          transaction.getId(),
          transaction.getReference(),
          transaction.getSourceAccount() == null
              ? null
              : transaction.getSourceAccount().getAccountNumber(),
          transaction.getDestinationAccount() == null
              ? null
              : transaction.getDestinationAccount().getAccountNumber(),
          transaction.getAmount(),
          transaction.getType(),
          transaction.getStatus(),
          transaction.getCreatedAt());
    }
  }

  public record Token(String accessToken, String tokenType, long expiresIn, CustomerView customer) {
    @Override
    public String toString() {
      return "Token[REDACTED]";
    }
  }
}
