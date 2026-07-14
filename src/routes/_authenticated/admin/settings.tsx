import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: Settings,
});

type SettingsShape = {
  store_name?: string; store_email?: string; store_phone?: string;
  currency?: string; tax_rate?: number; free_shipping_threshold?: number; default_shipping?: number;
  logo_url?: string; address?: string;
  return_policy?: string;
  facebook?: string; instagram?: string; twitter?: string;
  invoice_prefix?: string; invoice_footer?: string;
};

function Settings() {
  const qc = useQueryClient();
  const [f, setF] = useState<SettingsShape>({});
  const { data } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => { const { data, error } = await supabase.from("store_settings").select("id,settings").eq("singleton", true).maybeSingle(); if (error) throw error; return data; },
  });
  useEffect(() => { if (data?.settings) setF(data.settings as SettingsShape); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from("store_settings").update({ settings: f, updated_by: user?.id, updated_at: new Date().toISOString() }).eq("singleton", true);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["store-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const upd = <K extends keyof SettingsShape>(k: K, v: SettingsShape[K]) => setF(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4 max-w-3xl">
      <div><h1 className="font-display text-2xl">Store Settings</h1><p className="text-sm text-muted-foreground">Global storefront configuration.</p></div>

      <Card><CardHeader><CardTitle>Store identity</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Store name</Label><Input value={f.store_name ?? ""} onChange={e => upd("store_name", e.target.value)} /></div>
        <div><Label>Contact email</Label><Input value={f.store_email ?? ""} onChange={e => upd("store_email", e.target.value)} /></div>
        <div><Label>Phone</Label><Input value={f.store_phone ?? ""} onChange={e => upd("store_phone", e.target.value)} /></div>
        <div className="col-span-2"><Label>Logo URL</Label><Input value={f.logo_url ?? ""} onChange={e => upd("logo_url", e.target.value)} /></div>
        <div className="col-span-2"><Label>Address</Label><Textarea rows={2} value={f.address ?? ""} onChange={e => upd("address", e.target.value)} /></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Commerce</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
        <div><Label>Currency</Label><Input value={f.currency ?? "NPR"} onChange={e => upd("currency", e.target.value)} /></div>
        <div><Label>Tax rate (%)</Label><Input type="number" value={f.tax_rate ?? 0} onChange={e => upd("tax_rate", Number(e.target.value))} /></div>
        <div><Label>Free shipping over (NPR)</Label><Input type="number" value={f.free_shipping_threshold ?? 5000} onChange={e => upd("free_shipping_threshold", Number(e.target.value))} /></div>
        <div><Label>Default shipping (NPR)</Label><Input type="number" value={f.default_shipping ?? 150} onChange={e => upd("default_shipping", Number(e.target.value))} /></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
        <div><Label>Invoice prefix</Label><Input value={f.invoice_prefix ?? "INV-"} onChange={e => upd("invoice_prefix", e.target.value)} /></div>
        <div className="col-span-2"><Label>Invoice footer text</Label><Textarea rows={2} value={f.invoice_footer ?? ""} onChange={e => upd("invoice_footer", e.target.value)} /></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Policies & social</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Return policy</Label><Textarea rows={3} value={f.return_policy ?? ""} onChange={e => upd("return_policy", e.target.value)} /></div>
        <div><Label>Facebook URL</Label><Input value={f.facebook ?? ""} onChange={e => upd("facebook", e.target.value)} /></div>
        <div><Label>Instagram URL</Label><Input value={f.instagram ?? ""} onChange={e => upd("instagram", e.target.value)} /></div>
        <div><Label>Twitter / X URL</Label><Input value={f.twitter ?? ""} onChange={e => upd("twitter", e.target.value)} /></div>
      </CardContent></Card>

      <div className="flex justify-end"><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button></div>
    </div>
  );
}
