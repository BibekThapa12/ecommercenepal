import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/account/addresses")({
  component: AddressesPage,
});

type Address = {
  id: string;
  recipient_name: string;
  phone: string;
  street_address: string;
  municipality: string;
  ward: string | null;
  district: string;
  province: string;
  postal_code: string | null;
  landmark: string | null;
  is_default: boolean;
  label: string | null;
};

function AddressesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Address[];
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address removed");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage where we ship your orders.</p>
        <AddressDialog />
      </div>

      {isLoading ? (
        <div className="h-48 rounded-2xl bg-muted animate-pulse" />
      ) : addresses.length === 0 ? (
        <div className="rounded-3xl border bg-card p-12 text-center shadow-card">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted">
            <MapPin className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-display text-xl">No addresses saved</h2>
          <p className="text-sm text-muted-foreground mt-1">Add an address to make checkout faster.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{a.recipient_name}</span>
                  {a.label && <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{a.label}</span>}
                  {a.is_default && (
                    <span className="text-xs text-primary flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-primary" /> Default
                    </span>
                  )}
                </div>
                <button
                  aria-label="Remove"
                  onClick={() => remove.mutate(a.id)}
                  className="text-muted-foreground hover:text-destructive transition-base"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm text-muted-foreground mt-3 space-y-0.5">
                <div>{a.street_address}{a.ward ? `, Ward ${a.ward}` : ""}</div>
                <div>{a.municipality}, {a.district}</div>
                <div>{a.province}{a.postal_code ? ` · ${a.postal_code}` : ""}</div>
                <div className="pt-1 text-foreground/80">{a.phone}</div>
              </div>
              {!a.is_default && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => setDefault.mutate(a.id)}
                >
                  Set as default
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    recipient_name: "",
    phone: "",
    street_address: "",
    municipality: "",
    ward: "",
    district: "",
    province: "",
    postal_code: "",
    landmark: "",
    label: "Home",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const required: (keyof typeof form)[] = ["recipient_name", "phone", "street_address", "municipality", "district", "province"];
      for (const k of required) if (!form[k].trim()) throw new Error(`${k.replace("_", " ")} is required`);
      const { error } = await supabase.from("addresses").insert({
        user_id: user.id,
        recipient_name: form.recipient_name.trim(),
        phone: form.phone.trim(),
        street_address: form.street_address.trim(),
        municipality: form.municipality.trim(),
        ward: form.ward.trim() || null,
        district: form.district.trim(),
        province: form.province.trim(),
        postal_code: form.postal_code.trim() || null,
        landmark: form.landmark.trim() || null,
        label: form.label.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary gap-1"><Plus className="h-4 w-4" /> New address</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add address</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <F label="Full name" v={form.recipient_name} on={(v) => setForm({ ...form, recipient_name: v })} cls="col-span-2" />
          <F label="Phone" v={form.phone} on={(v) => setForm({ ...form, phone: v })} cls="col-span-2" />
          <F label="Street address" v={form.street_address} on={(v) => setForm({ ...form, street_address: v })} cls="col-span-2" />
          <F label="Municipality" v={form.municipality} on={(v) => setForm({ ...form, municipality: v })} />
          <F label="Ward" v={form.ward} on={(v) => setForm({ ...form, ward: v })} />
          <F label="District" v={form.district} on={(v) => setForm({ ...form, district: v })} />
          <F label="Province" v={form.province} on={(v) => setForm({ ...form, province: v })} />
          <F label="Postal code" v={form.postal_code} on={(v) => setForm({ ...form, postal_code: v })} />
          <F label="Label" v={form.label} on={(v) => setForm({ ...form, label: v })} />
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gradient-primary">
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, v, on, cls }: { label: string; v: string; on: (v: string) => void; cls?: string }) {
  return (
    <div className={cls}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={v} onChange={(e) => on(e.target.value)} className="mt-1" />
    </div>
  );
}
