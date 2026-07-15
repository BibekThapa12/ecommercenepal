
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
    INSERT INTO public.system_logs (severity, action, entity_type, entity_id, metadata, actor_id)
      VALUES ('warn','low_stock','product', _product_id,
              jsonb_build_object('stock',new_qty,'threshold',threshold), auth.uid());
  END IF;

  RETURN jsonb_build_object('ok',true,'new_stock',new_qty);
END; $$;
