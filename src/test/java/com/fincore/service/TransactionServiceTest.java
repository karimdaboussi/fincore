package com.fincore.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fincore.entity.*;
import com.fincore.exception.ApiException;
import com.fincore.repository.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {
  @Mock CustomerRepository customers;
  @Mock AccountRepository accounts;
  @Mock TransactionRepository transactions;
  TransactionService service;
  Customer customer;
  Account source, target;

  @BeforeEach
  void setup() {
    service = new TransactionService(customers, accounts, transactions);
    customer = new Customer();
    customer.setId(1L);
    customer.setStatus(CustomerStatus.APPROVED);
    source = new Account();
    source.setId(10L);
    source.setCustomer(customer);
    source.setBalance(new BigDecimal("6000.00"));
    target = new Account();
    target.setId(20L);
    target.setCustomer(customer);
    target.setAccountNumber("DEST");
  }

  void actor() {
    when(customers.lockById(1L)).thenReturn(Optional.of(customer));
  }

  void transfer() {
    actor();
    when(accounts.findIdByCustomerId(1L)).thenReturn(Optional.of(source.getId()));
    when(accounts.findIdByAccountNumber("DEST")).thenAnswer(i -> Optional.of(target.getId()));
  }

  void lock() {
    when(accounts.lockById(10L)).thenReturn(Optional.of(source));
    when(accounts.lockById(20L)).thenReturn(Optional.of(target));
  }

  @Test
  void rejectsInvalidAmounts() {
    for (String n : List.of("0", "-1", "0.001", "100000000000000000"))
      assertThrows(ApiException.class, () -> TransactionService.money(new BigDecimal(n)));
  }

  @Test
  void normalizesExactCents() {
    assertEquals(new BigDecimal("1.00"), TransactionService.money(new BigDecimal("1")));
  }

  @Test
  void rejectsSameAccount() {
    transfer();
    target.setId(source.getId());
    assertThrows(ApiException.class, () -> service.transfer(1L, "DEST", BigDecimal.ONE, "k"));
    verify(transactions, never()).save(any());
  }

  @Test
  void rejectsFrozenSource() {
    transfer();
    lock();
    source.setStatus(AccountStatus.FROZEN);
    assertThrows(ApiException.class, () -> service.transfer(1L, "DEST", BigDecimal.ONE, "k"));
    assertEquals(new BigDecimal("6000.00"), source.getBalance());
  }

  @Test
  void rejectsClosedTarget() {
    transfer();
    lock();
    target.setStatus(AccountStatus.CLOSED);
    assertThrows(ApiException.class, () -> service.transfer(1L, "DEST", BigDecimal.ONE, "k"));
  }

  @Test
  void rejectsInsufficientBalance() {
    transfer();
    lock();
    source.setBalance(BigDecimal.ZERO);
    assertThrows(ApiException.class, () -> service.transfer(1L, "DEST", BigDecimal.ONE, "k"));
  }

  @Test
  void rejectsDailyLimit() {
    transfer();
    lock();
    when(transactions.outgoing(eq(10L), any(), any())).thenReturn(new BigDecimal("5000"));
    assertThrows(ApiException.class, () -> service.transfer(1L, "DEST", BigDecimal.ONE, "k"));
  }

  @Test
  void successfulTransferLocksInOrder() {
    transfer();
    lock();
    when(transactions.outgoing(eq(10L), any(), any())).thenReturn(BigDecimal.ZERO);
    when(transactions.save(any())).thenAnswer(i -> i.getArgument(0));
    var result = service.transfer(1L, "DEST", new BigDecimal("250"), "k");
    assertEquals(new BigDecimal("5750.00"), source.getBalance());
    assertEquals(new BigDecimal("250.00"), target.getBalance());
    assertEquals(TransactionType.TRANSFER, result.type());
    var order = inOrder(accounts);
    order.verify(accounts).lockById(10L);
    order.verify(accounts).lockById(20L);
  }

  @Test
  void duplicateReturnsOriginal() {
    transfer();
    Transaction tx = new Transaction();
    tx.setType(TransactionType.TRANSFER);
    tx.setAmount(BigDecimal.ONE);
    tx.setSourceAccount(source);
    tx.setDestinationAccount(target);
    tx.setReference("original");
    when(transactions.findByActorIdAndIdempotencyKey(1L, "k")).thenReturn(Optional.of(tx));
    assertEquals("original", service.transfer(1L, "DEST", BigDecimal.ONE, "k").reference());
    verify(accounts, never()).lockById(any());
    verify(transactions, never()).save(any());
  }

  @Test
  void duplicateDifferentPayloadConflicts() {
    transfer();
    Transaction tx = new Transaction();
    tx.setType(TransactionType.TRANSFER);
    tx.setAmount(BigDecimal.TEN);
    when(transactions.findByActorIdAndIdempotencyKey(1L, "k")).thenReturn(Optional.of(tx));
    assertEquals(
        org.springframework.http.HttpStatus.CONFLICT,
        assertThrows(ApiException.class, () -> service.transfer(1L, "DEST", BigDecimal.ONE, "k"))
            .getStatus());
  }

  @Test
  void customerCannotDeposit() {
    actor();
    assertThrows(ApiException.class, () -> service.deposit(1L, 20L, BigDecimal.ONE, "k"));
  }

  @Test
  void maximumDeposit() {
    actor();
    customer.setRole(Role.ADMIN);
    assertThrows(
        ApiException.class, () -> service.deposit(1L, 20L, new BigDecimal("10000.01"), "k"));
  }

  @Test
  void pendingCustomerCannotWithdraw() {
    actor();
    customer.setStatus(CustomerStatus.PENDING);
    assertThrows(ApiException.class, () -> service.withdraw(1L, BigDecimal.ONE, "k"));
  }
}
