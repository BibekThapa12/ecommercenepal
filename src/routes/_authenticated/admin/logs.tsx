import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: Logs,
});

const SEVERITY: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  info: "outline", warn: "secondary", error: "destructive", critical: "destructive",
};

function Logs() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-logs", q],
    queryFn: async () => {
      let query = supabase.from("system_logs")
        .select("id,action,entity_type,entity_id,severity,metadata,created_at,profiles:actor_id(full_name,email)")
        .order("created_at", { ascending: false }).limit(200);
      if (q) query = query.or(`action.ilike.%${q}%,entity_type.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error; return (data ?? []) as any[];
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end gap-3">
        <div><h1 className="font-display text-2xl">System Logs</h1><p className="text-sm text-muted-foreground">Audit trail of critical admin and business actions.</p></div>
        <Input placeholder="Filter action or entity…" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
      </div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Severity</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow> :
              data.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs yet. Emit with <code className="font-mono text-xs">supabase.from('system_logs').insert(...)</code> from admin actions.</TableCell></TableRow> :
              data.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{l.profiles?.full_name ?? l.profiles?.email ?? "system"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.action}</TableCell>
                  <TableCell className="text-xs">{l.entity_type}{l.entity_id ? ` · ${l.entity_id.slice(0,8)}` : ""}</TableCell>
                  <TableCell><Badge variant={SEVERITY[l.severity] ?? "outline"}>{l.severity}</Badge></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
