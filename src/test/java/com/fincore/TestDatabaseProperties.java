package com.fincore;

import org.springframework.test.context.DynamicPropertyRegistry;

final class TestDatabaseProperties {
  static void secrets(DynamicPropertyRegistry r) {
    r.add("fincore.jwt-secret", () -> "integration-test-secret-at-least-32-bytes-long");
    r.add("fincore.admin-email", () -> "");
    r.add("fincore.admin-password", () -> "");
  }
}
