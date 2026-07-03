import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ProductLite = {
  id: string;
  name: string;
  slug: string;
  price_npr: number;
  compare_at_price_npr: number | null;
  stock_quantity: number;
  product_images: { url: string; alt_text: string | null; is_primary: boolean }[];
};

export type CartRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  selected_options: Record<string, string>;
  quantity: number;
  product: ProductLite | null;
  variant: {
    id: string;
    sku: string | null;
    price_npr: number | null;
    compare_at_price_npr: number | null;
    stock_quantity: number;
    options: Record<string, string>;
    product_images: { url: string; alt_text: string | null; is_primary: boolean }[];
  } | null;
};

export type WishlistRow = {
  id: string;
  product_id: string;
  product: ProductLite | null;
};

const PRODUCT_SELECT =
  "id, name, slug, price_npr, compare_at_price_npr, stock_quantity, product_images(url, alt_text, is_primary)";
const VARIANT_SELECT =
  "id, sku, price_npr, compare_at_price_npr, stock_quantity, options, product_images(url, alt_text, is_primary)";


export function useCart() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CartRow[]> => {
      const { data, error } = await supabase
        .from("cart_items")
        .select(
          `id, product_id, variant_id, selected_options, quantity, product:products(${PRODUCT_SELECT}), variant:product_variants(${VARIANT_SELECT})`,
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CartRow[];
    },
  });

  const add = useMutation({
    mutationFn: async (vars: {
      productId: string;
      variantId?: string | null;
      selectedOptions?: Record<string, string>;
      quantity?: number;
    }) => {
      if (!user) throw new Error("Sign in required");
      const qty = vars.quantity ?? 1;
      const variantId = vars.variantId ?? null;
      const opts = vars.selectedOptions ?? {};
      let existingQ = supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", vars.productId);
      existingQ = variantId
        ? existingQ.eq("variant_id", variantId)
        : existingQ.is("variant_id", null);
      const { data: existing } = await existingQ.maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: Math.min(99, existing.quantity + qty) })
          .eq("id", existing.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items").insert({
          user_id: user.id,
          product_id: vars.productId,
          variant_id: variantId,
          selected_options: opts,
          quantity: qty,
        });
        if (error) throw error;
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setQty = useMutation({
    mutationFn: async (vars: { id: string; quantity: number }) => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: Math.max(1, Math.min(99, vars.quantity)) })
        .eq("id", vars.id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Removed from cart");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const items = query.data ?? [];
  const subtotal = items.reduce((s, i) => s + (i.product?.price_npr ?? 0) * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, subtotal, count, isLoading: query.isLoading, add, setQty, remove, clear };
}

export function useWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WishlistRow[]> => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select(`id, product_id, product:products(${PRODUCT_SELECT})`)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WishlistRow[];
    },
  });

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Sign in required");
      const { data: existing } = await supabase
        .from("wishlist_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("wishlist_items")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", user.id);
        if (error) throw error;
        return { removed: true };
      }
      const { error } = await supabase
        .from("wishlist_items")
        .insert({ user_id: user.id, product_id: productId });
      if (error) throw error;
      return { removed: false };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(res.removed ? "Removed from wishlist" : "Saved to wishlist");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const items = query.data ?? [];
  const ids = new Set(items.map((i) => i.product_id));

  return { items, ids, isLoading: query.isLoading, toggle, remove };
}
