package com.fincore.repository;

import com.fincore.entity.Transaction;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface TransactionRepository
    extends JpaRepository<Transaction, Long>, JpaSpecificationExecutor<Transaction> {
  Optional<Transaction> findByActorIdAndIdempotencyKey(Long actorId, String key);

  @Query(
      "select coalesce(sum(t.amount),0) from Transaction t where t.sourceAccount.id=:id and"
          + " t.type=com.fincore.entity.TransactionType.TRANSFER and t.createdAt>=:start and"
          + " t.createdAt<:end")
  BigDecimal outgoing(Long id, Instant start, Instant end);
}
