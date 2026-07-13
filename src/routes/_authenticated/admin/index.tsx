import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Download,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useAuth();
  const name =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "Admin";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [ordersRes, customersRes, deliveredRes, failedRes, recentOrdersRes, lowStockRes] =
        await Promise.all([
          supabase.from("orders").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("orders").select("total_npr").eq("status", "delivered"),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "failed"),
          supabase
            .from("orders")
            .select("id, order_number, total_npr, created_at, status, user_id, profiles:profiles(full_name, email)")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("products")
            .select("id, name, stock_quantity, low_stock_threshold, images:product_images(url)")
            .lte("stock_quantity", 5)
            .order("stock_quantity", { ascending: true })
            .limit(4),
        ]);

      return {
        ordersCount: ordersRes.count ?? 0,
        customersCount: customersRes.count ?? 0,
        failedCount: failedRes.count ?? 0,
        revenue: (deliveredRes.data ?? []).reduce((s, o) => s + Number(o.total_npr ?? 0), 0),
        recent: (recentOrdersRes.data ?? []) as Array<{
          id: string;
          order_number: string | null;
          total_npr: number;
          created_at: string;
          status: string;
          user_id: string;
          profiles: { full_name: string | null; email: string | null } | null;
        }>,
        lowStock: (lowStockRes.data ?? []) as Array<{
          id: string;
          name: string;
          stock_quantity: number;
          low_stock_threshold: number | null;
          images: { url: string }[] | null;
        }>,
      };
    },
    staleTime: 60_000,
  });

  const stats = [
    {
      label: "Total Revenue",
      value: isLoading ? "—" : formatNPR(data?.revenue ?? 0),
      change: "+20.1% from last month",
      trend: "up" as const,
      icon: DollarSign,
    },
    {
      label: "Active Customers",
      value: isLoading ? "—" : `+${data?.customersCount ?? 0}`,
      change: "+180.1% from last month",
      trend: "up" as const,
      icon: Users,
    },
    {
      label: "New Orders",
      value: isLoading ? "—" : `+${data?.ordersCount ?? 0}`,
      change: "+19% from last month",
      trend: "up" as const,
      icon: ShoppingCart,
    },
    {
      label: "Failed Payments",
      value: isLoading ? "—" : String(data?.failedCount ?? 0),
      change: `${data?.failedCount ?? 0} needing review`,
      trend: "down" as const,
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Welcome back {name}, here's what's happening with your store today.
          </p>
        </div>
        <Button className="bg-gradient-gold text-gold-foreground shadow-gold hover:opacity-90">
          <Download className="h-4 w-4" /> Download Report
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const TrendIcon = s.trend === "up" ? ArrowUpRight : ArrowDownRight;
          return (
            <Card
              key={s.label}
              className="border-border/50 bg-card/60 shadow-card hover:border-gold/40 transition-base"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold font-display tracking-tight">{s.value}</div>
                <p
                  className={`text-xs mt-2 flex items-center gap-1 ${
                    s.trend === "up" ? "text-success" : "text-destructive"
                  }`}
                >
                  <TrendIcon className="h-3 w-3" />
                  {s.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/60 shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-xl">Recent Orders</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading recent activity…"
                : `${data?.recent.length ?? 0} orders in the latest activity feed.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {(data?.recent ?? []).length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No orders yet — they will appear here as customers check out.
              </p>
            )}
            {(data?.recent ?? []).map((order) => {
              const displayName = order.profiles?.full_name ?? order.profiles?.email ?? "Guest";
              const email = order.profiles?.email ?? "—";
              const initials = displayName.slice(0, 2).toUpperCase();
              return (
                <Link
                  key={order.id}
                  to="/admin/orders"
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-base"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-muted text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  </div>
                  <div className="text-sm font-semibold text-gold">
                    +{formatNPR(Number(order.total_npr))}
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/60 shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-xl">Inventory Alerts</CardTitle>
            <CardDescription>Products running low on stock.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.lowStock ?? []).length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                All products are well stocked. 🎉
              </p>
            )}
            {(data?.lowStock ?? []).map((p) => {
              const img = p.images?.[0]?.url;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-base"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center overflow-hidden shrink-0">
                    {img ? (
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-gold">
                      Only {p.stock_quantity} left in stock
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="border-border/60">
                    <Link to="/admin/products">Restock</Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
