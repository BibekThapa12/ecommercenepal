import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/inquiries")({
  component: Inquiries,
});

const STATUSES = ["open","pending","resolved","closed"] as const;
const PRIORITIES = ["low","normal","high","urgent"] as const;

function Inquiries() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["admin-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_inquiries")
        .select("id,ticket_number,subject,category,priority,status,created_at,user_id,guest_email,profiles:user_id(full_name,email)")
        .order("created_at", { ascending: false });
      if (error) throw error; return (data ?? []) as any[];
    },
  });

  const { data: thread = [] } = useQuery({
    queryKey: ["inquiry-thread", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.from("inquiry_messages")
        .select("id,body,is_internal_note,created_at,author_id")
        .eq("inquiry_id", selected!).order("created_at");
      if (error) throw error; return data ?? [];
    },
  });

  const patch = useMutation({
    mutationFn: async ({ id, p }: { id: string; p: any }) => { const { error } = await supabase.from("customer_inquiries").update(p).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inquiries"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const post = useMutation({
    mutationFn: async () => {
      if (!selected || !reply.trim()) return;
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from("inquiry_messages").insert({ inquiry_id: selected, body: reply, is_internal_note: internal, author_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { setReply(""); toast.success("Posted"); qc.invalidateQueries({ queryKey: ["inquiry-thread", selected] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = list.find(i => i.id === selected);

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-2xl">Customer Inquiries</h1><p className="text-sm text-muted-foreground">Tickets from customers. Reply, assign priority, resolve.</p></div>
      <div className="grid md:grid-cols-[1fr_1.2fr] gap-4">
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Ticket</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow> :
                list.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">No inquiries yet.</TableCell></TableRow> :
                list.map(i => (
                  <TableRow key={i.id} className={`cursor-pointer ${selected === i.id ? "bg-muted/50" : ""}`} onClick={() => setSelected(i.id)}>
                    <TableCell className="font-mono text-xs">{i.ticket_number}</TableCell>
                    <TableCell><div className="font-medium">{i.subject}</div><div className="text-xs text-muted-foreground">{i.profiles?.full_name ?? i.guest_email ?? "—"} · {i.category}</div></TableCell>
                    <TableCell><Badge variant={i.status === "resolved" || i.status === "closed" ? "secondary" : "default"}>{i.status}</Badge></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <Card>
          {!active ? <CardContent className="py-16 text-center text-muted-foreground text-sm">Select a ticket to view thread.</CardContent> :
            <>
              <CardHeader>
                <CardTitle className="text-base">{active.subject}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Select value={active.status} onValueChange={(v) => patch.mutate({ id: active.id, p: { status: v } })}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={active.priority} onValueChange={(v) => patch.mutate({ id: active.id, p: { priority: v } })}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {thread.length === 0 ? <p className="text-sm text-muted-foreground">No replies yet.</p> :
                    thread.map(m => (
                      <div key={m.id} className={`p-3 rounded-lg text-sm ${m.is_internal_note ? "bg-gold/10 border border-gold/30" : "bg-muted/50"}`}>
                        {m.is_internal_note && <div className="text-[10px] uppercase tracking-wider text-gold mb-1">Internal note</div>}
                        <div>{m.body}</div>
                        <div className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                </div>
                <div className="border-t pt-3 space-y-2">
                  <Textarea rows={3} value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply…" />
                  <div className="flex justify-between items-center">
                    <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> Internal note (hidden from customer)</label>
                    <Button size="sm" onClick={() => post.mutate()} disabled={!reply.trim() || post.isPending}>Post</Button>
                  </div>
                </div>
              </CardContent>
            </>}
        </Card>
      </div>
    </div>
  );
}
