
-- =========================================================
-- 1) Move has_role to a non-exposed schema
-- =========================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

-- Recreate RLS policies to reference private.has_role
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Managers manage categories" ON public.categories;
CREATE POLICY "Managers manage categories" ON public.categories FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Public read active categories" ON public.categories;
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT TO anon, authenticated
  USING ((is_active = true) OR private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Staff read all profiles" ON public.profiles;
CREATE POLICY "Staff read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Managers manage brands" ON public.brands;
CREATE POLICY "Managers manage brands" ON public.brands FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Public read active brands" ON public.brands;
CREATE POLICY "Public read active brands" ON public.brands FOR SELECT TO anon, authenticated
  USING ((is_active = true) OR private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Managers manage products" ON public.products;
CREATE POLICY "Managers manage products" ON public.products FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products FOR SELECT TO anon, authenticated
  USING ((status = 'active'::product_status) OR private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Managers manage product images" ON public.product_images;
CREATE POLICY "Managers manage product images" ON public.product_images FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Staff read all addresses" ON public.addresses;
CREATE POLICY "Staff read all addresses" ON public.addresses FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Staff read all orders" ON public.orders;
CREATE POLICY "Staff read all orders" ON public.orders FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Staff insert order history" ON public.order_status_history;
CREATE POLICY "Staff insert order history" ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Staff read all order history" ON public.order_status_history;
CREATE POLICY "Staff read all order history" ON public.order_status_history FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Staff read all order items" ON public.order_items;
CREATE POLICY "Staff read all order items" ON public.order_items FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'manager'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

-- Drop the public-exposed version
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Lock down other SECURITY DEFINER functions in public from public callers
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_order_status_change() FROM PUBLIC, anon, authenticated;

-- =========================================================
-- 2) Hide products.cost_price_npr from anon & authenticated
--    (staff/admin access via server-side service-role client)
-- =========================================================
REVOKE SELECT ON public.products FROM anon, authenticated;

GRANT SELECT (
  id, name, slug, sku, brand_id, category_id, description, short_description,
  price_npr, compare_at_price_npr, stock_quantity, low_stock_threshold,
  weight_grams, is_featured, is_trending, is_new_arrival, is_best_seller,
  is_flash_sale, flash_sale_ends_at, tags, meta_title, meta_description,
  status, created_at, updated_at
) ON public.products TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- =========================================================
-- 3) Hide orders.internal_note from customers
--    (staff/admin access via server-side service-role client)
-- =========================================================
REVOKE SELECT ON public.orders FROM anon, authenticated;

GRANT SELECT (
  id, order_number, user_id, guest_email, guest_phone,
  status, payment_status, payment_method, currency,
  subtotal_npr, discount_npr, shipping_npr, tax_npr, total_npr,
  coupon_code, customer_note, shipping_address, billing_address,
  confirmed_at, shipped_at, delivered_at, cancelled_at,
  created_at, updated_at
) ON public.orders TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.orders TO authenticated;
