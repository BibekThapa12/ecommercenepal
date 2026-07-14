import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: Reviews,
});

const STATUSES = ["pending","approved","rejected","hidden"] as const;

function Reviews() {
  const qc = useQueryClient();
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_reviews")
        .select("id,rating,title,body,status,admin_reply,created_at,products(name),profiles:user_id(full_name,email)")
        .order("created_at", { ascending: false });
      if (error) throw error; return (data ?? []) as any[];
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("product_reviews").update(patch).eq("id", id); if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); setReplyFor(null); setReply(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("product_reviews").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
  });

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-2xl">Product Reviews</h1><p className="text-sm text-muted-foreground">Moderate customer reviews. Approved reviews show on product pages.</p></div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> :
        data.length === 0 ? <p className="text-muted-foreground text-sm">No reviews yet.</p> :
        <div className="grid md:grid-cols-2 gap-4">
          {data.map(r => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{r.products?.name}</CardTitle>
                    <div className="flex items-center gap-1 mt-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />)}</div>
                    <p className="text-xs text-muted-foreground mt-1">by {r.profiles?.full_name ?? r.profiles?.email ?? "—"} · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.title && <div className="font-medium">{r.title}</div>}
                <p className="text-sm">{r.body}</p>
                {r.admin_reply && <div className="border-l-2 border-gold/60 pl-3 text-sm bg-muted/30 py-2">↳ {r.admin_reply}</div>}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={r.status} onValueChange={(v) => update.mutate({ id: r.id, patch: { status: v } })}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => { setReplyFor(r.id); setReply(r.admin_reply ?? ""); }}>Reply</Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete review?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {replyFor === r.id && (
                  <div className="space-y-2">
                    <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply to customer…" rows={3} />
                    <div className="flex gap-2"><Button size="sm" onClick={() => update.mutate({ id: r.id, patch: { admin_reply: reply, admin_replied_at: new Date().toISOString() } })}>Post reply</Button><Button size="sm" variant="ghost" onClick={() => { setReplyFor(null); setReply(""); }}>Cancel</Button></div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>}
    </div>
  );
}
