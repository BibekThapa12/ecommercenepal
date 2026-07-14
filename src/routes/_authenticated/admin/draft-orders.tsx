import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNPR } from "@/lib/commerce";
import { toast } from "sonner";
import { CheckCircle2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/draft-orders")({
  component: DraftOrders,
});

function DraftOrders() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-draft-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id,order_number,total_npr,status,created_at,guest_email,shipping_address,customer_note")
        .eq("is_draft", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const convert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").update({ is_draft: false, status: "pending" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Draft converted"); qc.invalidateQueries({ queryKey: ["admin-draft-orders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_order_as_admin", { _order_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-draft-orders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">Draft Orders</h1>
        <p className="text-sm text-muted-foreground">Saved orders that have not been confirmed yet. Convert to place them in the fulfillment queue.</p>
      </div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow> :
              data.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No drafts. Start one from the storefront checkout by saving without paying.</TableCell></TableRow> :
              data.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                  <TableCell>{o.shipping_address?.recipient_name ?? o.guest_email ?? "—"}</TableCell>
                  <TableCell className="font-mono">{formatNPR(Number(o.total_npr))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Badge variant="outline">Draft</Badge>
                    <Button size="sm" variant="secondary" onClick={() => convert.mutate(o.id)}><CheckCircle2 className="h-3.5 w-3.5" /> Convert</Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete draft?")) del.mutate(o.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
