import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, MapPin } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatNPR, ORDER_STATUS_FLOW, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/commerce";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account/orders/$orderId")({
  component: OrderDetail,
});

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_npr: number;
  line_total_npr: number;
  image_url: string | null;
  variant_label: string | null;
  selected_options: Record<string, string>;
};

type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: string | null;
  payment_status: string;
  subtotal_npr: number;
  shipping_npr: number;
  tax_npr: number;
  discount_npr: number;
  total_npr: number;
  created_at: string;
  shipping_address: Record<string, string | null>;
  customer_note: string | null;
  order_items: OrderItem[];
  order_status_history: { status: OrderStatus; created_at: string; note: string | null }[];
};

function OrderDetail() {
  const { orderId } = Route.useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, order_number, status, payment_method, payment_status, subtotal_npr, shipping_npr, tax_npr, discount_npr, total_npr, created_at, shipping_address, customer_note,
           order_items(id, product_name, quantity, unit_price_npr, line_total_npr, image_url, variant_label, selected_options),
           order_status_history(status, created_at, note)`,
        )
        .eq("id", orderId)
        .order("created_at", { foreignTable: "order_status_history", ascending: true })
        .single();
      if (error) throw error;
      return data as unknown as Order;
    },
  });

  if (isLoading) return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;
  if (!order) return <p>Order not found.</p>;

  const isCancelled = order.status === "cancelled";
  const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status);
  const addr = order.shipping_address;

  return (
    <div className="space-y-6">
      <Link to="/account/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-base">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">Order {order.order_number}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              isCancelled
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-primary/10 text-primary border-primary/20"
            }
          >
            {ORDER_STATUS_LABEL[order.status]}
          </Badge>
        </div>

        {/* Tracking */}
        {!isCancelled && (
          <div className="mt-8">
            <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative">
              {ORDER_STATUS_FLOW.map((step, i) => {
                const done = i <= currentIdx;
                const active = i === currentIdx;
                return (
                  <li key={step} className="flex flex-col items-center gap-2 relative">
                    {i > 0 && (
                      <span
                        className={cn(
                          "absolute right-1/2 top-4 h-0.5 w-full -z-10",
                          done ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border-2 bg-background transition-base",
                        done ? "border-primary text-primary" : "border-border text-muted-foreground",
                        active && "shadow-elegant scale-110",
                      )}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4 fill-primary text-primary-foreground" /> : <Circle className="h-4 w-4" />}
                    </span>
                    <span className={cn("text-xs text-center", done ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {ORDER_STATUS_LABEL[step]}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Items */}
          <section className="rounded-2xl border bg-card p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold mb-4">Items</h3>
            <div className="space-y-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex gap-3 items-center">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.image_url && <img src={item.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.product_name}</div>
                    {variantLabel(item) && (
                      <div className="text-xs text-muted-foreground capitalize">
                        {variantLabel(item)}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatNPR(item.unit_price_npr)} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-medium tabular-nums">{formatNPR(item.line_total_npr)}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline */}
          {order.order_status_history.length > 0 && (
            <section className="rounded-2xl border bg-card p-6 shadow-card">
              <h3 className="font-display text-lg font-semibold mb-4">Activity</h3>
              <ol className="space-y-3">
                {order.order_status_history.map((h, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1">
                      <div className="font-medium">{ORDER_STATUS_LABEL[h.status]}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                      {h.note && <div className="text-xs mt-1 text-muted-foreground">{h.note}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {/* Address */}
          <section className="rounded-2xl border bg-card p-6 shadow-card">
            <h3 className="font-display text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Delivery
            </h3>
            <div className="text-sm mt-3 space-y-0.5">
              <div className="font-medium">{addr.recipient_name}</div>
              <div className="text-muted-foreground">
                {addr.street_address}
                {addr.ward ? `, Ward ${addr.ward}` : ""}
              </div>
              <div className="text-muted-foreground">
                {addr.municipality}, {addr.district}, {addr.province}
              </div>
              {addr.postal_code && <div className="text-muted-foreground">{addr.postal_code}</div>}
              <div className="text-muted-foreground pt-1">{addr.phone}</div>
            </div>
            {order.customer_note && (
              <>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">{order.customer_note}</p>
              </>
            )}
          </section>

          {/* Totals */}
          <section className="rounded-2xl border bg-card p-6 shadow-card">
            <h3 className="font-display text-sm font-semibold">Payment</h3>
            <div className="text-sm mt-3 space-y-1 text-muted-foreground">
              <div className="flex justify-between"><span>Method</span><span className="text-foreground capitalize">{order.payment_method ?? "—"}</span></div>
              <div className="flex justify-between"><span>Status</span><span className="text-foreground capitalize">{order.payment_status}</span></div>
            </div>
            <Separator className="my-3" />
            <div className="text-sm space-y-1">
              <Row label="Subtotal" value={formatNPR(order.subtotal_npr)} />
              <Row label="Shipping" value={order.shipping_npr === 0 ? "Free" : formatNPR(order.shipping_npr)} />
              {order.discount_npr > 0 && <Row label="Discount" value={`-${formatNPR(order.discount_npr)}`} />}
              <Separator className="my-2" />
              <Row label="Total" value={formatNPR(order.total_npr)} bold />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between", bold ? "font-semibold" : "text-muted-foreground")}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}

function variantLabel(item: Pick<OrderItem, "variant_label" | "selected_options">) {
  return (
    item.variant_label ||
    Object.entries(item.selected_options ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ")
  );
}
