import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/brands")({
  component: Brands,
});

type Brand = { id: string; name: string; slug: string; logo_url: string | null; description: string | null; is_active: boolean };
type Form = { id?: string; name: string; slug: string; logo_url: string; description: string; is_active: boolean };
const empty: Form = { name: "", slug: "", logo_url: "", description: "", is_active: true };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Brands() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async (): Promise<Brand[]> => {
      const { data, error } = await supabase.from("brands").select("id,name,slug,logo_url,description,is_active").order("name");
      if (error) throw error; return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const payload = { name: f.name, slug: f.slug || slugify(f.name), logo_url: f.logo_url || null, description: f.description || null, is_active: f.is_active };
      const { error } = f.id
        ? await supabase.from("brands").update(payload).eq("id", f.id)
        : await supabase.from("brands").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setForm(empty); qc.invalidateQueries({ queryKey: ["admin-brands"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("brands").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-brands"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div><h1 className="font-display text-2xl">Brands</h1><p className="text-sm text-muted-foreground">Assign brands to products for filtering and merchandising.</p></div>
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4" /> New brand</Button>
      </div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Logo</TableHead><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow> :
              data.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No brands yet.</TableCell></TableRow> :
              data.map(b => (
                <TableRow key={b.id}>
                  <TableCell>{b.logo_url ? <img src={b.logo_url} alt="" className="h-8 w-8 object-contain rounded bg-muted" /> : <div className="h-8 w-8 rounded bg-muted" />}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="font-mono text-xs">{b.slug}</TableCell>
                  <TableCell>{b.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Hidden</Badge>}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => { setForm({ id: b.id, name: b.name, slug: b.slug, logo_url: b.logo_url ?? "", description: b.description ?? "", is_active: b.is_active }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete brand?")) del.mutate(b.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{form.id ? "Edit brand" : "New brand"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} /></div>
            <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={!form.name || save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
