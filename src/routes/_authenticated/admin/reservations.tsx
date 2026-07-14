import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reservations")({
  component: Reservations,
});

const STATUSES = ["active","converted","expired","released","cancelled"] as const;

function Reservations() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reservations")
        .select("id,quantity,status,expires_at,created_at,notes,products(name),product_variants(sku),profiles:user_id(full_name,email)")
        .order("created_at", { ascending: false });
      if (error) throw error; return (data ?? []) as any[];
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reservations").update({ status }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-reservations"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reservations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-reservations"] }); },
  });

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-2xl">Reservations</h1><p className="text-sm text-muted-foreground">Temporary product holds with expiry. Convert to orders or release stock.</p></div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Customer</TableHead><TableHead>Qty</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow> :
              data.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No reservations yet.</TableCell></TableRow> :
              data.map(r => {
                const expired = new Date(r.expires_at) < new Date();
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.products?.name}{r.product_variants?.sku ? <span className="text-xs text-muted-foreground"> · {r.product_variants.sku}</span> : null}</TableCell>
                    <TableCell>{r.profiles?.full_name ?? r.profiles?.email ?? "—"}</TableCell>
                    <TableCell className="font-mono">{r.quantity}</TableCell>
                    <TableCell className="text-xs">{new Date(r.expires_at).toLocaleString()}{expired && r.status === "active" && <Badge variant="destructive" className="ml-2">Expired</Badge>}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => update.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
