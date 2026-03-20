-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "mfa_required" BOOLEAN NOT NULL DEFAULT false;
