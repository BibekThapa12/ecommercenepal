# Phase 2 — Storefront Integration & Production Depth

Phase 1 shipped admin CRUD for 13 modules. Phase 2 connects those modules to the customer-facing storefront and adds the production-grade depth (PDFs, emails, analytics, automation) that was deferred.

## Goals

1. Every admin module that has a customer-facing counterpart is wired end-to-end.
2. Key financial/ops modules (Coupons, Invoices, Inventory, Reviews) are production-ready.
3. Analytics dashboard shows real charts, not placeholders.
4. Automated background jobs handle abandoned carts, reservations expiry, and low-stock alerts.

## Scope (grouped by track)

### Track A — Storefront wiring (highest user impact)
- **Coupons at checkout**: coupon input on `/checkout`, server fn `applyCoupon` validates code/min-spend/expiry/usage limits, records `coupon_redemptions`, updates `orders.discount_npr`.
- **Product Reviews on PDP**: review list + star summary on `/products/$slug`; "Write a review" form gated to users who purchased (check `order_items`); admin approval flow already exists.
- **Customer Inquiries form**: contact form on a new `/contact` route + "Ask a question" on PDP → inserts `customer_inquiries`; user-side inbox at `/account/inquiries` with `inquiry_messages` thread.
- **Store Settings consumed**: header/footer/site title/currency/shipping-threshold read from `store_settings` singleton instead of hardcoded values.
- **Brands on storefront**: brand filter on `/products`, brand landing at `/brands/$slug`.

### Track B — Financial & inventory depth
- **Invoices**: generate PDF invoice per paid order (server fn using `pdf-lib`), downloadable from `/account/orders/$orderId` and admin `/admin/invoices`. Auto-create on `payment_status = 'paid'`.
- **Inventory adjustments**: writing an adjustment updates `products.stock_quantity` / `product_variants.stock_quantity` atomically via SQL function; low-stock threshold from `store_settings` triggers a `system_logs` entry.
- **Reservations**: 15-min cart reservation when a variant is added; expiry job releases stock; checkout consumes reservation.
- **Payments**: mark-as-paid / refund actions write `system_logs` and, for refunds, flip `orders.status = 'refunded'`.

### Track C — Analytics & automation
- **Analytics dashboard**: revenue-over-time, orders-by-status, top products, top customers, coupon usage — Recharts, date-range picker, driven by SQL views.
- **Abandoned cart recovery**: cron server route at `/api/public/cron/abandoned-carts` (called by pg_cron) that logs candidates; optional email via Lovable AI-generated copy (behind a `store_settings` toggle, off by default).
- **System logs**: emit structured entries from all admin mutations (order status change, payment update, inventory adjust, coupon create, refund).

## Technical Details

- **New tables**: `invoices` (order_id, number, pdf_url, issued_at, totals snapshot), `stock_movements` (source: order/adjustment/reservation, delta, ref_id) — both with GRANT + RLS + admin/service-role policies. Extend `store_settings` with `low_stock_threshold`, `reservation_minutes`, `abandoned_cart_hours`, `enable_recovery_emails`.
- **SQL functions**: `apply_coupon(_code, _user_id, _subtotal)` returning discount + validation; `adjust_stock(_product_id, _variant_id, _delta, _reason)` SECURITY DEFINER; `expire_reservations()` for cron.
- **Server functions** (in `src/lib/*.functions.ts`): `applyCoupon`, `submitReview`, `submitInquiry`, `generateInvoicePdf`, `adjustInventory`, `refundOrder`, `getAnalytics`.
- **Server routes** (public, signature-verified): `/api/public/cron/abandoned-carts`, `/api/public/cron/expire-reservations`.
- **PDF generation**: `pdf-lib` (Worker-compatible), rendered server-side, stored in a new `invoices` Supabase Storage bucket with signed URLs.
- **Charts**: `recharts` (already common in shadcn projects — add if missing).
- **Cron**: pg_cron schedules calling the public API routes with a shared `CRON_SECRET`.

## Out of Scope (defer to Phase 3)
- Multi-currency, tax engine, shipping-zone matrix.
- Payment gateway integrations (eSewa/Khalti/FonePay live).
- Multi-warehouse, purchase orders, supplier management.
- Email deliverability (custom domain, DKIM) — Phase 2 uses the default sender.

## Execution Order
1. Migration: new tables, columns, SQL functions, RLS + GRANTs.
2. Track A (storefront wiring) — biggest visible impact.
3. Track B (invoices, inventory, reservations, refunds).
4. Track C (analytics charts + cron jobs).
5. Smoke test end-to-end: add to cart → reserve → apply coupon → checkout → invoice PDF → admin refund → logs updated.

## Risks
- PDF generation in Worker runtime — `pdf-lib` is pure JS, confirmed safe; no `sharp`/`puppeteer`.
- pg_cron requires the extension enabled — will enable in the same migration.
- Review "verified purchase" check needs an index on `order_items(product_id, order_id)` for perf.

Approve to begin with the migration, then execute tracks A → B → C in order.