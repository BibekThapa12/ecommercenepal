
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

INSERT INTO public.categories (name, slug, description, display_order, is_active)
VALUES
  ('Electronics', 'electronics', 'Gadgets, audio and smart devices', 1, true),
  ('Clothing', 'clothing', 'Apparel, outerwear and knits', 2, true),
  ('Accessories', 'accessories', 'Bags, wallets, jewellery and small goods', 3, true),
  ('Home & Living', 'home-living', 'Decor, kitchen and lifestyle pieces', 4, true),
  ('Beauty & Wellness', 'beauty-wellness', 'Personal care and wellness essentials', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- Map demo products to categories
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug='clothing')
  WHERE slug IN ('himalayan-wool-shawl','mountain-windbreaker','yak-wool-beanie');

UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug='accessories')
  WHERE slug IN ('singha-leather-wallet','suna-gold-earrings','annapurna-trek-backpack','hemp-tote-bag');

UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug='home-living')
  WHERE slug IN ('bhaktapur-ceramic-mug','thangka-wall-art','lokta-paper-journal','singing-bowl-medium');

UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug='beauty-wellness')
  WHERE slug IN ('kathmandu-coffee-beans');
