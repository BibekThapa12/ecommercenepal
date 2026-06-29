import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Package } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNPR, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/account/orders")({
  component: OrdersList,
});

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_npr: number;
  created_at: string;
  order_items: { product_name: string; quantity: number; image_url: string | null }[];
};

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  processing: "bg-primary/10 text-primary border-primary/20",
  shipped: "bg-accent text-accent-foreground border-border",
  delivered: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground border-border",
};

function OrdersList() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_npr, created_at, order_items(product_name, quantity, image_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border bg-card p-12 text-center shadow-card">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted">
          <Package className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="mt-4 font-display text-xl">No orders yet</h2>
        <p className="text-sm text-muted-foreground mt-1">When you place your first order, it'll show up here.</p>
        <Button asChild className="mt-6 bg-gradient-primary">
          <Link to="/">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const firstImg = order.order_items[0]?.image_url;
        const totalItems = order.order_items.reduce((s, i) => s + i.quantity, 0);
        return (
          <Link
            key={order.id}
            to="/account/orders/$orderId"
            params={{ orderId: order.id }}
            className="block rounded-2xl border bg-card p-5 shadow-card transition-base hover:shadow-elegant hover:-translate-y-0.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {firstImg ? (
                  <img src={firstImg} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-muted-foreground">
                    <Package className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{order.order_number}</span>
                  <Badge variant="outline" className={STATUS_TONE[order.status]}>
                    {ORDER_STATUS_LABEL[order.status]}
                  </Badge>
                </div>
                <div className="font-medium mt-1 truncate">
                  {order.order_items.map((i) => i.product_name).join(", ")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {totalItems} item{totalItems === 1 ? "" : "s"} · {new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <div className="font-semibold">{formatNPR(order.total_npr)}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
