-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "IntervalType" AS ENUM ('HOURS', 'DAYS', 'WEEKS');

-- CreateEnum
CREATE TYPE "SymptomType" AS ENUM ('INTOXICATION', 'STOMACH_ISSUES', 'FLU');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "displayName" TEXT,
    "assignedHospitalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interval_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intervalType" "IntervalType" NOT NULL,
    "intervalValue" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interval_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_periods" (
    "id" TEXT NOT NULL,
    "intervalConfigId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "collectionPeriodId" TEXT NOT NULL,
    "symptomType" "SymptomType" NOT NULL,
    "severity" "Severity",
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_config" (
    "id" TEXT NOT NULL,
    "appName" TEXT NOT NULL DEFAULT 'Symptom Tracker',
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563EB',
    "secondaryColor" TEXT NOT NULL DEFAULT '#10B981',
    "backgroundColor" TEXT NOT NULL DEFAULT '#F9FAFB',
    "textColor" TEXT NOT NULL DEFAULT '#111827',
    "headerBackground" TEXT NOT NULL DEFAULT '#1E3A5F',
    "headerTextColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "fontSizeBase" INTEGER NOT NULL DEFAULT 16,
    "buttonStyle" TEXT NOT NULL DEFAULT 'rounded',
    "cardStyle" TEXT NOT NULL DEFAULT 'raised',
    "showSeverityField" BOOLEAN NOT NULL DEFAULT false,
    "showNotesField" BOOLEAN NOT NULL DEFAULT false,
    "loginMessage" TEXT,
    "dashboardMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_name_key" ON "hospitals"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_shortCode_key" ON "hospitals"("shortCode");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_assignedHospitalId_fkey" FOREIGN KEY ("assignedHospitalId") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_periods" ADD CONSTRAINT "collection_periods_intervalConfigId_fkey" FOREIGN KEY ("intervalConfigId") REFERENCES "interval_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_collectionPeriodId_fkey" FOREIGN KEY ("collectionPeriodId") REFERENCES "collection_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
