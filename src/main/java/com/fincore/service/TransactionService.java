package com.fincore.service;

import com.fincore.dto.response.Views.TransactionView;
import com.fincore.entity.Account;
import com.fincore.entity.AccountStatus;
import com.fincore.entity.Customer;
import com.fincore.entity.CustomerStatus;
import com.fincore.entity.Role;
import com.fincore.entity.Transaction;
import com.fincore.entity.TransactionType;
import com.fincore.exception.ApiException;
import com.fincore.repository.AccountRepository;
import com.fincore.repository.CustomerRepository;
import com.fincore.repository.TransactionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TransactionService {
  private static final BigDecimal MAX_DEPOSIT = new BigDecimal("10000.00");
  private static final BigDecimal DAILY_TRANSFER_LIMIT = new BigDecimal("5000.00");
  private static final BigDecimal MAX_ACCOUNT_BALANCE = new BigDecimal("99999999999999999.99");
  private static final Pattern IDEMPOTENCY_KEY = Pattern.compile("[A-Za-z0-9._:-]{1,100}");

  private final CustomerRepository customers;
  private final AccountRepository accounts;
  private final TransactionRepository transactions;

  public TransactionService(
      CustomerRepository customers,
      AccountRepository accounts,
      TransactionRepository transactions) {
    this.customers = customers;
    this.accounts = accounts;
    this.transactions = transactions;
  }

  public static BigDecimal money(BigDecimal amount) {
    if (amount == null || amount.signum() <= 0 || amount.precision() - amount.scale() > 17)
      throw ApiException.bad("Amount must be positive and fit DECIMAL(19,2)");
    try {
      return amount.setScale(2, RoundingMode.UNNECESSARY);
    } catch (ArithmeticException e) {
      throw ApiException.bad("Amount must have at most two decimal places");
    }
  }

  public TransactionView deposit(Long actorId, Long accountId, BigDecimal amount, String key) {
    return move(actorId, TransactionType.DEPOSIT, accountId, null, amount, key);
  }

  public TransactionView withdraw(Long actorId, BigDecimal amount, String key) {
    return move(actorId, TransactionType.WITHDRAWAL, null, null, amount, key);
  }

  public TransactionView transfer(Long actorId, String destination, BigDecimal amount, String key) {
    return move(actorId, TransactionType.TRANSFER, null, destination, amount, key);
  }

  private TransactionView move(
      Long actor,
      TransactionType type,
      Long depositAccount,
      String destination,
      BigDecimal requested,
      String key) {
    BigDecimal amount = money(requested);
    if (key == null || !IDEMPOTENCY_KEY.matcher(key).matches())
      throw ApiException.bad("Invalid Idempotency-Key");
    // Serialize retries for the same actor before inspecting the idempotency record.
    Customer actorCustomer = customers.lockById(actor).orElseThrow(ApiException::forbidden);
    if (type == TransactionType.DEPOSIT) {
      if (actorCustomer.getRole() != Role.ADMIN) throw ApiException.forbidden();
      if (amount.compareTo(MAX_DEPOSIT) > 0) throw ApiException.bad("Maximum deposit is 10000 USD");
    } else if (actorCustomer.getRole() != Role.CUSTOMER
        || actorCustomer.getStatus() != CustomerStatus.APPROVED) throw ApiException.forbidden();
    Long sourceId =
        type == TransactionType.DEPOSIT
            ? null
            : accounts.findIdByCustomerId(actor).orElseThrow(ApiException::missing);
    Long targetId =
        type == TransactionType.DEPOSIT
            ? depositAccount
            : type == TransactionType.TRANSFER
                ? accounts.findIdByAccountNumber(destination).orElseThrow(ApiException::missing)
                : null;
    var prior = transactions.findByActorIdAndIdempotencyKey(actor, key);
    if (prior.isPresent()) {
      Transaction transaction = prior.get();
      if (transaction.getType() != type
          || transaction.getAmount().compareTo(amount) != 0
          || !Objects.equals(
              transaction.getSourceAccount() == null
                  ? null
                  : transaction.getSourceAccount().getId(),
              sourceId)
          || !Objects.equals(
              transaction.getDestinationAccount() == null
                  ? null
                  : transaction.getDestinationAccount().getId(),
              targetId))
        throw new ApiException(
            org.springframework.http.HttpStatus.CONFLICT,
            "Idempotency key already used for a different request");
      return new TransactionView(transaction);
    }
    if (sourceId != null && sourceId.equals(targetId))
      throw ApiException.bad("Cannot transfer to the same account");
    // Always lock account rows in ascending order to avoid opposite-transfer deadlocks.
    var ids = new TreeSet<Long>();
    if (sourceId != null) ids.add(sourceId);
    if (targetId != null) ids.add(targetId);
    Map<Long, Account> locked = new HashMap<>();
    for (Long id : ids) locked.put(id, accounts.lockById(id).orElseThrow(ApiException::missing));
    Account source = locked.get(sourceId);
    Account target = locked.get(targetId);
    if (source != null && source.getStatus() != AccountStatus.ACTIVE)
      throw ApiException.bad("Source account is not active");
    if (target != null
        && (target.getStatus() == AccountStatus.CLOSED
            || (type == TransactionType.TRANSFER && target.getStatus() != AccountStatus.ACTIVE)))
      throw ApiException.bad("Destination account cannot receive this operation");
    if (target != null && target.getCustomer().getStatus() != CustomerStatus.APPROVED)
      throw ApiException.bad("Destination customer must be approved");
    if (source != null && source.getBalance().compareTo(amount) < 0)
      throw ApiException.bad("Insufficient balance");
    Instant timestamp = Instant.now();
    if (type == TransactionType.TRANSFER) {
      Instant start =
          timestamp.atZone(ZoneOffset.UTC).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();
      if (transactions
              .outgoing(source.getId(), start, start.plusSeconds(86400))
              .add(amount)
              .compareTo(DAILY_TRANSFER_LIMIT)
          > 0) throw ApiException.bad("Daily outgoing transfer limit is 5000 USD (UTC)");
    }
    if (target != null && target.getBalance().add(amount).compareTo(MAX_ACCOUNT_BALANCE) > 0)
      throw ApiException.bad("Destination balance exceeds supported range");
    if (source != null) source.setBalance(source.getBalance().subtract(amount));
    if (target != null) target.setBalance(target.getBalance().add(amount));
    Transaction transaction = new Transaction();
    transaction.setReference("TXN-" + UUID.randomUUID());
    transaction.setCreatedAt(timestamp);
    transaction.setSourceAccount(source);
    transaction.setDestinationAccount(target);
    transaction.setAmount(amount);
    transaction.setType(type);
    transaction.setActorId(actor);
    transaction.setIdempotencyKey(key);
    return new TransactionView(transactions.save(transaction));
  }

  @Transactional(readOnly = true)
  public Page<TransactionView> history(
      Long actor, boolean all, TransactionType type, Instant from, Instant to, int page, int size) {
    Customer actorCustomer = customers.findById(actor).orElseThrow(ApiException::forbidden);
    if (all && actorCustomer.getRole() != Role.ADMIN) throw ApiException.forbidden();
    if (page < 0 || size < 1 || size > 100 || from != null && to != null && from.isAfter(to))
      throw ApiException.bad("Invalid pagination or date range");
    Specification<Transaction> spec =
        (root, query, cb) -> {
          var ps = new ArrayList<jakarta.persistence.criteria.Predicate>();
          if (!all) {
            var source = root.join("sourceAccount", jakarta.persistence.criteria.JoinType.LEFT);
            var target =
                root.join("destinationAccount", jakarta.persistence.criteria.JoinType.LEFT);
            ps.add(
                cb.or(
                    cb.equal(source.get("customer").get("id"), actor),
                    cb.equal(target.get("customer").get("id"), actor)));
          }
          if (type != null) ps.add(cb.equal(root.get("type"), type));
          if (from != null) ps.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
          if (to != null) ps.add(cb.lessThan(root.get("createdAt"), to));
          return cb.and(ps.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    return transactions
        .findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")))
        .map(TransactionView::new);
  }

  @Transactional(readOnly = true)
  public TransactionView detail(Long actor, Long id) {
    Customer actorCustomer = customers.findById(actor).orElseThrow(ApiException::forbidden);
    Transaction transaction = transactions.findById(id).orElseThrow(ApiException::missing);
    if (actorCustomer.getRole() != Role.ADMIN
        && (transaction.getSourceAccount() == null
            || !transaction.getSourceAccount().getCustomer().getId().equals(actor))
        && (transaction.getDestinationAccount() == null
            || !transaction.getDestinationAccount().getCustomer().getId().equals(actor)))
      throw ApiException.missing();
    return new TransactionView(transaction);
  }
}
