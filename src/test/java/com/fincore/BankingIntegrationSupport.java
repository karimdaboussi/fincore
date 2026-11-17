package com.fincore;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fincore.dto.request.Requests.*;
import com.fincore.entity.*;
import com.fincore.exception.ApiException;
import com.fincore.repository.*;
import com.fincore.service.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;

@SpringBootTest
@AutoConfigureMockMvc
abstract class BankingIntegrationSupport {
  @Autowired AuthService auth;
  @Autowired CustomerService customerService;
  @Autowired TransactionService service;
  @Autowired CustomerRepository customers;
  @Autowired AccountRepository accounts;
  @Autowired TransactionRepository transactions;
  @Autowired PlatformTransactionManager manager;
  @Autowired MockMvc mvc;
  Long sender, receiver, admin;
  Long sourceId, targetId;
  String destination;

  @BeforeEach
  void setup() {
    transactions.deleteAll();
    accounts.deleteAll();
    customers.deleteAll();
    sender = register("sender");
    receiver = register("receiver");
    admin = register("admin");
    new TransactionTemplate(manager)
        .execute(
            s -> {
              for (Long id : List.of(sender, receiver, admin)) {
                Customer c = customers.findById(id).orElseThrow();
                c.setStatus(CustomerStatus.APPROVED);
                if (id.equals(admin)) c.setRole(Role.ADMIN);
              }
              return null;
            });
    sourceId = accounts.findByCustomerId(sender).orElseThrow().getId();
    var target = accounts.findByCustomerId(receiver).orElseThrow();
    targetId = target.getId();
    destination = target.getAccountNumber();
    service.deposit(admin, sourceId, new BigDecimal("1000"), "seed");
  }

  Long register(String name) {
    return auth.register(new Register(name, name + "@example.com", "secure-password-123")).id();
  }

  BigDecimal balance(Long id) {
    return accounts.findById(id).orElseThrow().getBalance();
  }

  @Test
  void transferIsAtomicAndRetryIsIdempotent() {
    var first = service.transfer(sender, destination, new BigDecimal("250"), "transfer");
    var retry = service.transfer(sender, destination, new BigDecimal("250"), "transfer");
    assertEquals(first.reference(), retry.reference());
    assertEquals(new BigDecimal("750.00"), balance(sourceId));
    assertEquals(new BigDecimal("250.00"), balance(targetId));
    assertEquals(2, transactions.count());
  }

  @Test
  void failedTransferPreservesBalances() {
    assertThrows(
        ApiException.class,
        () -> service.transfer(sender, destination, new BigDecimal("1001"), "fail"));
    assertEquals(new BigDecimal("1000.00"), balance(sourceId));
    assertEquals(new BigDecimal("0.00"), balance(targetId));
    assertEquals(1, transactions.count());
  }

  @Test
  void databaseFailureRollsBackBothUpdates() {
    assertThrows(
        RuntimeException.class,
        () ->
            new TransactionTemplate(manager)
                .execute(
                    s -> {
                      service.transfer(sender, destination, new BigDecimal("250"), "rollback");
                      transactions.flush();
                      throw new IllegalStateException("Simulated failure after database flush");
                    }));
    assertEquals(new BigDecimal("1000.00"), balance(sourceId));
    assertEquals(new BigDecimal("0.00"), balance(targetId));
    assertEquals(1, transactions.count());
  }

  @Test
  void concurrentWithdrawalsCannotOverspend() throws Exception {
    var pool = Executors.newFixedThreadPool(2);
    var gate = new CountDownLatch(1);
    try {
      List<Future<Boolean>> results = new ArrayList<>();
      for (int i = 0; i < 2; i++) {
        String key = "withdraw-" + i;
        results.add(
            pool.submit(
                () -> {
                  gate.await();
                  try {
                    service.withdraw(sender, new BigDecimal("750"), key);
                    return true;
                  } catch (ApiException e) {
                    return false;
                  }
                }));
      }
      gate.countDown();
      int successes = 0;
      for (var f : results) if (f.get(20, TimeUnit.SECONDS)) successes++;
      assertEquals(1, successes);
      assertEquals(new BigDecimal("250.00"), balance(sourceId));
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void concurrentRetriesCommitOnce() throws Exception {
    var pool = Executors.newFixedThreadPool(2);
    var gate = new CountDownLatch(1);
    try {
      Callable<String> call =
          () -> {
            gate.await();
            return service
                .transfer(sender, destination, new BigDecimal("100"), "same-key")
                .reference();
          };
      var a = pool.submit(call);
      var b = pool.submit(call);
      gate.countDown();
      assertEquals(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
      assertEquals(new BigDecimal("900.00"), balance(sourceId));
      assertEquals(2, transactions.count());
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void databaseRejectsNegativeBalance() {
    assertThrows(
        org.springframework.dao.DataIntegrityViolationException.class,
        () ->
            new TransactionTemplate(manager)
                .execute(
                    s -> {
                      Account a = accounts.findById(sourceId).orElseThrow();
                      a.setBalance(new BigDecimal("-1"));
                      accounts.saveAndFlush(a);
                      return null;
                    }));
    assertEquals(new BigDecimal("1000.00"), balance(sourceId));
  }

  @Test
  void dailyLimitIncludesEarlierTransfers() {
    service.deposit(admin, sourceId, new BigDecimal("5000"), "more");
    service.transfer(sender, destination, new BigDecimal("5000"), "limit");
    assertThrows(
        ApiException.class, () -> service.transfer(sender, destination, BigDecimal.ONE, "exceed"));
  }

  @Test
  void historyContainsDepositsAndIncomingTransfers() {
    service.transfer(sender, destination, BigDecimal.TEN, "history");
    assertEquals(2, service.history(sender, false, null, null, null, 0, 20).getTotalElements());
    assertEquals(1, service.history(receiver, false, null, null, null, 0, 20).getTotalElements());
    assertEquals(
        1,
        service
            .history(sender, false, TransactionType.DEPOSIT, null, null, 0, 20)
            .getTotalElements());
  }

  @Test
  void authenticationAndOwnership() throws Exception {
    mvc.perform(get("/api/v1/accounts/me")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/v1/admin/customers").with(jwt().jwt(j -> j.subject(sender.toString()))))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/admin/customers").with(jwt().jwt(j -> j.subject(admin.toString()))))
        .andExpect(status().isOk());
    Long tx = transactions.findAll().getFirst().getId();
    mvc.perform(
            get("/api/v1/transactions/" + tx).with(jwt().jwt(j -> j.subject(receiver.toString()))))
        .andExpect(status().isNotFound());
  }

  @Test
  void loginProducesUsableJwt() throws Exception {
    String token = auth.login(new Login("sender@example.com", "secure-password-123")).accessToken();
    mvc.perform(get("/api/v1/accounts/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("balance").value(1000.00));
    mvc.perform(get("/api/v1/accounts/me").header("Authorization", "Bearer " + token + "broken"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void approvalAndFrozenAccountRules() {
    Long pending = register("pending");
    assertThrows(ApiException.class, () -> service.withdraw(pending, BigDecimal.ONE, "pending"));
    customerService.accountStatus(admin, sourceId, AccountStatus.FROZEN);
    assertThrows(ApiException.class, () -> service.withdraw(sender, BigDecimal.ONE, "frozen"));
    customerService.accountStatus(admin, sourceId, AccountStatus.ACTIVE);
    service.withdraw(sender, BigDecimal.ONE, "active");
    assertEquals(new BigDecimal("999.00"), balance(sourceId));
  }

  @Test
  void oppositeTransfersDoNotDeadlock() throws Exception {
    service.deposit(admin, targetId, new BigDecimal("1000"), "fund-target");
    String sourceNumber = accounts.findById(sourceId).orElseThrow().getAccountNumber();
    concurrent(
        () -> service.transfer(sender, destination, new BigDecimal("100"), "outbound"),
        () -> service.transfer(receiver, sourceNumber, new BigDecimal("100"), "inbound"));
    assertEquals(new BigDecimal("1000.00"), balance(sourceId));
    assertEquals(new BigDecimal("1000.00"), balance(targetId));
  }

  @Test
  void depositAndWithdrawalPreserveBothChanges() throws Exception {
    concurrent(
        () -> service.deposit(admin, sourceId, new BigDecimal("200"), "deposit"),
        () -> service.withdraw(sender, new BigDecimal("750"), "withdraw"));
    assertEquals(new BigDecimal("450.00"), balance(sourceId));
    assertEquals(3, transactions.count());
  }

  @Test
  void concurrentTransfersCannotExceedDailyLimit() throws Exception {
    service.deposit(admin, sourceId, new BigDecimal("5000"), "fund-limit");
    var pool = Executors.newFixedThreadPool(2);
    var gate = new CountDownLatch(1);
    try {
      List<Future<Boolean>> results = new ArrayList<>();
      for (int i = 0; i < 2; i++) {
        String key = "limit-" + i;
        results.add(
            pool.submit(
                () -> {
                  gate.await();
                  try {
                    service.transfer(sender, destination, new BigDecimal("3000"), key);
                    return true;
                  } catch (ApiException e) {
                    return false;
                  }
                }));
      }
      gate.countDown();
      int successes = 0;
      for (var f : results) if (f.get(20, TimeUnit.SECONDS)) successes++;
      assertEquals(1, successes);
      assertEquals(new BigDecimal("3000.00"), balance(sourceId));
      assertEquals(new BigDecimal("3000.00"), balance(targetId));
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void retryWithDifferentAmountConflicts() {
    service.transfer(sender, destination, BigDecimal.TEN, "reuse");
    assertEquals(
        org.springframework.http.HttpStatus.CONFLICT,
        assertThrows(
                ApiException.class,
                () -> service.transfer(sender, destination, BigDecimal.ONE, "reuse"))
            .getStatus());
    assertEquals(new BigDecimal("990.00"), balance(sourceId));
  }

  @Test
  void apiValidationAndAdminDeposits() throws Exception {
    var customer = jwt().jwt(j -> j.subject(sender.toString()));
    mvc.perform(
            post("/api/v1/admin/accounts/" + sourceId + "/deposit")
                .with(customer)
                .header("Idempotency-Key", "no-access")
                .contentType("application/json")
                .content("{\"amount\":10}"))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/v1/transactions/withdraw")
                .with(customer)
                .contentType("application/json")
                .content("{\"amount\":1}"))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/v1/transactions/withdraw")
                .with(customer)
                .header("Idempotency-Key", "invalid")
                .contentType("application/json")
                .content("{\"amount\":0.001}"))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/v1/auth/register")
                .contentType("application/json")
                .content(
                    "{\"fullName\":\"Intruder\",\"email\":\"intruder@example.com\",\"password\":\"secure-password-123\",\"role\":\"ADMIN\"}"))
        .andExpect(status().isBadRequest());
  }

  private void concurrent(Callable<?> first, Callable<?> second) throws Exception {
    var pool = Executors.newFixedThreadPool(2);
    var gate = new CountDownLatch(1);
    try {
      var a =
          pool.submit(
              () -> {
                gate.await();
                return first.call();
              });
      var b =
          pool.submit(
              () -> {
                gate.await();
                return second.call();
              });
      gate.countDown();
      a.get(20, TimeUnit.SECONDS);
      b.get(20, TimeUnit.SECONDS);
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void openApiAndCustomerLifecycle() throws Exception {
    mvc.perform(get("/v3/api-docs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("info.title").value("FinCore Banking API"));
    Long pending = register("lifecycle");
    var administrator = jwt().jwt(j -> j.subject(admin.toString()));
    mvc.perform(patch("/api/v1/admin/customers/" + pending + "/approve").with(administrator))
        .andExpect(status().isOk())
        .andExpect(jsonPath("status").value("APPROVED"))
        .andExpect(jsonPath("passwordHash").doesNotExist());
    mvc.perform(
            patch("/api/v1/customers/me")
                .with(jwt().jwt(j -> j.subject(pending.toString())))
                .contentType("application/json")
                .content("{\"fullName\":\"Updated Customer\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("fullName").value("Updated Customer"));
    mvc.perform(get("/api/v1/admin/statistics").with(administrator))
        .andExpect(status().isOk())
        .andExpect(jsonPath("totalBalanceUSD").value(1000));
    Long emptyAccount = accounts.findByCustomerId(pending).orElseThrow().getId();
    mvc.perform(patch("/api/v1/admin/accounts/" + emptyAccount + "/close").with(administrator))
        .andExpect(status().isOk())
        .andExpect(jsonPath("status").value("CLOSED"));
    mvc.perform(patch("/api/v1/admin/accounts/" + emptyAccount + "/unfreeze").with(administrator))
        .andExpect(status().isBadRequest());
  }
}
