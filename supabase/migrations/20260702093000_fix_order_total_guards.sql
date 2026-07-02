-- The previous customer insert guard forced customer-created order totals to 0.
-- Keep server-controlled status defaults, but preserve validated monetary values
-- supplied by checkout and let order_items triggers recalculate after item insert.

CREATE OR REPLACE FUNCTION public.enforce_customer_order_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_staff boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    is_staff := private.has_role(auth.uid(), 'admin'::public.app_role)
             OR private.has_role(auth.uid(), 'manager'::public.app_role)
             OR private.has_role(auth.uid(), 'staff'::public.app_role);
  END IF;

  IF NOT is_staff THEN
    NEW.status := 'pending';
    NEW.payment_status := 'pending';
    NEW.discount_npr := COALESCE(NEW.discount_npr, 0);
    NEW.shipping_npr := COALESCE(NEW.shipping_npr, 0);
    NEW.tax_npr := COALESCE(NEW.tax_npr, 0);
    NEW.subtotal_npr := GREATEST(COALESCE(NEW.subtotal_npr, 0), 0);
    NEW.total_npr := GREATEST(
      COALESCE(NEW.total_npr, NEW.subtotal_npr + NEW.shipping_npr + NEW.tax_npr - NEW.discount_npr),
      0
    );
    NEW.confirmed_at := NULL;
    NEW.shipped_at := NULL;
    NEW.delivered_at := NULL;
    NEW.cancelled_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_customer_order_insert_guard() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.normalize_order_item_amounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_price numeric(12,2);
BEGIN
  SELECT price_npr INTO product_price
  FROM public.products
  WHERE id = NEW.product_id;

  IF product_price IS NOT NULL AND COALESCE(NEW.unit_price_npr, 0) <= 0 THEN
    NEW.unit_price_npr := product_price;
  END IF;

  NEW.line_total_npr := NEW.unit_price_npr * NEW.quantity;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_order_item_amounts ON public.order_items;
CREATE TRIGGER normalize_order_item_amounts
BEFORE INSERT OR UPDATE OF product_id, unit_price_npr, quantity ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.normalize_order_item_amounts();

CREATE OR REPLACE FUNCTION public.recalculate_order_totals_from_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order_id uuid;
  item_subtotal numeric(12,2);
BEGIN
  target_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(SUM(line_total_npr), 0)
  INTO item_subtotal
  FROM public.order_items
  WHERE order_id = target_order_id;

  UPDATE public.orders
  SET
    subtotal_npr = item_subtotal,
    shipping_npr = CASE
      WHEN item_subtotal = 0 THEN 0
      WHEN item_subtotal >= 5000 THEN 0
      WHEN shipping_npr > 0 THEN shipping_npr
      ELSE 150
    END,
    total_npr = item_subtotal
      + CASE
        WHEN item_subtotal = 0 THEN 0
        WHEN item_subtotal >= 5000 THEN 0
        WHEN shipping_npr > 0 THEN shipping_npr
        ELSE 150
      END
      + tax_npr
      - discount_npr
  WHERE id = target_order_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recalculate_order_totals_from_items ON public.order_items;
CREATE TRIGGER recalculate_order_totals_from_items
AFTER INSERT OR UPDATE OF line_total_npr, quantity OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_totals_from_items();

-- Repair any existing zero totals after installing the corrected guards.
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
    WHEN item_totals.subtotal_npr = 0 THEN 0
    WHEN item_totals.subtotal_npr >= 5000 THEN 0
    WHEN o.shipping_npr > 0 THEN o.shipping_npr
    ELSE 150
  END,
  total_npr = item_totals.subtotal_npr
    + CASE
      WHEN item_totals.subtotal_npr = 0 THEN 0
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
