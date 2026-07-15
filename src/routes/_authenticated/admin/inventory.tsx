import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: Inventory,
});

function Inventory() {
  const qc = useQueryClient();
  const [adjustFor, setAdjustFor] = useState<{ id: string; name: string; stock: number } | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products")
        .select("id,name,sku,stock_quantity,low_stock_threshold,is_active")
        .order("stock_quantity");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["admin-inventory-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_adjustments")
        .select("id,product_id,delta,reason,notes,created_at,products(name)")
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error; return (data ?? []) as any[];
    },
  });

  const adjust = useMutation({
    mutationFn: async () => {
      if (!adjustFor) return;
      const d = Number(delta);
      if (!d || !reason) throw new Error("Delta and reason required");
      const { data, error } = await supabase.rpc("adjust_stock", {
        _product_id: adjustFor.id,
        _variant_id: undefined as unknown as string,
        _delta: d,
        _reason: reason,
        _notes: "",
      });
      if (error) throw error;
      const res = data as { ok: boolean; new_stock: number };
      if (!res?.ok) throw new Error("Adjustment failed");
    },
    onSuccess: () => { toast.success("Stock adjusted"); setAdjustFor(null); setDelta(""); setReason(""); qc.invalidateQueries({ queryKey: ["admin-inventory"] }); qc.invalidateQueries({ queryKey: ["admin-inventory-history"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl">Inventory</h1><p className="text-sm text-muted-foreground">Track stock per product and record adjustments with a reason.</p></div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Stock</TableHead><TableHead>Low threshold</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow> :
              data.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs">{p.sku ?? "—"}</TableCell>
                  <TableCell>{p.stock_quantity <= (p.low_stock_threshold ?? 5) ? <Badge variant="destructive">{p.stock_quantity}</Badge> : <span className="font-mono">{p.stock_quantity}</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.low_stock_threshold ?? 5}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setAdjustFor({ id: p.id, name: p.name, stock: p.stock_quantity })}>Adjust</Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="font-display text-lg mb-2">Recent movements</h2>
        <div className="rounded-xl border">
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Product</TableHead><TableHead>Delta</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
            <TableBody>
              {history.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">No adjustments yet.</TableCell></TableRow> :
                history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</TableCell>
                    <TableCell>{h.products?.name ?? "—"}</TableCell>
                    <TableCell className={h.delta < 0 ? "text-destructive font-mono" : "text-emerald-500 font-mono"}>{h.delta > 0 ? `+${h.delta}` : h.delta}</TableCell>
                    <TableCell className="text-sm">{h.reason}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!adjustFor} onOpenChange={(v) => !v && setAdjustFor(null)}>
        <DialogContent><DialogHeader><DialogTitle>Adjust stock · {adjustFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Current: {adjustFor?.stock}. Use negative numbers to decrease.</p>
            <div><Label>Delta</Label><Input type="number" value={delta} onChange={e => setDelta(e.target.value)} placeholder="+10 or -3" /></div>
            <div><Label>Reason</Label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Restock / Damage / Correction" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAdjustFor(null)}>Cancel</Button><Button onClick={() => adjust.mutate()} disabled={adjust.isPending}>{adjust.isPending ? "Saving…" : "Apply"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
