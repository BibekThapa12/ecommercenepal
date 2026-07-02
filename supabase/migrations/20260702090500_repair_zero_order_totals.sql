-- Repair previously placed orders that were saved with zero totals because the
-- checkout used a stale/missing client cart product snapshot.

UPDATE public.order_items oi
SET
  unit_price_npr = p.price_npr,
  line_total_npr = p.price_npr * oi.quantity
FROM public.products p
WHERE oi.product_id = p.id
  AND (oi.unit_price_npr = 0 OR oi.line_total_npr = 0);

WITH item_totals AS (
  SELECT
    order_id,
    SUM(line_total_npr) AS subtotal_npr
  FROM public.order_items
  GROUP BY order_id
)
UPDATE public.orders o
SET
  subtotal_npr = item_totals.subtotal_npr,
  shipping_npr = CASE
    WHEN item_totals.subtotal_npr >= 5000 THEN 0
    WHEN o.shipping_npr > 0 THEN o.shipping_npr
    ELSE 150
  END,
  total_npr = item_totals.subtotal_npr
    + CASE
      WHEN item_totals.subtotal_npr >= 5000 THEN 0
      WHEN o.shipping_npr > 0 THEN o.shipping_npr
      ELSE 150
    END
    + o.tax_npr
    - o.discount_npr
FROM item_totals
WHERE o.id = item_totals.order_id
  AND (o.subtotal_npr = 0 OR o.total_npr = 0)
  AND item_totals.subtotal_npr > 0;
