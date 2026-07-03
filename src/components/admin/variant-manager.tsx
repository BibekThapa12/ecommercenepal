import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNPR } from "@/lib/commerce";

type Variant = {
  id: string;
  product_id: string;
  sku: string | null;
  options: Record<string, string>;
  price_npr: number | null;
  compare_at_price_npr: number | null;
  stock_quantity: number;
  is_active: boolean;
  display_order: number;
  images?: { id: string; url: string; alt_text: string | null; is_primary: boolean }[];
};

type FormState = {
  id?: string;
  sku: string;
  options_text: string; // "color: Black, size: XL"
  price_npr: string;
  compare_at_price_npr: string;
  stock_quantity: string;
  is_active: boolean;
  image_urls: string; // newline separated
};

const empty: FormState = {
  sku: "",
  options_text: "",
  price_npr: "",
  compare_at_price_npr: "",
  stock_quantity: "0",
  is_active: true,
  image_urls: "",
};

function parseOptions(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(",")) {
    const [k, ...rest] = part.split(":");
    if (!k || !rest.length) continue;
    const key = k.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key && val) out[key] = val;
  }
  return out;
}

function stringifyOptions(o: Record<string, string>): string {
  return Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(", ");
}

export function VariantManagerDialog({
  productId,
  productName,
  open,
  onOpenChange,
}: {
  productId: string | null;
  productName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState(false);

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ["admin-variants", productId],
    enabled: !!productId && open,
    queryFn: async (): Promise<Variant[]> => {
      const { data, error } = await supabase
        .from("product_variants")
        .select(
          "id, product_id, sku, options, price_npr, compare_at_price_npr, stock_quantity, is_active, display_order, images:product_images(id, url, alt_text, is_primary)",
        )
        .eq("product_id", productId!)
        .order("display_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Variant[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      if (!productId) throw new Error("Missing product");
      const options = parseOptions(f.options_text);
      if (Object.keys(options).length === 0)
        throw new Error("Add at least one option like 'color: Black, size: XL'");
      const payload = {
        product_id: productId,
        sku: f.sku.trim() || null,
        options,
        price_npr: f.price_npr ? Number(f.price_npr) : null,
        compare_at_price_npr: f.compare_at_price_npr
          ? Number(f.compare_at_price_npr)
          : null,
        stock_quantity: Number(f.stock_quantity) || 0,
        is_active: f.is_active,
      };
      let variantId = f.id;
      if (f.id) {
        const { error } = await supabase
          .from("product_variants")
          .update(payload)
          .eq("id", f.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("product_variants")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        variantId = data.id;
      }

      // Replace variant images with the URLs listed in the form
      if (variantId) {
        await supabase.from("product_images").delete().eq("variant_id", variantId);
        const urls = f.image_urls
          .split(/\r?\n/)
          .map((u) => u.trim())
          .filter(Boolean);
        if (urls.length) {
          const rows = urls.map((url, i) => ({
            product_id: productId,
            variant_id: variantId!,
            url,
            alt_text: `${productName} ${stringifyOptions(options)}`,
            is_primary: i === 0,
            display_order: i,
          }));
          const { error } = await supabase.from("product_images").insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Variant saved");
      qc.invalidateQueries({ queryKey: ["admin-variants", productId] });
      qc.invalidateQueries({ queryKey: ["storefront-products"] });
      setForm(empty);
      setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Variant deleted");
      qc.invalidateQueries({ queryKey: ["admin-variants", productId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEdit(v: Variant) {
    setForm({
      id: v.id,
      sku: v.sku ?? "",
      options_text: stringifyOptions(v.options ?? {}),
      price_npr: v.price_npr != null ? String(v.price_npr) : "",
      compare_at_price_npr:
        v.compare_at_price_npr != null ? String(v.compare_at_price_npr) : "",
      stock_quantity: String(v.stock_quantity ?? 0),
      is_active: v.is_active,
      image_urls: (v.images ?? []).map((i) => i.url).join("\n"),
    });
    setEditing(true);
  }

  function openCreate() {
    setForm(empty);
    setEditing(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Variants · {productName}</DialogTitle>
        </DialogHeader>

        {!editing ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Add size / color / storage combinations. Each variant tracks its own
                stock, SKU, price and image gallery.
              </p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> New variant
              </Button>
            </div>
            <div className="rounded-xl border overflow-hidden max-h-[55vh] overflow-y-auto">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground">Loading…</div>
              ) : variants.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No variants yet. Add one to enable size/color selection on the product page.
                </div>
              ) : (
                variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-3 border-b last:border-b-0"
                  >
                    <div className="h-12 w-12 rounded-md bg-muted overflow-hidden shrink-0">
                      {v.images?.[0]?.url && (
                        <img src={v.images[0].url} className="h-full w-full object-cover" alt="" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium capitalize">
                        {stringifyOptions(v.options ?? {}) || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {v.sku ?? "no SKU"} · stock {v.stock_quantity}
                        {v.price_npr != null && ` · ${formatNPR(Number(v.price_npr))}`}
                      </div>
                    </div>
                    <div className="flex gap-1 items-center">
                      {!v.is_active && <Badge variant="secondary">Inactive</Badge>}
                      {v.images && v.images.length > 0 && (
                        <Badge variant="outline">{v.images.length} img</Badge>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(v)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Delete this variant?")) del.mutate(v.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Options</Label>
              <Input
                value={form.options_text}
                onChange={(e) => setForm((f) => ({ ...f, options_text: e.target.value }))}
                placeholder="color: Black, size: XL"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated <span className="font-mono">key: value</span> pairs. Examples:
                <span className="font-mono"> color: Red, size: M</span>,
                <span className="font-mono"> storage: 256GB</span>,
                <span className="font-mono"> material: Cotton</span>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder="TSHIRT-BLK-XL"
                />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price override (NPR)</Label>
                <Input
                  type="number"
                  value={form.price_npr}
                  onChange={(e) => setForm((f) => ({ ...f, price_npr: e.target.value }))}
                  placeholder="Leave blank to use product price"
                />
              </div>
              <div className="space-y-2">
                <Label>Compare at (NPR)</Label>
                <Input
                  type="number"
                  value={form.compare_at_price_npr}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, compare_at_price_npr: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Variant image URLs</Label>
              <Textarea
                rows={4}
                value={form.image_urls}
                onChange={(e) => setForm((f) => ({ ...f, image_urls: e.target.value }))}
                placeholder={"https://…/black-xl-1.jpg\nhttps://…/black-xl-2.jpg"}
              />
              <p className="text-xs text-muted-foreground">
                One URL per line. First image is the primary. Shown on the product page
                when this variant is selected.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label>Active — customers can select this variant</Label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(empty); }}>
                Cancel
              </Button>
              <Button
                onClick={() => save.mutate(form)}
                disabled={save.isPending || !form.options_text.trim()}
              >
                {save.isPending ? "Saving…" : "Save variant"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
