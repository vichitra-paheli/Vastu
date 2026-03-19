-- CreateEnum
CREATE TYPE "SsoProviderType" AS ENUM ('SAML', 'OIDC');

-- CreateEnum
CREATE TYPE "SsoProviderStatus" AS ENUM ('LIVE', 'DRAFT');

-- CreateTable
CREATE TABLE "sso_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SsoProviderType" NOT NULL,
    "status" "SsoProviderStatus" NOT NULL DEFAULT 'DRAFT',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "client_id" TEXT,
    "encrypted_client_secret" TEXT,
    "issuer_url" TEXT,
    "metadata_url" TEXT,
    "redirect_uri" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "organization_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sso_providers_organization_id_idx" ON "sso_providers"("organization_id");

-- AddForeignKey
ALTER TABLE "sso_providers" ADD CONSTRAINT "sso_providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_providers" ADD CONSTRAINT "sso_providers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
