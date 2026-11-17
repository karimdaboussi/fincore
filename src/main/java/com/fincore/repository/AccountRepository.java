package com.fincore.repository;

import com.fincore.entity.Account;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface AccountRepository extends JpaRepository<Account, Long> {
  @Query("select a.id from Account a where a.customer.id=:id")
  Optional<Long> findIdByCustomerId(Long id);

  @Query("select a.id from Account a where a.accountNumber=:number")
  Optional<Long> findIdByAccountNumber(String number);

  Optional<Account> findByCustomerId(Long id);

  Optional<Account> findByAccountNumber(String number);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from Account a where a.id=:id")
  Optional<Account> lockById(Long id);
}
