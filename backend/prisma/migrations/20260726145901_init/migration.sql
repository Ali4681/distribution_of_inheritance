-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'CALCULATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('FATHER', 'MOTHER', 'HUSBAND', 'WIFE', 'SON', 'DAUGHTER', 'SON_OF_SON', 'DAUGHTER_OF_SON', 'BROTHER', 'SISTER', 'FULL_BROTHER', 'FULL_SISTER', 'PATERNAL_BROTHER', 'PATERNAL_SISTER', 'MATERNAL_BROTHER', 'MATERNAL_SISTER', 'PATERNAL_GRANDFATHER', 'PATERNAL_GRANDMOTHER', 'MATERNAL_GRANDFATHER', 'MATERNAL_GRANDMOTHER', 'PATERNAL_UNCLE', 'PATERNAL_UNCLE_FULL', 'PATERNAL_UNCLE_PATERNAL', 'MATERNAL_UNCLE', 'PATERNAL_AUNT', 'MATERNAL_AUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('FULL_BLOCK', 'PARTIAL_BLOCK');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PDF', 'SUMMARY');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('AR', 'EN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "deceased_name" TEXT NOT NULL,
    "death_date" TIMESTAMP(3) NOT NULL,
    "total_estate" DECIMAL(18,2) NOT NULL,
    "funeral_costs" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "debts" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "mandatory_will" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "optional_will" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "CaseStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "full_name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "relation_type" "RelationType" NOT NULL,
    "is_alive" BOOLEAN NOT NULL DEFAULT true,
    "is_muslim" BOOLEAN NOT NULL DEFAULT true,
    "is_murderer" BOOLEAN NOT NULL DEFAULT false,
    "birth_date" TIMESTAMP(3),

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heirs" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "is_eligible" BOOLEAN NOT NULL,
    "share_fraction" TEXT,
    "share_percentage" DECIMAL(10,6),
    "monetary_value" DECIMAL(18,2),
    "legal_basis" TEXT,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heirs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_heirs" (
    "id" TEXT NOT NULL,
    "heir_id" TEXT NOT NULL,
    "blocked_by_id" TEXT NOT NULL,
    "block_reason" TEXT NOT NULL,
    "block_type" "BlockType" NOT NULL,

    CONSTRAINT "blocked_heirs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'AR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "case_id" TEXT,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "ip_address" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "heirs_member_id_key" ON "heirs"("member_id");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heirs" ADD CONSTRAINT "heirs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heirs" ADD CONSTRAINT "heirs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_heirs" ADD CONSTRAINT "blocked_heirs_heir_id_fkey" FOREIGN KEY ("heir_id") REFERENCES "heirs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_heirs" ADD CONSTRAINT "blocked_heirs_blocked_by_id_fkey" FOREIGN KEY ("blocked_by_id") REFERENCES "heirs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
