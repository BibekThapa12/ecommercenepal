import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: AdminCustomers,
});

type CustomerRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};

function AdminCustomers() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async (): Promise<CustomerRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerRow[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            See all registered customer accounts.
          </p>
        </div>
        <div className="rounded-2xl border bg-card px-4 py-3 shadow-card">
          <div className="text-xs text-muted-foreground">Total customers</div>
          <div className="text-2xl font-semibold">{isLoading ? "—" : customers.length}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading customers…
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.full_name ?? "Unnamed"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {customer.email ?? "—"}
                  </TableCell>
                  <TableCell>{customer.phone ?? "—"}</TableCell>
                  <TableCell>{new Date(customer.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
