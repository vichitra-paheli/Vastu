-- CreateTable: pages
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "template_type" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: views
CREATE TABLE "views" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "state_json" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "color_dot" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");
CREATE INDEX "pages_organization_id_idx" ON "pages"("organization_id");
CREATE INDEX "views_page_id_idx" ON "views"("page_id");
CREATE INDEX "views_created_by_idx" ON "views"("created_by");
CREATE INDEX "views_organization_id_idx" ON "views"("organization_id");

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "views" ADD CONSTRAINT "views_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "views" ADD CONSTRAINT "views_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "views" ADD CONSTRAINT "views_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
