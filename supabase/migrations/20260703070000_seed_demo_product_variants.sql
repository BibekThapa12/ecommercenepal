-- Demo storefront variant data for products that do not yet have variants.
-- This gives the product detail page real size/color options and variant stock.

INSERT INTO public.product_variants (
  product_id,
  sku,
  options,
  price_npr,
  compare_at_price_npr,
  stock_quantity,
  is_active,
  display_order
)
SELECT
  p.id,
  upper(left(regexp_replace(coalesce(p.sku, p.slug), '[^a-zA-Z0-9]+', '-', 'g'), 40)) || '-BLK-M',
  jsonb_build_object('Color', 'Black', 'Size', 'M'),
  p.price_npr,
  p.compare_at_price_npr,
  8,
  true,
  1
FROM public.products p
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants existing WHERE existing.product_id = p.id
  )
ON CONFLICT (product_id, options) DO NOTHING;

INSERT INTO public.product_variants (
  product_id,
  sku,
  options,
  price_npr,
  compare_at_price_npr,
  stock_quantity,
  is_active,
  display_order
)
SELECT
  p.id,
  upper(left(regexp_replace(coalesce(p.sku, p.slug), '[^a-zA-Z0-9]+', '-', 'g'), 40)) || '-BLK-L',
  jsonb_build_object('Color', 'Black', 'Size', 'L'),
  p.price_npr + 150,
  p.compare_at_price_npr,
  5,
  true,
  2
FROM public.products p
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_variants existing
    WHERE existing.product_id = p.id
      AND existing.options = jsonb_build_object('Color', 'Black', 'Size', 'L')
  )
ON CONFLICT (product_id, options) DO NOTHING;

INSERT INTO public.product_variants (
  product_id,
  sku,
  options,
  price_npr,
  compare_at_price_npr,
  stock_quantity,
  is_active,
  display_order
)
SELECT
  p.id,
  upper(left(regexp_replace(coalesce(p.sku, p.slug), '[^a-zA-Z0-9]+', '-', 'g'), 40)) || '-SLT-M',
  jsonb_build_object('Color', 'Slate', 'Size', 'M'),
  p.price_npr,
  p.compare_at_price_npr,
  3,
  true,
  3
FROM public.products p
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_variants existing
    WHERE existing.product_id = p.id
      AND existing.options = jsonb_build_object('Color', 'Slate', 'Size', 'M')
  )
ON CONFLICT (product_id, options) DO NOTHING;

INSERT INTO public.product_variants (
  product_id,
  sku,
  options,
  price_npr,
  compare_at_price_npr,
  stock_quantity,
  is_active,
  display_order
)
SELECT
  p.id,
  upper(left(regexp_replace(coalesce(p.sku, p.slug), '[^a-zA-Z0-9]+', '-', 'g'), 40)) || '-WHT-S',
  jsonb_build_object('Color', 'White', 'Size', 'S'),
  p.price_npr - least(p.price_npr * 0.05, 250),
  p.compare_at_price_npr,
  0,
  true,
  4
FROM public.products p
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_variants existing
    WHERE existing.product_id = p.id
      AND existing.options = jsonb_build_object('Color', 'White', 'Size', 'S')
  )
ON CONFLICT (product_id, options) DO NOTHING;

WITH variant_stock AS (
  SELECT product_id, COALESCE(SUM(stock_quantity), 0)::int AS stock_quantity
  FROM public.product_variants
  WHERE is_active = true
  GROUP BY product_id
)
UPDATE public.products p
SET stock_quantity = GREATEST(p.stock_quantity, variant_stock.stock_quantity)
FROM variant_stock
WHERE p.id = variant_stock.product_id;

INSERT INTO public.product_images (product_id, url, alt_text, display_order, is_primary)
SELECT
  p.id,
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
  p.name,
  0,
  true
FROM public.products p
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id
  );

WITH primary_images AS (
  SELECT DISTINCT ON (product_id)
    product_id,
    url,
    alt_text
  FROM public.product_images
  WHERE variant_id IS NULL
  ORDER BY product_id, is_primary DESC, display_order ASC
)
INSERT INTO public.product_images (
  product_id,
  variant_id,
  url,
  alt_text,
  display_order,
  is_primary
)
SELECT
  v.product_id,
  v.id,
  pi.url,
  coalesce(pi.alt_text, p.name) || ' - ' || (v.options ->> 'Color'),
  20 + v.display_order,
  false
FROM public.product_variants v
JOIN public.products p ON p.id = v.product_id
JOIN primary_images pi ON pi.product_id = v.product_id
WHERE v.is_active = true
  AND v.options ? 'Color'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_images existing WHERE existing.variant_id = v.id
  );
