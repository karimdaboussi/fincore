package com.fincore;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.context.*;

@EnabledIfEnvironmentVariable(named = "FINCORE_TEST_DB_URL", matches = ".+")
class LocalPostgresIntegrationTest extends BankingIntegrationSupport {
  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", () -> System.getenv("FINCORE_TEST_DB_URL"));
    r.add(
        "spring.datasource.username",
        () -> System.getenv().getOrDefault("FINCORE_TEST_DB_USER", "fincore_test"));
    r.add(
        "spring.datasource.password",
        () -> System.getenv().getOrDefault("FINCORE_TEST_DB_PASSWORD", ""));
    TestDatabaseProperties.secrets(r);
  }
}
