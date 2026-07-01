
-- Enforce safe defaults on customer-created orders
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
    is_staff := private.has_role(auth.uid(), 'admin')
             OR private.has_role(auth.uid(), 'staff');
  END IF;

  IF NOT is_staff THEN
    -- Force server-controlled fields to safe initial values
    NEW.status := 'pending';
    NEW.payment_status := 'pending';
    NEW.subtotal_npr := 0;
    NEW.discount_npr := 0;
    NEW.shipping_npr := COALESCE(NEW.shipping_npr, 0);
    NEW.tax_npr := COALESCE(NEW.tax_npr, 0);
    NEW.total_npr := 0;
    NEW.confirmed_at := NULL;
    NEW.shipped_at := NULL;
    NEW.delivered_at := NULL;
    NEW.cancelled_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_customer_order_insert_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_customer_order_insert_guard ON public.orders;
CREATE TRIGGER enforce_customer_order_insert_guard
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_order_insert_guard();
