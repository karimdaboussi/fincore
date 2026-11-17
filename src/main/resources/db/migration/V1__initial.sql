CREATE TABLE customers (
id BIGSERIAL PRIMARY KEY, full_name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE,
password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL CHECK(role IN ('CUSTOMER','ADMIN')),
status VARCHAR(20) NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED')), created_at TIMESTAMPTZ NOT NULL, CHECK(email=lower(email)));
CREATE TABLE accounts (
id BIGSERIAL PRIMARY KEY, account_number VARCHAR(255) NOT NULL UNIQUE, customer_id BIGINT NOT NULL UNIQUE REFERENCES customers(id),
balance NUMERIC(19,2) NOT NULL CHECK(balance>=0), currency VARCHAR(255) NOT NULL CHECK(currency='USD'),
status VARCHAR(20) NOT NULL CHECK(status IN ('ACTIVE','FROZEN','CLOSED')), version BIGINT NOT NULL);
CREATE TABLE bank_transactions (
id BIGSERIAL PRIMARY KEY, reference VARCHAR(255) NOT NULL UNIQUE,
source_account_id BIGINT REFERENCES accounts(id), destination_account_id BIGINT REFERENCES accounts(id),
amount NUMERIC(19,2) NOT NULL CHECK(amount>0), type VARCHAR(20) NOT NULL,
status VARCHAR(255) NOT NULL CHECK(status='COMPLETED'), created_at TIMESTAMPTZ NOT NULL,
actor_id BIGINT NOT NULL REFERENCES customers(id), idempotency_key VARCHAR(100) NOT NULL, UNIQUE(actor_id,idempotency_key),
CHECK((type='DEPOSIT' AND source_account_id IS NULL AND destination_account_id IS NOT NULL) OR
(type='WITHDRAWAL' AND source_account_id IS NOT NULL AND destination_account_id IS NULL) OR
(type='TRANSFER' AND source_account_id IS NOT NULL AND destination_account_id IS NOT NULL AND source_account_id<>destination_account_id)));
CREATE INDEX tx_source_time ON bank_transactions(source_account_id,created_at);
CREATE INDEX tx_destination_time ON bank_transactions(destination_account_id,created_at);
