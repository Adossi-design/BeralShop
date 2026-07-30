-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'SUPPORT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_FAILED', 'EXPIRED', 'CANCELLED', 'PAID', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('CUSTOMER', 'ADMIN', 'SYSTEM', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "countries" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "defaultCurrency" CHAR(3) NOT NULL,
    "defaultLocale" VARCHAR(5) NOT NULL,
    "phonePrefix" VARCHAR(6) NOT NULL,
    "addressFormat" VARCHAR(16) NOT NULL,
    "isSellingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isShippingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledPaymentProviders" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" CHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "minorUnitExponent" INTEGER NOT NULL,
    "symbol" VARCHAR(8) NOT NULL,
    "symbolPosition" VARCHAR(8) NOT NULL,
    "displayRounding" VARCHAR(16) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "baseCurrency" CHAR(3) NOT NULL,
    "quoteCurrency" CHAR(3) NOT NULL,
    "rate" DECIMAL(20,10) NOT NULL,
    "source" VARCHAR(60) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "commissionBp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adapterId" VARCHAR(40) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "marginBp" INTEGER NOT NULL DEFAULT 3000,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "iconName" VARCHAR(40),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "categoryId" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("categoryId","locale")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT,
    "brandId" TEXT,
    "vendorId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierSku" VARCHAR(80),
    "basePriceMinor" INTEGER NOT NULL,
    "compareAtPriceMinor" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'RWF',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "searchVector" tsvector,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_translations" (
    "productId" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "specifications" JSONB,
    "keywords" TEXT,

    CONSTRAINT "product_translations_pkey" PRIMARY KEY ("productId","locale")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER,
    "height" INTEGER,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "options" JSONB NOT NULL DEFAULT '{}',
    "priceDeltaMinor" INTEGER NOT NULL DEFAULT 0,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL DEFAULT 'fr',
    "preferredCurrency" CHAR(3) NOT NULL DEFAULT 'RWF',
    "countryCode" CHAR(2),
    "phoneVerifiedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totpSecret" TEXT,
    "totpEnabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" VARCHAR(40),
    "recipientName" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "sector" TEXT,
    "cell" TEXT,
    "village" TEXT,
    "city" TEXT,
    "neighbourhood" TEXT,
    "streetLine" TEXT,
    "postalCode" VARCHAR(20),
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isDefaultShipping" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionToken" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'RWF',
    "fxRateUsed" DECIMAL(20,10),
    "fxLockedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" VARCHAR(24) NOT NULL,
    "userId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "currencyDisplay" CHAR(3) NOT NULL,
    "currencySettlement" CHAR(3) NOT NULL,
    "fxRateUsed" DECIMAL(20,10) NOT NULL DEFAULT 1,
    "subtotalMinor" INTEGER NOT NULL,
    "shippingMinor" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "contactPhone" VARCHAR(20) NOT NULL,
    "contactEmail" TEXT,
    "promotionCode" VARCHAR(40),
    "trackingNumber" VARCHAR(80),
    "carrierName" VARCHAR(80),
    "customerNote" TEXT,
    "internalNote" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "reservationExpiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT,
    "vendorId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "variantOptionsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "imageUrlSnapshot" TEXT,
    "skuSnapshot" VARCHAR(64) NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalMinor" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "providerReference" VARCHAR(120),
    "merchantReference" VARCHAR(64) NOT NULL,
    "idempotencyKey" VARCHAR(64) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "methodDetail" VARCHAR(60),
    "failureReason" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventType" VARCHAR(60) NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "providerReference" VARCHAR(120),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "key" VARCHAR(64) NOT NULL,
    "scope" VARCHAR(40) NOT NULL,
    "userId" TEXT,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "shipping_zones" (
    "id" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "regions" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'RWF',
    "freeAboveMinor" INTEGER,
    "minDeliveryDays" INTEGER,
    "maxDeliveryDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "type" "PromotionType" NOT NULL,
    "value" INTEGER NOT NULL,
    "currency" CHAR(3),
    "minOrderMinor" INTEGER,
    "maxDiscountMinor" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER,
    "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderatedAt" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "template" VARCHAR(60) NOT NULL,
    "recipient" VARCHAR(160) NOT NULL,
    "payload" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" VARCHAR(60) NOT NULL,
    "entityType" VARCHAR(40) NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "countries_isSellingEnabled_idx" ON "countries"("isSellingEnabled");

-- CreateIndex
CREATE INDEX "fx_rates_baseCurrency_quoteCurrency_validUntil_idx" ON "fx_rates"("baseCurrency", "quoteCurrency", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_baseCurrency_quoteCurrency_fetchedAt_key" ON "fx_rates"("baseCurrency", "quoteCurrency", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_slug_key" ON "vendors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_slug_key" ON "suppliers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_position_idx" ON "categories"("parentId", "position");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_status_createdAt_idx" ON "products"("categoryId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "products_status_salesCount_idx" ON "products"("status", "salesCount" DESC);

-- CreateIndex
CREATE INDEX "products_status_basePriceMinor_idx" ON "products"("status", "basePriceMinor");

-- CreateIndex
CREATE INDEX "products_status_createdAt_idx" ON "products"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "products_brandId_status_idx" ON "products"("brandId", "status");

-- CreateIndex
CREATE INDEX "products_vendorId_status_idx" ON "products"("vendorId", "status");

-- CreateIndex
CREATE INDEX "products_supplierId_idx" ON "products"("supplierId");

-- CreateIndex
CREATE INDEX "products_isFeatured_status_idx" ON "products"("isFeatured", "status");

-- CreateIndex
CREATE INDEX "product_images_productId_position_idx" ON "product_images"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_isActive_idx" ON "product_variants"("productId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "addresses_userId_isDefaultShipping_idx" ON "addresses"("userId", "isDefaultShipping");

-- CreateIndex
CREATE UNIQUE INDEX "carts_sessionToken_key" ON "carts"("sessionToken");

-- CreateIndex
CREATE INDEX "carts_userId_idx" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "carts_expiresAt_idx" ON "carts"("expiresAt");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_variantId_key" ON "cart_items"("cartId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_userId_placedAt_idx" ON "orders"("userId", "placedAt" DESC);

-- CreateIndex
CREATE INDEX "orders_status_placedAt_idx" ON "orders"("status", "placedAt" DESC);

-- CreateIndex
CREATE INDEX "orders_placedAt_idx" ON "orders"("placedAt" DESC);

-- CreateIndex
CREATE INDEX "orders_contactPhone_idx" ON "orders"("contactPhone");

-- CreateIndex
CREATE INDEX "orders_status_reservationExpiresAt_idx" ON "orders"("status", "reservationExpiresAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_variantId_idx" ON "order_items"("variantId");

-- CreateIndex
CREATE INDEX "order_items_vendorId_idx" ON "order_items"("vendorId");

-- CreateIndex
CREATE INDEX "order_events_orderId_createdAt_idx" ON "order_events"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_provider_providerReference_idx" ON "payments"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payments_status_lastCheckedAt_idx" ON "payments"("status", "lastCheckedAt");

-- CreateIndex
CREATE INDEX "payment_events_paymentId_receivedAt_idx" ON "payment_events"("paymentId", "receivedAt");

-- CreateIndex
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "idempotency_records_expiresAt_idx" ON "idempotency_records"("expiresAt");

-- CreateIndex
CREATE INDEX "shipping_zones_countryCode_isActive_idx" ON "shipping_zones"("countryCode", "isActive");

-- CreateIndex
CREATE INDEX "shipping_rates_zoneId_isActive_idx" ON "shipping_rates"("zoneId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_isActive_startsAt_endsAt_idx" ON "promotions"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "reviews_productId_status_createdAt_idx" ON "reviews"("productId", "status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_productId_userId_orderId_key" ON "reviews"("productId", "userId", "orderId");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_status_createdAt_idx" ON "notifications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_actorId_createdAt_idx" ON "admin_audit_logs"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_logs_entityType_entityId_idx" ON "admin_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_zones" ADD CONSTRAINT "shipping_zones_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "shipping_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
--  Objets PostgreSQL que Prisma ne sait pas décrire dans son schéma.
--
--  Ce fichier est destiné à être COLLÉ À LA FIN de la première migration générée
--  (prisma/migrations/<horodatage>_init/migration.sql), avant de l'appliquer.
--  Procédure détaillée dans packages/db/README.md.
--
--  Il est idempotent : le rejouer ne casse rien.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────── 1. Extensions de recherche ───────────────────────────

-- unaccent : « ecouteur » doit trouver « Écouteur ».
CREATE EXTENSION IF NOT EXISTS unaccent;

-- pg_trgm : tolérance aux fautes de frappe (« bluetoth » → « bluetooth »).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ──────────────────── 2. Configuration de recherche désaccentuée ────────────────────
-- `unaccent` n'est pas immutable par défaut, donc inutilisable dans une colonne
-- générée. On crée une configuration de recherche qui applique unaccent en amont
-- du stemming français : le résultat, lui, est déterministe.

DROP TEXT SEARCH CONFIGURATION IF EXISTS fr_unaccent CASCADE;
CREATE TEXT SEARCH CONFIGURATION fr_unaccent (COPY = french);

ALTER TEXT SEARCH CONFIGURATION fr_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;

-- ─────────────────────── 3. Vecteur de recherche des produits ───────────────────────
-- La pondération A/B/C/D fait remonter un produit NOMMÉ « Écouteur Bluetooth » avant
-- un produit dont la description mentionne seulement « compatible Bluetooth ».
--
--   A → nom du produit (traduction française)
--   B → mots-clés et référence produit (SKU)
--   C → marque
--   D → description
--
-- Le vecteur est alimenté par trigger plutôt que par colonne générée : les données
-- proviennent de trois tables (products, product_translations, brands), ce qu'une
-- colonne `GENERATED ALWAYS AS` ne sait pas faire.

CREATE OR REPLACE FUNCTION beralshop_refresh_product_search(p_product_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products p
     SET "searchVector" = (
       SELECT
         setweight(to_tsvector('fr_unaccent', coalesce(pt.name, '')),        'A') ||
         setweight(to_tsvector('fr_unaccent', coalesce(pt.keywords, '')),    'B') ||
         setweight(to_tsvector('simple',      coalesce(p.sku, '')),          'B') ||
         setweight(to_tsvector('fr_unaccent', coalesce(b.name, '')),         'C') ||
         setweight(to_tsvector('fr_unaccent', coalesce(pt.description, '')), 'D')
       FROM products p2
       LEFT JOIN product_translations pt
         ON pt."productId" = p2.id AND pt.locale = 'fr'
       LEFT JOIN brands b
         ON b.id = p2."brandId"
       WHERE p2.id = p.id
     )
   WHERE p.id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION beralshop_trg_refresh_product_search()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_id text;
BEGIN
  -- ⚠️ Ces branches IF ne sont PAS un détail de style.
  --
  -- Une expression `CASE TG_TABLE_NAME WHEN 'products' THEN NEW.id
  --                 WHEN 'product_translations' THEN NEW."productId" END`
  -- constitue UNE SEULE instruction PL/pgSQL : PostgreSQL y résout tous les champs
  -- référencés, y compris ceux de la branche non empruntée. Un INSERT dans `products`
  -- échoue alors avec « record "new" has no field "productId" » (SQLSTATE 42703),
  -- ce qui rend toute création de produit impossible.
  --
  -- Les instructions PL/pgSQL étant préparées paresseusement, une par une, seule la
  -- branche réellement exécutée est compilée. D'où cette forme, plus verbeuse mais
  -- correcte. Ne pas « simplifier » en CASE.
  IF TG_TABLE_NAME = 'products' THEN
    IF TG_OP = 'DELETE' THEN
      target_id := OLD.id;
    ELSE
      target_id := NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME = 'product_translations' THEN
    IF TG_OP = 'DELETE' THEN
      target_id := OLD."productId";
    ELSE
      target_id := NEW."productId";
    END IF;
  END IF;

  -- Le produit peut avoir été supprimé (suppression en cascade d'une traduction) :
  -- on ne recalcule que s'il existe encore.
  IF target_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM products WHERE id = target_id) THEN
    PERFORM beralshop_refresh_product_search(target_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_search ON products;
CREATE TRIGGER trg_products_search
AFTER INSERT OR UPDATE OF sku, "brandId" ON products
FOR EACH ROW EXECUTE FUNCTION beralshop_trg_refresh_product_search();

DROP TRIGGER IF EXISTS trg_product_translations_search ON product_translations;
CREATE TRIGGER trg_product_translations_search
AFTER INSERT OR UPDATE OR DELETE ON product_translations
FOR EACH ROW EXECUTE FUNCTION beralshop_trg_refresh_product_search();

-- Index principal de la recherche plein texte.
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON products USING GIN ("searchVector");

-- Repêchage sur faute de frappe, quand la recherche exacte ne donne aucun résultat.
CREATE INDEX IF NOT EXISTS idx_product_translations_name_trgm
  ON product_translations USING GIN (name gin_trgm_ops);

-- ──────────────────────── 4. Séquence des numéros de commande ────────────────────────
-- BRL-2026-000123. L'unicité vient de la base, pas d'un tirage aléatoire côté
-- application : deux commandes simultanées ne peuvent pas obtenir le même numéro.

CREATE SEQUENCE IF NOT EXISTS beralshop_order_number_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION beralshop_next_order_number()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'BRL-'
      || to_char(now() AT TIME ZONE 'UTC', 'YYYY')
      || '-'
      || lpad(nextval('beralshop_order_number_seq')::text, 6, '0');
$$;

-- ───────────────────── 5. Garde-fous d'intégrité (défense en profondeur) ─────────────────────
-- Ces contraintes doublent les vérifications applicatives. Un bug dans le code ne doit
-- jamais pouvoir produire un stock négatif ou un prix négatif en base.

ALTER TABLE product_variants
  DROP CONSTRAINT IF EXISTS chk_variant_stock_non_negative;
ALTER TABLE product_variants
  ADD CONSTRAINT chk_variant_stock_non_negative
  CHECK ("stockQuantity" >= 0 AND "reservedQuantity" >= 0);

-- On ne peut pas réserver plus que le stock physique disponible.
ALTER TABLE product_variants
  DROP CONSTRAINT IF EXISTS chk_variant_reserved_within_stock;
ALTER TABLE product_variants
  ADD CONSTRAINT chk_variant_reserved_within_stock
  CHECK ("reservedQuantity" <= "stockQuantity");

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS chk_product_price_non_negative;
ALTER TABLE products
  ADD CONSTRAINT chk_product_price_non_negative
  CHECK ("basePriceMinor" >= 0);

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS chk_order_totals_non_negative;
ALTER TABLE orders
  ADD CONSTRAINT chk_order_totals_non_negative
  CHECK ("subtotalMinor" >= 0 AND "shippingMinor" >= 0 AND "totalMinor" >= 0);

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS chk_order_item_quantity_positive;
ALTER TABLE order_items
  ADD CONSTRAINT chk_order_item_quantity_positive
  CHECK (quantity > 0);

ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS chk_cart_item_quantity_positive;
ALTER TABLE cart_items
  ADD CONSTRAINT chk_cart_item_quantity_positive
  CHECK (quantity > 0);

ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS chk_review_rating_range;
ALTER TABLE reviews
  ADD CONSTRAINT chk_review_rating_range
  CHECK (rating BETWEEN 1 AND 5);
