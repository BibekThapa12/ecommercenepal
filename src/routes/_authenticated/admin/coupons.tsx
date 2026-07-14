import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: Coupons,
});

type Form = {
  id?: string; code: string; description: string; discount_type: "fixed" | "percentage";
  discount_value: string; min_order_npr: string; max_discount_npr: string;
  usage_limit: string; per_user_limit: string; starts_at: string; ends_at: string; is_active: boolean;
};
const empty: Form = { code: "", description: "", discount_type: "percentage", discount_value: "10", min_order_npr: "0", max_discount_npr: "", usage_limit: "", per_user_limit: "1", starts_at: "", ends_at: "", is_active: true };

function Coupons() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => { const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const save = useMutation({
    mutationFn: async (f: Form) => {
      const payload: any = {
        code: f.code.trim().toUpperCase(), description: f.description || null,
        discount_type: f.discount_type, discount_value: Number(f.discount_value),
        min_order_npr: Number(f.min_order_npr) || 0,
        max_discount_npr: f.max_discount_npr ? Number(f.max_discount_npr) : null,
        usage_limit: f.usage_limit ? Number(f.usage_limit) : null,
        per_user_limit: f.per_user_limit ? Number(f.per_user_limit) : null,
        starts_at: f.starts_at || null, ends_at: f.ends_at || null, is_active: f.is_active,
      };
      const { error } = f.id ? await supabase.from("coupons").update(payload).eq("id", f.id) : await supabase.from("coupons").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setForm(empty); qc.invalidateQueries({ queryKey: ["admin-coupons"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("coupons").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-coupons"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div><h1 className="font-display text-2xl">Coupons & Discounts</h1><p className="text-sm text-muted-foreground">Create promo codes for checkout.</p></div>
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4" /> New coupon</Button>
      </div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Min order</TableHead><TableHead>Used</TableHead><TableHead>Window</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow> :
              data.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No coupons yet.</TableCell></TableRow> :
              data.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                  <TableCell>{c.discount_type === "percentage" ? `${c.discount_value}%` : `NPR ${c.discount_value}`}</TableCell>
                  <TableCell>NPR {c.min_order_npr}</TableCell>
                  <TableCell>{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.starts_at ? new Date(c.starts_at).toLocaleDateString() : "—"} → {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : "∞"}</TableCell>
                  <TableCell>{c.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Off</Badge>}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => { setForm({
                      id: c.id, code: c.code, description: c.description ?? "", discount_type: c.discount_type,
                      discount_value: String(c.discount_value), min_order_npr: String(c.min_order_npr),
                      max_discount_npr: c.max_discount_npr != null ? String(c.max_discount_npr) : "",
                      usage_limit: c.usage_limit != null ? String(c.usage_limit) : "",
                      per_user_limit: c.per_user_limit != null ? String(c.per_user_limit) : "",
                      starts_at: c.starts_at ? c.starts_at.slice(0,10) : "",
                      ends_at: c.ends_at ? c.ends_at.slice(0,10) : "",
                      is_active: c.is_active,
                    }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>

                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete coupon?")) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{form.id ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER10" /></div>
            <div><Label>Type</Label>
              <Select value={form.discount_type} onValueChange={(v: any) => setForm(f => ({ ...f, discount_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed NPR</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Value</Label><Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} /></div>
            <div><Label>Min order (NPR)</Label><Input type="number" value={form.min_order_npr} onChange={e => setForm(f => ({ ...f, min_order_npr: e.target.value }))} /></div>
            <div><Label>Max discount (NPR)</Label><Input type="number" value={form.max_discount_npr} onChange={e => setForm(f => ({ ...f, max_discount_npr: e.target.value }))} /></div>
            <div><Label>Usage limit</Label><Input type="number" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} placeholder="∞" /></div>
            <div><Label>Per user limit</Label><Input type="number" value={form.per_user_limit} onChange={e => setForm(f => ({ ...f, per_user_limit: e.target.value }))} /></div>
            <div><Label>Starts</Label><Input type="date" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} /></div>
            <div><Label>Ends</Label><Input type="date" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} /></div>
            <div className="col-span-2 flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={!form.code || save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
