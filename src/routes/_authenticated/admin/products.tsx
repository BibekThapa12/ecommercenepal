import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VariantManagerDialog } from "@/components/admin/variant-manager";
import { formatNPR } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  price_npr: number;
  compare_at_price_npr: number | null;
  stock_quantity: number;
  status: string;
  is_flash_sale: boolean;
  category_id: string | null;
  image_url: string | null;
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  short_description: string;
  price_npr: number;
  compare_at_price_npr: number | null;
  stock_quantity: number;
  status: "active" | "draft";
  is_flash_sale: boolean;
  category_id: string | null;
  image_url: string;
};

const empty: FormState = {
  name: "",
  slug: "",
  short_description: "",
  price_npr: 0,
  compare_at_price_npr: null,
  stock_quantity: 0,
  status: "active",
  is_flash_sale: false,
  category_id: null,
  image_url: "",
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function AdminProducts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [filterCat, setFilterCat] = useState<string>("all");

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-lite"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, short_description, price_npr, compare_at_price_npr, stock_quantity, status, is_flash_sale, category_id, product_images(url, is_primary)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        image_url:
          p.product_images?.find((i: any) => i.is_primary)?.url ??
          p.product_images?.[0]?.url ??
          null,
      })) as Product[];
    },
  });

  const filtered = filterCat === "all" ? products : products.filter((p) => p.category_id === filterCat);

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        name: f.name,
        slug: f.slug || slugify(f.name),
        short_description: f.short_description || null,
        price_npr: f.price_npr,
        compare_at_price_npr: f.compare_at_price_npr,
        stock_quantity: f.stock_quantity,
        status: f.status,
        is_flash_sale: f.is_flash_sale,
        category_id: f.category_id,
      };
      let productId = f.id;
      if (f.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }
      if (f.image_url && productId) {
        // Replace primary image
        await supabase.from("product_images").delete().eq("product_id", productId).eq("is_primary", true);
        const { error } = await supabase.from("product_images").insert({
          product_id: productId,
          url: f.image_url,
          is_primary: true,
          alt_text: f.name,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Product saved");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["storefront-products"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("product_images").delete().eq("product_id", id);
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["storefront-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setForm(empty);
    setOpen(true);
  }
  function openEdit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      short_description: p.short_description ?? "",
      price_npr: p.price_npr,
      compare_at_price_npr: p.compare_at_price_npr,
      stock_quantity: p.stock_quantity,
      status: (p.status as "active" | "draft") ?? "active",
      is_flash_sale: p.is_flash_sale,
      category_id: p.category_id,
      image_url: p.image_url ?? "",
    });
    setOpen(true);
  }

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage inventory, pricing and visibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="bg-gradient-primary shadow-elegant">
            <Plus className="h-4 w-4" /> New product
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16"></TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No products.</TableCell></TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.slug}</div>
                  </TableCell>
                  <TableCell className="text-sm">{catName(p.category_id)}</TableCell>
                  <TableCell>{formatNPR(p.price_npr)}</TableCell>
                  <TableCell>{p.stock_quantity}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                      {p.is_flash_sale && <Badge className="bg-gradient-gold text-gold-foreground border-0">Flash</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { if (confirm(`Delete "${p.name}"?`)) del.mutate(p.id); }}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      slug: f.id ? f.slug : slugify(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Short description</Label>
              <Textarea
                value={form.short_description}
                onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category_id ?? "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? null : v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price (NPR)</Label>
                <Input
                  type="number"
                  value={form.price_npr}
                  onChange={(e) => setForm((f) => ({ ...f, price_npr: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Compare at (NPR)</Label>
                <Input
                  type="number"
                  value={form.compare_at_price_npr ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      compare_at_price_npr: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, stock_quantity: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Primary image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://images.unsplash.com/..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as "active" | "draft" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Flash sale</Label>
                <div className="h-10 flex items-center">
                  <Switch
                    checked={form.is_flash_sale}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_flash_sale: v }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || !form.name || form.price_npr <= 0}
              className="bg-gradient-primary shadow-elegant"
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
