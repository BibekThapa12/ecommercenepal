import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNPR } from "@/lib/commerce";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: Payments,
});

const STATUSES = ["pending", "partially_paid", "paid", "refunded", "failed"] as const;

function Payments() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id,order_number,payment_status,payment_method,total_npr,created_at,guest_email,user_id,shipping_address")
        .eq("is_draft", false).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, payment_status }: { id: string; payment_status: string }) => {
      const { error } = await supabase.from("orders").update({ payment_status: payment_status as any }).eq("id", id);
      if (error) throw error;
      await supabase.from("system_logs").insert({ severity: "info", action: `payment_${payment_status}`, entity_type: "order", entity_id: id, metadata: {} });
    },
    onSuccess: () => { toast.success("Payment status updated"); qc.invalidateQueries({ queryKey: ["admin-payments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const refund = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").update({ payment_status: "refunded" as any, status: "refunded" as any }).eq("id", id);
      if (error) throw error;
      await supabase.from("system_logs").insert({ severity: "warn", action: "order_refunded", entity_type: "order", entity_id: id, metadata: {} });
    },
    onSuccess: () => { toast.success("Order refunded"); qc.invalidateQueries({ queryKey: ["admin-payments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">Payments</h1>
        <p className="text-sm text-muted-foreground">Payment status across every order. Refunds and settlement live here.</p>
      </div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow> :
              data.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments yet.</TableCell></TableRow> :
              data.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                  <TableCell>{o.shipping_address?.recipient_name ?? o.guest_email ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{o.payment_method ?? "—"}</Badge></TableCell>
                  <TableCell className="font-mono">{formatNPR(Number(o.total_npr))}</TableCell>
                  <TableCell>
                    <Select value={o.payment_status} onValueChange={(v) => update.mutate({ id: o.id, payment_status: v })}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {o.payment_status !== "refunded" && (
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Refund order ${o.order_number}?`)) refund.mutate(o.id); }}>
                        Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
