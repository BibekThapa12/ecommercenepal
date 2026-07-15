import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatNPR } from "@/lib/commerce";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: Analytics,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  packed: "#8b5cf6",
  ready_to_ship: "#a855f7",
  shipped: "#0ea5e9",
  out_for_delivery: "#06b6d4",
  delivered: "#10b981",
  cancelled: "#ef4444",
  returned: "#f97316",
  refunded: "#ef4444",
  failed: "#dc2626",
};

function Analytics() {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", from, to],
    queryFn: async () => {
      const fromIso = new Date(from).toISOString();
      const toIso = new Date(new Date(to).getTime() + 86400000).toISOString();
      const [ordersRes, itemsRes, custRes, lowStockRes, couponRes] = await Promise.all([
        supabase.from("orders").select("id,total_npr,status,created_at,user_id")
          .gte("created_at", fromIso).lt("created_at", toIso).eq("is_draft", false),
        supabase.from("order_items").select("product_id,product_name,quantity,line_total_npr,orders!inner(created_at,is_draft)")
          .gte("orders.created_at", fromIso).lt("orders.created_at", toIso).eq("orders.is_draft", false),
        supabase.from("profiles").select("id,created_at").gte("created_at", fromIso).lt("created_at", toIso),
        supabase.from("products").select("id,name,stock_quantity").lte("stock_quantity", 5).order("stock_quantity"),
        supabase.from("coupon_redemptions").select("id,discount_applied_npr,created_at,coupons(code)").gte("created_at", fromIso).lt("created_at", toIso),
      ]);
      const orders = ordersRes.data ?? [];
      const items = (itemsRes.data ?? []) as any[];
      const revenue = orders.filter(o => o.status !== "cancelled" && o.status !== "refunded")
        .reduce((s, o) => s + Number(o.total_npr), 0);
      const aov = orders.length ? revenue / orders.length : 0;

      // Revenue over time (by day)
      const byDay = new Map<string, { date: string; revenue: number; orders: number }>();
      for (const o of orders) {
        const d = new Date(o.created_at).toISOString().slice(0, 10);
        const cur = byDay.get(d) ?? { date: d, revenue: 0, orders: 0 };
        if (o.status !== "cancelled" && o.status !== "refunded") cur.revenue += Number(o.total_npr);
        cur.orders += 1;
        byDay.set(d, cur);
      }
      const daily = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));

      // Orders by status
      const byStatus = new Map<string, number>();
      for (const o of orders) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
      const statusData = [...byStatus.entries()].map(([status, count]) => ({ status, count }));

      // Top products
      const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
      for (const it of items) {
        const cur = productSales.get(it.product_id) ?? { name: it.product_name, qty: 0, revenue: 0 };
        cur.qty += it.quantity; cur.revenue += Number(it.line_total_npr);
        productSales.set(it.product_id, cur);
      }
      const top = [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      // Coupon usage
      const couponMap = new Map<string, { code: string; uses: number; discount: number }>();
      for (const r of (couponRes.data ?? []) as any[]) {
        const code = r.coupons?.code ?? "?";
        const cur = couponMap.get(code) ?? { code, uses: 0, discount: 0 };
        cur.uses += 1; cur.discount += Number(r.discount_applied_npr ?? 0);
        couponMap.set(code, cur);
      }
      const coupons = [...couponMap.values()].sort((a, b) => b.discount - a.discount);

      return {
        revenue, aov, orderCount: orders.length,
        newCustomers: custRes.data?.length ?? 0,
        top, lowStock: lowStockRes.data ?? [],
        daily, statusData, coupons,
      };
    },
  });

  const kpis = useMemo(() => [
    { label: "Revenue", value: data ? formatNPR(data.revenue) : "—" },
    { label: "Orders", value: data?.orderCount ?? "—" },
    { label: "Avg order value", value: data ? formatNPR(data.aov) : "—" },
    { label: "New customers", value: data?.newCustomers ?? "—" },
  ], [data]);

  function download() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["metric", "value"],
      ["revenue", data.revenue],
      ["orders", data.orderCount],
      ["aov", data.aov.toFixed(2)],
      ["new_customers", data.newCustomers],
      [],
      ["top_products", "quantity", "revenue"],
      ...data.top.map(t => [t.name, t.qty, t.revenue.toFixed(2)]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h1 className="font-display text-2xl">Analytics</h1>
          <p className="text-sm text-muted-foreground">Revenue, sales, customers and stock health.</p>
        </div>
        <div className="flex items-end gap-2">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
          <Button onClick={download} disabled={!data}><Download className="h-4 w-4" /> CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{k.value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue over time</CardTitle></CardHeader>
          <CardContent className="h-72">
            {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
              !data?.daily.length ? <div className="text-sm text-muted-foreground">No data in this window.</div> :
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => formatNPR(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Orders by status</CardTitle></CardHeader>
          <CardContent className="h-72">
            {!data?.statusData.length ? <div className="text-sm text-muted-foreground">No orders.</div> :
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.statusData} dataKey="count" nameKey="status" outerRadius={80} label={(e: any) => e.status}>
                    {data.statusData.map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? "#94a3b8"} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Top products</CardTitle></CardHeader>
          <CardContent className="h-72">
            {!data?.top.length ? <div className="text-sm text-muted-foreground">No sales in this window.</div> :
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top.slice(0, 6)} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                  <Tooltip formatter={(v: number) => formatNPR(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="revenue" fill="hsl(var(--gold))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Coupon usage</CardTitle></CardHeader>
          <CardContent className="space-y-2 h-72 overflow-auto">
            {!data?.coupons.length ? <div className="text-sm text-muted-foreground">No coupons redeemed.</div> :
              data.coupons.map(c => (
                <div key={c.code} className="flex justify-between text-sm border-b border-border/40 py-1.5">
                  <span className="font-mono">{c.code} <span className="text-muted-foreground">× {c.uses}</span></span>
                  <span className="font-mono">- {formatNPR(c.discount)}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Low stock alerts</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!data?.lowStock.length ? <div className="text-sm text-muted-foreground">All products above threshold.</div> :
            data.lowStock.map((p: any) => (
              <div key={p.id} className="flex justify-between text-sm border-b border-border/40 py-1.5">
                <span className="truncate">{p.name}</span>
                <span className="font-mono text-destructive">{p.stock_quantity}</span>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
