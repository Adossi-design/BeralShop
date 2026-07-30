export { prisma } from './client.ts';

/**
 * Types et énumérations générés par Prisma, réexportés pour que le reste du monorepo
 * n'importe jamais depuis `generated/` directement. Si le chemin de génération change
 * un jour, un seul fichier est à corriger.
 */
export type {
  Address,
  AdminAuditLog,
  Brand,
  Cart,
  CartItem,
  Category,
  CategoryTranslation,
  Country,
  Currency,
  FxRate,
  IdempotencyRecord,
  Notification,
  Order,
  OrderEvent,
  OrderItem,
  PasswordResetToken,
  Payment,
  PaymentEvent,
  Product,
  ProductImage,
  ProductTranslation,
  ProductVariant,
  Promotion,
  Refund,
  Review,
  ShippingRate,
  ShippingZone,
  Supplier,
  User,
  Vendor,
} from '../generated/prisma/client.ts';

export {
  ActorType,
  NotificationChannel,
  NotificationStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ProductStatus,
  PromotionType,
  RefundStatus,
  ReviewStatus,
  UserRole,
} from '../generated/prisma/client.ts';
