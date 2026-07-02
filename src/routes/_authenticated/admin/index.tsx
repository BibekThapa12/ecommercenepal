import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, DollarSign, Package, ShoppingCart, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, roles } = useAuth();
  const name =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "there";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [productsRes, ordersRes, customersRes, deliveredRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_npr").eq("status", "delivered"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (customersRes.error) throw customersRes.error;
      if (deliveredRes.error) throw deliveredRes.error;

      return {
        productsCount: productsRes.count ?? 0,
        ordersCount: ordersRes.count ?? 0,
        customersCount: customersRes.count ?? 0,
        deliveredRevenue: (deliveredRes.data ?? []).reduce(
          (sum, order) => sum + Number(order.total_npr ?? 0),
          0,
        ),
      };
    },
    staleTime: 1000 * 60,
  });

  const productsCount = data?.productsCount ?? 0;
  const ordersCount = data?.ordersCount ?? 0;
  const customersCount = data?.customersCount ?? 0;
  const deliveredRevenue = data?.deliveredRevenue ?? 0;

  const stats = [
    {
      label: "Delivered revenue",
      value: isLoading ? "—" : formatNPR(deliveredRevenue),
      delta: "",
      icon: DollarSign,
      hint: "Revenue from delivered orders",
    },
    {
      label: "Orders",
      value: isLoading ? "—" : String(ordersCount),
      delta: "",
      icon: ShoppingCart,
      hint: ordersCount === 0 ? "Awaiting first order" : "Total orders placed",
    },
    {
      label: "Products",
      value: isLoading ? "—" : String(productsCount),
      delta: "",
      icon: Package,
      hint: productsCount === 0 ? "Add your first product" : "Inventory items available",
    },
    {
      label: "Customers",
      value: isLoading ? "—" : String(customersCount),
      delta: "",
      icon: Users,
      hint: customersCount === 0 ? "Customers register automatically" : "Registered customers",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <div className="flex items-center gap-2 mb-2">
          {roles.map((r) => (
            <Badge key={r} variant="secondary" className="capitalize">
              {r}
            </Badge>
          ))}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back, {name}</h1>
        <p className="text-muted-foreground mt-1">
          Foundation is live. Catalog, orders and analytics ship in the next phases.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="shadow-card border-border/60 transition-base hover:shadow-elegant"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold font-display">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {s.delta && <ArrowUpRight className="h-3 w-3" />} {s.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed border-border/60 bg-gradient-hero">
        <CardContent className="py-12 text-center">
          <h2 className="font-display text-2xl mb-2">Foundation complete</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Auth, roles, design system, Nepal-aware schema (products, orders, addresses with
            Province / District / Municipality / Ward, COD + online payment placeholders) are all in
            place. Pick the next phase — <strong>storefront</strong> (catalog, PDP, cart, checkout),{" "}
            <strong>admin CRUD</strong> (products, orders, customers), or <strong>payments</strong>{" "}
            (COD end-to-end + Stripe).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
