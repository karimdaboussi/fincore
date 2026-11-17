package com.fincore.service;

import com.fincore.dto.response.Views.AccountView;
import com.fincore.dto.response.Views.CustomerView;
import com.fincore.exception.ApiException;
import com.fincore.repository.AccountRepository;
import com.fincore.repository.CustomerRepository;
import com.fincore.repository.TransactionRepository;
import jakarta.persistence.EntityManager;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AdminService {
  private final CustomerService security;
  private final CustomerRepository customers;
  private final AccountRepository accounts;
  private final TransactionRepository transactions;
  private final EntityManager entityManager;

  public AdminService(
      CustomerService security,
      CustomerRepository customers,
      AccountRepository accounts,
      TransactionRepository transactions,
      EntityManager entityManager) {
    this.security = security;
    this.customers = customers;
    this.accounts = accounts;
    this.transactions = transactions;
    this.entityManager = entityManager;
  }

  private Pageable page(int p, int s) {
    if (p < 0 || s < 1 || s > 100) throw ApiException.bad("Invalid pagination");
    return PageRequest.of(p, s, Sort.by("id"));
  }

  public Page<CustomerView> customers(Long actor, int p, int s) {
    security.requireAdmin(actor);
    return customers.findAll(page(p, s)).map(CustomerView::new);
  }

  public Page<AccountView> accounts(Long actor, int p, int s) {
    security.requireAdmin(actor);
    return accounts.findAll(page(p, s)).map(AccountView::new);
  }

  public Map<String, Object> statistics(Long actor) {
    security.requireAdmin(actor);
    return Map.of(
        "customers",
        customers.count(),
        "accounts",
        accounts.count(),
        "transactions",
        transactions.count(),
        "totalBalanceUSD",
        entityManager
            .createQuery(
                "select coalesce(sum(a.balance),0) from Account a", java.math.BigDecimal.class)
            .getSingleResult());
  }
}
