package com.fincore.service;

import com.fincore.dto.response.Views.AccountView;
import com.fincore.dto.response.Views.CustomerView;
import com.fincore.entity.Account;
import com.fincore.entity.AccountStatus;
import com.fincore.entity.Customer;
import com.fincore.entity.CustomerStatus;
import com.fincore.entity.Role;
import com.fincore.exception.ApiException;
import com.fincore.repository.AccountRepository;
import com.fincore.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CustomerService {
  private final CustomerRepository customers;
  private final AccountRepository accounts;

  public CustomerService(CustomerRepository customers, AccountRepository accounts) {
    this.customers = customers;
    this.accounts = accounts;
  }

  public Customer current(Long id) {
    return customers.findById(id).orElseThrow(ApiException::forbidden);
  }

  public void requireAdmin(Long id) {
    if (current(id).getRole() != Role.ADMIN) throw ApiException.forbidden();
  }

  public CustomerView profile(Long id) {
    return new CustomerView(current(id));
  }

  public CustomerView update(Long id, String name) {
    Customer customer = customers.lockById(id).orElseThrow(ApiException::missing);
    customer.setFullName(name.trim());
    return new CustomerView(customer);
  }

  public Account own(Long id) {
    return accounts.findByCustomerId(id).orElseThrow(ApiException::missing);
  }

  public CustomerView decision(Long admin, Long id, CustomerStatus status) {
    requireAdmin(admin);
    Customer customer = customers.lockById(id).orElseThrow(ApiException::missing);
    if (customer.getRole() != Role.CUSTOMER || customer.getStatus() != CustomerStatus.PENDING)
      throw ApiException.bad("Only pending customer applications can be decided");
    customer.setStatus(status);
    return new CustomerView(customer);
  }

  public AccountView accountStatus(Long admin, Long id, AccountStatus status) {
    requireAdmin(admin);
    Account account = accounts.lockById(id).orElseThrow(ApiException::missing);
    if (account.getStatus() == AccountStatus.CLOSED)
      throw ApiException.bad("Closed accounts cannot be reopened");
    if (status == AccountStatus.CLOSED && account.getBalance().signum() != 0)
      throw ApiException.bad("Account must have zero balance before closing");
    account.setStatus(status);
    return new AccountView(account);
  }
}
