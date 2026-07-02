GRANT DELETE ON public.orders TO authenticated;

DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
CREATE POLICY "Admins delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.delete_order_as_admin(_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_id uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can delete orders'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.orders
  WHERE id = _order_id
  RETURNING id INTO deleted_id;

  IF deleted_id IS NULL THEN
    RAISE EXCEPTION 'Order was not found or could not be deleted'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN deleted_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_order_as_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_order_as_admin(uuid) TO authenticated;
