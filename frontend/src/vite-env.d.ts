/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of product-service (MongoDB catalog). */
  readonly VITE_PRODUCT_SERVICE_URL?: string
  /** Base URL of order-service (PostgreSQL order lifecycle). */
  readonly VITE_ORDER_SERVICE_URL?: string
  /** Base URL of payment-service (payment simulation). */
  readonly VITE_PAYMENT_SERVICE_URL?: string
  /** Base URL of user-service (JWT auth, accounts). */
  readonly VITE_USER_SERVICE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
