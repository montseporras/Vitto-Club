DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditCategory') THEN
    CREATE TYPE "AuditCategory" AS ENUM ('SESSION', 'CUSTOMERS', 'EMPLOYEES', 'CONFIGURATION');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  performed_by VARCHAR(200) NOT NULL,
  actor_account_id INTEGER,
  category "AuditCategory" NOT NULL,
  action VARCHAR(200) NOT NULL,
  document_type "DocumentType",
  document_number VARCHAR(20),
  details JSONB
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS audit_logs_category_created_at_idx ON audit_logs (category, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_performed_by_created_at_idx ON audit_logs (performed_by, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_document_type_document_number_created_at_idx
  ON audit_logs (document_type, document_number, created_at);

CREATE OR REPLACE FUNCTION reject_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only'
    USING ERRCODE = '55000';
END
$$;

DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION reject_audit_log_mutation();

DROP TRIGGER IF EXISTS audit_logs_no_truncate ON audit_logs;
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_log_mutation();
