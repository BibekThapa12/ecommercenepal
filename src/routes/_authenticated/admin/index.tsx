import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const stats = [
  { label: "Revenue (NPR)", value: "—", delta: "+0%", icon: DollarSign, hint: "Connect products & orders to populate" },
  { label: "Orders", value: "—", delta: "+0%", icon: ShoppingCart, hint: "Awaiting first order" },
  { label: "Products", value: "0", delta: "", icon: Package, hint: "Add your first product" },
  { label: "Customers", value: "0", delta: "", icon: Users, hint: "Customers register automatically" },
];

function AdminDashboard() {
  const { user, roles } = useAuth();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <div className="flex items-center gap-2 mb-2">
          {roles.map((r) => (
            <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>
          ))}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back, {name}</h1>
        <p className="text-muted-foreground mt-1">
          Foundation is live. Catalog, orders and analytics ship in the next phases.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-card border-border/60 transition-base hover:shadow-elegant">
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
            Auth, roles, design system, Nepal-aware schema (products, orders, addresses with Province / District / Municipality / Ward, COD + online payment placeholders) are all in place.
            Pick the next phase — <strong>storefront</strong> (catalog, PDP, cart, checkout), <strong>admin CRUD</strong> (products, orders, customers), or <strong>payments</strong> (COD end-to-end + Stripe).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
