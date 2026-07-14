import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

function toIso(d: Date) { return d.toISOString(); }

function Analytics() {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", from, to],
    queryFn: async () => {
      const fromIso = toIso(new Date(from));
      const toIso2 = toIso(new Date(new Date(to).getTime() + 86400000));
      const [ordersRes, itemsRes, custRes, lowStockRes] = await Promise.all([
        supabase.from("orders").select("id,total_npr,status,created_at,user_id")
          .gte("created_at", fromIso).lt("created_at", toIso2).eq("is_draft", false),
        supabase.from("order_items").select("product_id,product_name,quantity,line_total_npr,orders!inner(created_at,is_draft)")
          .gte("orders.created_at", fromIso).lt("orders.created_at", toIso2).eq("orders.is_draft", false),
        supabase.from("profiles").select("id,created_at").gte("created_at", fromIso).lt("created_at", toIso2),
        supabase.from("products").select("id,name,stock_quantity").lte("stock_quantity", 5).order("stock_quantity"),
      ]);
      const orders = ordersRes.data ?? [];
      const items = (itemsRes.data ?? []) as any[];
      const revenue = orders.filter(o => o.status !== "cancelled" && o.status !== "refunded")
        .reduce((s, o) => s + Number(o.total_npr), 0);
      const aov = orders.length ? revenue / orders.length : 0;
      const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
      for (const it of items) {
        const cur = productSales.get(it.product_id) ?? { name: it.product_name, qty: 0, revenue: 0 };
        cur.qty += it.quantity; cur.revenue += Number(it.line_total_npr);
        productSales.set(it.product_id, cur);
      }
      const top = [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
      return {
        revenue, aov, orderCount: orders.length,
        newCustomers: custRes.data?.length ?? 0,
        top, lowStock: lowStockRes.data ?? [],
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
    const rows = [
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
          <Card key={k.label}><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{k.value}</CardContent></Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Top products</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
              !data?.top.length ? <div className="text-sm text-muted-foreground">No sales in this window.</div> :
              data.top.map(t => (
                <div key={t.name} className="flex justify-between text-sm border-b border-border/40 py-1.5"><span className="truncate">{t.name} <span className="text-muted-foreground">× {t.qty}</span></span><span className="font-mono">{formatNPR(t.revenue)}</span></div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Low stock alerts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!data?.lowStock.length ? <div className="text-sm text-muted-foreground">All products above threshold.</div> :
              data.lowStock.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm border-b border-border/40 py-1.5"><span className="truncate">{p.name}</span><span className="font-mono text-destructive">{p.stock_quantity}</span></div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
