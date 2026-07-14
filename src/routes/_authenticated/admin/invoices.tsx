import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNPR } from "@/lib/commerce";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  component: Invoices,
});

function Invoices() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id,order_number,subtotal_npr,tax_npr,shipping_npr,discount_npr,total_npr,payment_status,confirmed_at,created_at,guest_email,shipping_address,billing_address")
        .eq("is_draft", false).not("confirmed_at", "is", null).order("confirmed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function printInvoice(o: any) {
    const w = window.open("", "_blank"); if (!w) return;
    const addr = o.billing_address ?? o.shipping_address ?? {};
    w.document.write(`<html><head><title>Invoice ${o.order_number}</title>
      <style>body{font-family:sans-serif;padding:32px;max-width:700px;margin:auto} h1{margin:0} table{width:100%;border-collapse:collapse;margin-top:16px} td{padding:6px 0;border-bottom:1px solid #eee}</style>
      </head><body>
      <h1>Invoice</h1><p>#${o.order_number}</p>
      <p><strong>Bill to:</strong><br/>${addr.recipient_name ?? o.guest_email ?? ""}<br/>${addr.street_address ?? ""} ${addr.municipality ?? ""} ${addr.district ?? ""}</p>
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">${formatNPR(Number(o.subtotal_npr))}</td></tr>
        <tr><td>Shipping</td><td style="text-align:right">${formatNPR(Number(o.shipping_npr))}</td></tr>
        <tr><td>Tax / VAT</td><td style="text-align:right">${formatNPR(Number(o.tax_npr))}</td></tr>
        <tr><td>Discount</td><td style="text-align:right">- ${formatNPR(Number(o.discount_npr))}</td></tr>
        <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${formatNPR(Number(o.total_npr))}</strong></td></tr>
      </table>
      <p style="margin-top:24px">Payment: ${o.payment_status}</p>
      <script>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-2xl">Invoices</h1><p className="text-sm text-muted-foreground">Auto-generated from confirmed orders.</p></div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Issued</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow> :
              data.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices yet. Confirm an order to create one.</TableCell></TableRow> :
              data.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">INV-{o.order_number}</TableCell>
                  <TableCell className="text-xs">{new Date(o.confirmed_at).toLocaleDateString()}</TableCell>
                  <TableCell>{o.shipping_address?.recipient_name ?? o.guest_email ?? "—"}</TableCell>
                  <TableCell className="font-mono">{formatNPR(Number(o.total_npr))}</TableCell>
                  <TableCell><Badge variant={o.payment_status === "paid" ? "default" : "outline"}>{o.payment_status}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => printInvoice(o)}><Printer className="h-3.5 w-3.5" /> Print</Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
