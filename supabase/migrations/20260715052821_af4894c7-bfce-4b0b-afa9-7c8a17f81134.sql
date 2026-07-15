
-- ============================================================
-- Phase 2 — Storefront wiring & production depth
-- ============================================================

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------- Invoices ----------
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  subtotal_npr numeric(12,2) NOT NULL DEFAULT 0,
  discount_npr numeric(12,2) NOT NULL DEFAULT 0,
  shipping_npr numeric(12,2) NOT NULL DEFAULT 0,
  tax_npr numeric(12,2) NOT NULL DEFAULT 0,
  total_npr numeric(12,2) NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_owner_read" ON public.invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "invoices_admin_all" ON public.invoices FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'manager'::public.app_role) OR private.has_role(auth.uid(),'staff'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'manager'::public.app_role) OR private.has_role(auth.uid(),'staff'::public.app_role));
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Stock movements ----------
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  delta integer NOT NULL,
  source text NOT NULL CHECK (source IN ('order','adjustment','reservation','refund','manual')),
  ref_id uuid,
  notes text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_admin_all" ON public.stock_movements FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'manager'::public.app_role) OR private.has_role(auth.uid(),'staff'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'manager'::public.app_role) OR private.has_role(auth.uid(),'staff'::public.app_role));
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status ON public.product_reviews(product_id, status);

-- ---------- Coupon apply function ----------
CREATE OR REPLACE FUNCTION public.apply_coupon(_code text, _user_id uuid, _subtotal numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.coupons%ROWTYPE;
  discount numeric(12,2) := 0;
  user_uses integer := 0;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE lower(code) = lower(_code) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Coupon not found'); END IF;
  IF NOT c.is_active THEN RETURN jsonb_build_object('ok',false,'error','Coupon is inactive'); END IF;
  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN RETURN jsonb_build_object('ok',false,'error','Coupon not yet active'); END IF;
  IF c.ends_at IS NOT NULL AND c.ends_at < now() THEN RETURN jsonb_build_object('ok',false,'error','Coupon expired'); END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN RETURN jsonb_build_object('ok',false,'error','Coupon usage limit reached'); END IF;
  IF c.min_order_npr IS NOT NULL AND _subtotal < c.min_order_npr THEN
    RETURN jsonb_build_object('ok',false,'error', 'Minimum order NPR ' || c.min_order_npr::text || ' required');
  END IF;
  IF _user_id IS NOT NULL AND c.per_user_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO user_uses FROM public.coupon_redemptions WHERE coupon_id = c.id AND user_id = _user_id;
    IF user_uses >= c.per_user_limit THEN RETURN jsonb_build_object('ok',false,'error','Per-user usage limit reached'); END IF;
  END IF;
  IF c.discount_type = 'percentage' THEN
    discount := round(_subtotal * c.discount_value / 100, 2);
  ELSE
    discount := c.discount_value;
  END IF;
  IF c.max_discount_npr IS NOT NULL AND discount > c.max_discount_npr THEN discount := c.max_discount_npr; END IF;
  IF discount > _subtotal THEN discount := _subtotal; END IF;
  RETURN jsonb_build_object('ok',true,'coupon_id',c.id,'code',c.code,'discount_npr',discount,'discount_type',c.discount_type,'discount_value',c.discount_value);
END; $$;
GRANT EXECUTE ON FUNCTION public.apply_coupon(text,uuid,numeric) TO authenticated, anon;

-- ---------- Stock adjust function ----------
CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _variant_id uuid, _delta integer, _reason text, _notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_qty integer;
  threshold integer;
BEGIN
  IF NOT (private.has_role(auth.uid(),'admin'::public.app_role)
       OR private.has_role(auth.uid(),'manager'::public.app_role)
       OR private.has_role(auth.uid(),'staff'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _variant_id IS NOT NULL THEN
    UPDATE public.product_variants SET stock_quantity = GREATEST(stock_quantity + _delta, 0)
      WHERE id = _variant_id RETURNING stock_quantity INTO new_qty;
  ELSE
    UPDATE public.products SET stock_quantity = GREATEST(stock_quantity + _delta, 0)
      WHERE id = _product_id RETURNING stock_quantity, low_stock_threshold INTO new_qty, threshold;
  END IF;

  INSERT INTO public.stock_movements (product_id, variant_id, delta, source, notes, actor_id)
    VALUES (_product_id, _variant_id, _delta, 'adjustment', _notes, auth.uid());
  INSERT INTO public.inventory_adjustments (product_id, variant_id, delta, reason, notes, actor_id)
    VALUES (_product_id, _variant_id, _delta, COALESCE(_reason,'manual'), _notes, auth.uid());

  IF threshold IS NOT NULL AND new_qty <= threshold THEN
    INSERT INTO public.system_logs (level, source, message, metadata, actor_id)
      VALUES ('warn','inventory','Low stock', jsonb_build_object('product_id',_product_id,'stock',new_qty,'threshold',threshold), auth.uid());
  END IF;

  RETURN jsonb_build_object('ok',true,'new_stock',new_qty);
END; $$;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid,uuid,integer,text,text) TO authenticated;

-- ---------- Expire reservations ----------
CREATE OR REPLACE FUNCTION public.expire_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE freed integer := 0;
BEGIN
  UPDATE public.reservations SET status = 'expired'
    WHERE status = 'active' AND expires_at < now();
  GET DIAGNOSTICS freed = ROW_COUNT;
  RETURN freed;
END; $$;
GRANT EXECUTE ON FUNCTION public.expire_reservations() TO service_role;

-- ---------- Seed default store_settings keys ----------
UPDATE public.store_settings SET settings = COALESCE(settings,'{}'::jsonb)
  || jsonb_build_object(
       'low_stock_threshold', COALESCE(settings->'low_stock_threshold', to_jsonb(5)),
       'reservation_minutes', COALESCE(settings->'reservation_minutes', to_jsonb(15)),
       'abandoned_cart_hours', COALESCE(settings->'abandoned_cart_hours', to_jsonb(1)),
       'free_shipping_threshold_npr', COALESCE(settings->'free_shipping_threshold_npr', to_jsonb(5000)),
       'default_shipping_npr', COALESCE(settings->'default_shipping_npr', to_jsonb(150)),
       'site_title', COALESCE(settings->'site_title', to_jsonb('Reactify Commerce'::text)),
       'currency', COALESCE(settings->'currency', to_jsonb('NPR'::text))
     )
  WHERE singleton = true;
