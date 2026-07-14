import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNPR } from "@/lib/commerce";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/abandoned-carts")({
  component: AbandonedCarts,
});

function AbandonedCarts() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-abandoned"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h idle
      const { data, error } = await supabase.from("cart_items")
        .select("id,quantity,updated_at,user_id,products(name,price_npr),profiles:user_id(full_name,email)")
        .not("user_id", "is", null)
        .lt("updated_at", cutoff)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error; return (data ?? []) as any[];
    },
  });

  // Group by user
  const byUser = new Map<string, { name: string; email: string; items: any[]; value: number; last: string }>();
  for (const it of data) {
    const uid = it.user_id;
    const cur = byUser.get(uid) ?? { name: it.profiles?.full_name ?? "—", email: it.profiles?.email ?? "—", items: [], value: 0, last: it.updated_at };
    cur.items.push(it);
    cur.value += Number(it.products?.price_npr ?? 0) * it.quantity;
    if (it.updated_at > cur.last) cur.last = it.updated_at;
    byUser.set(uid, cur);
  }
  const rows = [...byUser.entries()];

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-2xl">Abandoned Carts</h1><p className="text-sm text-muted-foreground">Signed-in carts with no checkout activity for over an hour.</p></div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Cart value</TableHead><TableHead>Last activity</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow> :
              rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No abandoned carts.</TableCell></TableRow> :
              rows.map(([uid, r]) => (
                <TableRow key={uid}>
                  <TableCell><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.email}</div></TableCell>
                  <TableCell>{r.items.length} item{r.items.length === 1 ? "" : "s"}<div className="text-xs text-muted-foreground truncate max-w-xs">{r.items.map(i => i.products?.name).filter(Boolean).join(", ")}</div></TableCell>
                  <TableCell className="font-mono">{formatNPR(r.value)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.last).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">Not recovered</Badge></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
