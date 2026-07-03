import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, MapPin, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatNPR, PAYMENT_METHODS, type PaymentMethod } from "@/lib/commerce";
import { useCart, type ProductLite } from "@/lib/use-commerce";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [{ title: "Checkout — Reactify Commerce" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutPage,
});

type Address = {
  id: string;
  recipient_name: string;
  phone: string;
  street_address: string;
  municipality: string;
  ward: string | null;
  district: string;
  province: string;
  postal_code: string | null;
  landmark: string | null;
  is_default: boolean;
  label: string | null;
};

type CheckoutCartRow = {
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
    stock_quantity: number;
    options: Record<string, string>;
    product_images: { url: string; alt_text: string | null; is_primary: boolean }[];
  } | null;
};


function CheckoutPage() {
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addressId, setAddressId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("cod");
  const [note, setNote] = useState("");

  const addressesQ = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as Address[];
      if (list.length > 0 && !addressId) setAddressId(list[0].id);
      return list;
    },
  });

  const shipping = cart.subtotal > 0 ? (cart.subtotal >= 5000 ? 0 : 150) : 0;
  const total = cart.subtotal + shipping;
  const selectedAddress = addressesQ.data?.find((a) => a.id === addressId);

  const place = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!selectedAddress) throw new Error("Add a shipping address");

      const { data: freshCart, error: cartError } = await supabase
        .from("cart_items")
        .select(
          "id, product_id, quantity, product:products(id, name, slug, price_npr, compare_at_price_npr, stock_quantity, product_images(url, alt_text, is_primary))",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cartError) throw cartError;

      const cartItems = (freshCart ?? []) as unknown as CheckoutCartRow[];
      if (cartItems.length === 0) throw new Error("Your cart is empty");

      const purchasableItems = cartItems.filter((item) => item.product);
      if (purchasableItems.length !== cartItems.length) {
        throw new Error("Some cart items are no longer available. Remove them and try again.");
      }

      const invalidStockItem = purchasableItems.find(
        (item) => item.product!.stock_quantity <= 0 || item.quantity > item.product!.stock_quantity,
      );
      if (invalidStockItem) {
        throw new Error(`${invalidStockItem.product!.name} does not have enough stock.`);
      }

      const orderSubtotal = purchasableItems.reduce(
        (sum, item) => sum + Number(item.product!.price_npr) * item.quantity,
        0,
      );
      if (orderSubtotal <= 0) throw new Error("Order total must be greater than zero.");

      const orderShipping = orderSubtotal >= 5000 ? 0 : 150;
      const orderTotal = orderSubtotal + orderShipping;

      const shippingAddress = {
        recipient_name: selectedAddress.recipient_name,
        phone: selectedAddress.phone,
        street_address: selectedAddress.street_address,
        municipality: selectedAddress.municipality,
        ward: selectedAddress.ward,
        district: selectedAddress.district,
        province: selectedAddress.province,
        postal_code: selectedAddress.postal_code,
        landmark: selectedAddress.landmark,
      };

      const { data: order, error: oerr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          subtotal_npr: orderSubtotal,
          shipping_npr: orderShipping,
          tax_npr: 0,
          discount_npr: 0,
          total_npr: orderTotal,
          payment_method: method,
          payment_status: "pending",
          status: "pending",
          shipping_address: shippingAddress,
          customer_note: note || null,
        })
        .select("id, order_number")
        .single();
      if (oerr) throw oerr;

      const items = purchasableItems.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name: i.product!.name,
        quantity: i.quantity,
        unit_price_npr: Number(i.product!.price_npr),
        line_total_npr: Number(i.product!.price_npr) * i.quantity,
        image_url: i.product!.product_images[0]?.url ?? null,
      }));
      const { error: ierr } = await supabase.from("order_items").insert(items);
      if (ierr) throw ierr;

      await supabase.from("cart_items").delete().eq("user_id", user.id);
      return order;
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Order ${order.order_number} placed!`);
      navigate({ to: "/account/orders/$orderId", params: { orderId: order.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (cart.items.length === 0 && !cart.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-semibold mt-4">Nothing to check out</h1>
          <p className="text-muted-foreground mt-2">Your cart is empty.</p>
          <Button className="mt-6 bg-gradient-primary" onClick={() => navigate({ to: "/" })}>
            Browse products
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Checkout</h1>
        <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            {/* Address */}
            <section className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Shipping address
                </h2>
                <AddressDialog />
              </div>

              {addressesQ.isLoading ? (
                <div className="h-24 rounded-xl bg-muted animate-pulse" />
              ) : (addressesQ.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Add a delivery address to continue.</p>
              ) : (
                <RadioGroup
                  value={addressId ?? ""}
                  onValueChange={setAddressId}
                  className="space-y-2"
                >
                  {addressesQ.data!.map((a) => (
                    <label
                      key={a.id}
                      className={`flex gap-3 rounded-xl border p-4 cursor-pointer transition-base ${
                        addressId === a.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={a.id} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.recipient_name}</span>
                          {a.label && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                              {a.label}
                            </span>
                          )}
                          {a.is_default && <span className="text-xs text-primary">Default</span>}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {a.street_address}
                          {a.ward ? `, Ward ${a.ward}` : ""}, {a.municipality}, {a.district},{" "}
                          {a.province}
                        </div>
                        <div className="text-sm text-muted-foreground">{a.phone}</div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </section>

            {/* Payment */}
            <section className="rounded-2xl border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold mb-4">Payment method</h2>
              <RadioGroup
                value={method}
                onValueChange={(v) => setMethod(v as PaymentMethod)}
                className="space-y-2"
              >
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex gap-3 rounded-xl border p-4 transition-base ${
                      !m.available ? "opacity-60" : "cursor-pointer hover:bg-muted/50"
                    } ${method === m.id ? "border-primary bg-primary/5" : ""}`}
                  >
                    <RadioGroupItem value={m.id} disabled={!m.available} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.label}</span>
                        {!m.available && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">Soon</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </section>

            {/* Note */}
            <section className="rounded-2xl border bg-card p-6 shadow-card">
              <Label htmlFor="note" className="font-display text-lg font-semibold">
                Order note (optional)
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="Leave a delivery instruction for the courier."
                className="mt-3"
                rows={3}
              />
            </section>
          </div>

          {/* Summary */}
          <aside className="rounded-2xl border bg-card p-6 shadow-card h-fit lg:sticky lg:top-24">
            <h2 className="font-display text-xl font-semibold">Summary</h2>
            <div className="mt-4 space-y-3">
              {cart.items.map((row) => (
                <div key={row.id} className="flex justify-between text-sm">
                  <span className="truncate pr-2">
                    {row.product?.name}{" "}
                    <span className="text-muted-foreground">× {row.quantity}</span>
                  </span>
                  <span className="tabular-nums">
                    {formatNPR((row.product?.price_npr ?? 0) * row.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatNPR(cart.subtotal)} />
              <Row label="Shipping" value={shipping === 0 ? "Free" : formatNPR(shipping)} />
              <Separator className="my-2" />
              <Row label="Total" value={formatNPR(total)} bold />
            </div>
            <Button
              size="lg"
              className="w-full mt-6 bg-gradient-primary hover:opacity-90 shadow-elegant"
              disabled={!selectedAddress || place.isPending}
              onClick={() => place.mutate()}
            >
              {place.isPending ? "Placing order…" : `Place order · ${formatNPR(total)}`}
            </Button>
            <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
              By placing this order you agree to our terms. COD orders are confirmed by phone.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between ${bold ? "text-base font-semibold" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}

function AddressDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    recipient_name: "",
    phone: "",
    street_address: "",
    municipality: "",
    ward: "",
    district: "",
    province: "",
    postal_code: "",
    landmark: "",
    label: "Home",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const required: (keyof typeof form)[] = [
        "recipient_name",
        "phone",
        "street_address",
        "municipality",
        "district",
        "province",
      ];
      for (const k of required) {
        if (!form[k].trim()) throw new Error(`${k.replace("_", " ")} is required`);
      }
      const { error } = await supabase.from("addresses").insert({
        user_id: user.id,
        recipient_name: form.recipient_name.trim(),
        phone: form.phone.trim(),
        street_address: form.street_address.trim(),
        municipality: form.municipality.trim(),
        ward: form.ward.trim() || null,
        district: form.district.trim(),
        province: form.province.trim(),
        postal_code: form.postal_code.trim() || null,
        landmark: form.landmark.trim() || null,
        label: form.label.trim() || null,
        is_default: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address saved");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Plus className="h-3.5 w-3.5" /> New address
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add shipping address</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Full name"
            v={form.recipient_name}
            onChange={(v) => setForm({ ...form, recipient_name: v })}
            className="col-span-2"
          />
          <Field
            label="Phone"
            v={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            className="col-span-2"
          />
          <Field
            label="Street address"
            v={form.street_address}
            onChange={(v) => setForm({ ...form, street_address: v })}
            className="col-span-2"
          />
          <Field
            label="Municipality"
            v={form.municipality}
            onChange={(v) => setForm({ ...form, municipality: v })}
          />
          <Field label="Ward" v={form.ward} onChange={(v) => setForm({ ...form, ward: v })} />
          <Field
            label="District"
            v={form.district}
            onChange={(v) => setForm({ ...form, district: v })}
          />
          <Field
            label="Province"
            v={form.province}
            onChange={(v) => setForm({ ...form, province: v })}
          />
          <Field
            label="Postal code"
            v={form.postal_code}
            onChange={(v) => setForm({ ...form, postal_code: v })}
          />
          <Field label="Label" v={form.label} onChange={(v) => setForm({ ...form, label: v })} />
          <Field
            label="Landmark"
            v={form.landmark}
            onChange={(v) => setForm({ ...form, landmark: v })}
            className="col-span-2"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-gradient-primary"
          >
            {save.isPending ? "Saving…" : "Save address"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  v,
  onChange,
  className,
}: {
  label: string;
  v: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={v} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
