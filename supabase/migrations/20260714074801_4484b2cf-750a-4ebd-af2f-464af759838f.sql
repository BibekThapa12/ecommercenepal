
-- Draft orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_orders_is_draft ON public.orders(is_draft) WHERE is_draft = true;

-- =========================================================
-- COUPONS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('fixed','percentage')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value >= 0),
  min_order_npr numeric(12,2) NOT NULL DEFAULT 0,
  max_discount_npr numeric(12,2),
  usage_limit integer,
  per_user_limit integer DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT TO anon, authenticated
  USING (is_active = true OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Staff manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role));
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_applied_npr numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_redemptions_coupon ON public.coupon_redemptions(coupon_id);
GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role) OR private.has_role(auth.uid(),'staff'::app_role));
CREATE POLICY "Users insert own redemption" ON public.coupon_redemptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =========================================================
-- PRODUCT REVIEWS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','hidden')),
  admin_reply text,
  admin_replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.product_reviews(user_id);
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved reviews" ON public.product_reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role) OR private.has_role(auth.uid(),'staff'::app_role));
CREATE POLICY "Users create own reviews" ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own pending reviews" ON public.product_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Staff delete reviews" ON public.product_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role));
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- RESERVATIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','expired','released','cancelled')),
  expires_at timestamptz NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reservations" ON public.reservations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role) OR private.has_role(auth.uid(),'staff'::app_role));
CREATE POLICY "Users create own reservations" ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own reservations" ON public.reservations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Staff delete reservations" ON public.reservations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role));
CREATE TRIGGER trg_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- CUSTOMER INQUIRIES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.customer_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE DEFAULT ('INQ-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email text,
  guest_name text,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','product','order','payment','delivery','return')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.customer_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_user ON public.customer_inquiries(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_inquiries TO authenticated;
GRANT ALL ON public.customer_inquiries TO service_role;
ALTER TABLE public.customer_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own inquiries" ON public.customer_inquiries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role) OR private.has_role(auth.uid(),'staff'::app_role));
CREATE POLICY "Users create inquiries" ON public.customer_inquiries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users update own inquiries" ON public.customer_inquiries FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role) OR private.has_role(auth.uid(),'staff'::app_role))
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role) OR private.has_role(auth.uid(),'staff'::app_role));
CREATE POLICY "Staff delete inquiries" ON public.customer_inquiries FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role));
CREATE TRIGGER trg_inquiries_updated_at BEFORE UPDATE ON public.customer_inquiries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.customer_inquiries(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  is_internal_note boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry ON public.inquiry_messages(inquiry_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inquiry_messages TO authenticated;
GRANT ALL ON public.inquiry_messages TO service_role;
ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read inquiry messages" ON public.inquiry_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.customer_inquiries i WHERE i.id = inquiry_id AND (i.user_id = auth.uid() AND is_internal_note = false))
    OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role) OR private.has_role(auth.uid(),'staff'::app_role)
  );
CREATE POLICY "Post inquiry messages" ON public.inquiry_messages FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.customer_inquiries i WHERE i.id = inquiry_id AND i.user_id = auth.uid() AND is_internal_note = false)
      OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role) OR private.has_role(auth.uid(),'staff'::app_role)
    )
  );

-- =========================================================
-- STORE SETTINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update settings" ON public.store_settings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
INSERT INTO public.store_settings (singleton, settings) VALUES (true, '{"store_name":"Reactify Commerce","currency":"NPR","tax_rate":0,"free_shipping_threshold":5000,"default_shipping":150}'::jsonb) ON CONFLICT DO NOTHING;

-- =========================================================
-- SYSTEM LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','error','critical')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_entity ON public.system_logs(entity_type, entity_id);
GRANT SELECT, INSERT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read logs" ON public.system_logs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role));
CREATE POLICY "Staff insert logs" ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- =========================================================
-- INVENTORY ADJUSTMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  notes text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_adj_product ON public.inventory_adjustments(product_id);
GRANT SELECT, INSERT ON public.inventory_adjustments TO authenticated;
GRANT ALL ON public.inventory_adjustments TO service_role;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read inventory adjustments" ON public.inventory_adjustments FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role) OR private.has_role(auth.uid(),'staff'::app_role));
CREATE POLICY "Staff insert inventory adjustments" ON public.inventory_adjustments FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'manager'::app_role) OR private.has_role(auth.uid(),'staff'::app_role));
