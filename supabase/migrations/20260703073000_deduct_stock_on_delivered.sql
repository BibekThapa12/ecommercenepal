-- Deduct inventory exactly once when an order is marked delivered.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_deducted_at timestamptz;

CREATE OR REPLACE FUNCTION public.deduct_order_stock_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item record;
BEGIN
  IF NEW.status = 'delivered'
    AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.inventory_deducted_at IS NULL
  THEN
    FOR item IN
      SELECT product_id, variant_id, quantity
      FROM public.order_items
      WHERE order_id = NEW.id
    LOOP
      IF item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock_quantity = GREATEST(stock_quantity - item.quantity, 0)
        WHERE id = item.variant_id;
      END IF;

      IF item.product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = GREATEST(stock_quantity - item.quantity, 0)
        WHERE id = item.product_id;
      END IF;
    END LOOP;

    NEW.inventory_deducted_at := now();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deduct_order_stock_on_delivery() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_orders_deduct_stock_on_delivery ON public.orders;
CREATE TRIGGER trg_orders_deduct_stock_on_delivery
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.deduct_order_stock_on_delivery();
