-- AlterTable: add mfa_recovery_codes column to users
-- Recovery codes were previously encoded inside the mfa_secret column using
-- a "||RC:<hash1>,..." suffix, which caused TOTP verification to fail because
-- authenticator.verify() received the full concatenated string instead of
-- just the TOTP secret. This column separates the two concerns cleanly.

ALTER TABLE "users" ADD COLUMN "mfa_recovery_codes" TEXT;

-- Migrate existing rows that have the packed format:
-- Extract the pure TOTP secret (before "||RC:") back into mfa_secret,
-- and write the recovery codes JSON array into the new column.
UPDATE "users"
SET
  "mfa_recovery_codes" = CASE
    WHEN "mfa_secret" LIKE '%||RC:%'
    THEN '[' || REPLACE(SPLIT_PART("mfa_secret", '||RC:', 2), ',', '","') || ']'
    ELSE NULL
  END,
  "mfa_secret" = CASE
    WHEN "mfa_secret" LIKE '%||RC:%'
    THEN SPLIT_PART("mfa_secret", '||RC:', 1)
    ELSE "mfa_secret"
  END
WHERE "mfa_secret" IS NOT NULL;
