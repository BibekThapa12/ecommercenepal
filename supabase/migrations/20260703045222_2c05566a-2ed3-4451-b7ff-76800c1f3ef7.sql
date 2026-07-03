
-- 1) product_variants
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text,
  options jsonb NOT NULL DEFAULT '{}'::jsonb, -- {"color":"Black","size":"XL",...}
  price_npr numeric(12,2),                    -- override; null = use product.price
  compare_at_price_npr numeric(12,2),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_variants_product_id_idx ON public.product_variants(product_id);
CREATE UNIQUE INDEX product_variants_product_options_uniq ON public.product_variants(product_id, options);

GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view variants of active products"
  ON public.product_variants FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active'));

CREATE POLICY "Staff manage variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (
    private.has_role(auth.uid(),'admin'::public.app_role)
    OR private.has_role(auth.uid(),'manager'::public.app_role)
    OR private.has_role(auth.uid(),'staff'::public.app_role)
  )
  WITH CHECK (
    private.has_role(auth.uid(),'admin'::public.app_role)
    OR private.has_role(auth.uid(),'manager'::public.app_role)
    OR private.has_role(auth.uid(),'staff'::public.app_role)
  );

CREATE TRIGGER set_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) product_images: attach optional variant_id for variant-specific galleries
ALTER TABLE public.product_images
  ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE;
CREATE INDEX product_images_variant_id_idx ON public.product_images(variant_id);

-- 3) cart_items: variant + selected options
ALTER TABLE public.cart_items
  ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  ADD COLUMN selected_options jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.cart_items DROP CONSTRAINT cart_items_user_id_product_id_key;
CREATE UNIQUE INDEX cart_items_user_product_variant_uniq
  ON public.cart_items(user_id, product_id, variant_id)
  NULLS NOT DISTINCT;

-- 4) order_items: snapshot variant + selection
ALTER TABLE public.order_items
  ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN selected_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN variant_label text;
