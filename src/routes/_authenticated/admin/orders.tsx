import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatNPR, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/commerce";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

type ShippingAddress = {
  recipient_name?: string | null;
  phone?: string | null;
  street_address?: string | null;
  municipality?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  postal_code?: string | null;
  landmark?: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_npr: number;
  created_at: string;
  user_id: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  shipping_address: ShippingAddress | null;
  customer_note: string | null;
  order_items: {
    product_name: string;
    quantity: number;
    variant_label: string | null;
    selected_options: Record<string, string>;
  }[];
};

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  packed: "bg-primary/10 text-primary border-primary/20",
  ready_to_ship: "bg-primary/10 text-primary border-primary/20",
  shipped: "bg-accent text-accent-foreground border-border",
  out_for_delivery: "bg-accent text-accent-foreground border-border",
  delivered: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  returned: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
  "failed",
];

function AdminOrders() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<{
    orderId: string;
    status: OrderStatus;
    orderNumber: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);

  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canDeleteOrders = hasRole("admin");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, total_npr, created_at, user_id, guest_email, guest_phone, shipping_address, customer_note, order_items(product_name, quantity, variant_label, selected_options)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) throw error;
      return { orderId, status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["storefront-products"] });
      setPendingChange(null);
      setConfirmOpen(false);
      toast.success("Order status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc("delete_order_as_admin", { _order_id: orderId });
      if (error) throw error;
      if (!data) throw new Error("Order was not deleted.");
      return data;
    },
    onSuccess: (deletedOrderId) => {
      qc.setQueryData<OrderRow[]>(["admin-orders"], (current) =>
        (current ?? []).filter((order) => order.id !== deletedOrderId),
      );
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      setPendingDelete(null);
      toast.success("Order deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review all orders placed by customers.
          </p>
        </div>
        <div className="rounded-2xl border bg-card px-4 py-3 shadow-card">
          <div className="text-xs text-muted-foreground">Total orders</div>
          <div className="text-2xl font-semibold">{isLoading ? "â€”" : orders.length}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Note</TableHead>
              {canDeleteOrders && <TableHead className="w-16 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={canDeleteOrders ? 7 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading ordersâ€¦
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canDeleteOrders ? 7 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No orders have been placed yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const itemCount =
                  order.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
                const itemDescription = order.order_items
                  .map((item) => {
                    const variant =
                      item.variant_label ||
                      Object.entries(item.selected_options ?? {})
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ");
                    return `${item.quantity}× ${item.product_name}${variant ? ` (${variant})` : ""}`;
                  })
                  .join(", ");
                const customerName =
                  order.shipping_address?.recipient_name ?? order.guest_email ?? "Guest";
                const customerPhone = order.shipping_address?.phone ?? order.guest_phone ?? "â€”";
                const addressParts = [
                  order.shipping_address?.street_address,
                  order.shipping_address?.ward ? `Ward ${order.shipping_address.ward}` : null,
                  order.shipping_address?.municipality,
                  order.shipping_address?.district,
                  order.shipping_address?.province,
                ]
                  .filter(Boolean)
                  .join(", ");
                const customerAddress = addressParts || "â€”";
                const note = order.customer_note ?? "â€”";

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <div>{order.order_number}</div>
                      <div className="text-xs text-muted-foreground mt-1">{customerName}</div>
                      <div className="text-xs text-muted-foreground">{customerPhone}</div>
                      <div className="text-xs text-muted-foreground">{customerAddress}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge
                          className={
                            STATUS_TONE[order.status] ??
                            "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {ORDER_STATUS_LABEL[order.status]}
                        </Badge>
                        <select
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-background px-2 py-1 text-sm"
                          value={order.status}
                          disabled={updateStatus.isPending}
                          onChange={(event) => {
                            const selected = event.target.value as OrderStatus;
                            if (selected !== order.status) {
                              setPendingChange({
                                orderId: order.id,
                                status: selected,
                                orderNumber: order.order_number,
                              });
                              setConfirmOpen(true);
                            }
                          }}
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {ORDER_STATUS_LABEL[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>
                    <TableCell>{formatNPR(order.total_npr)}</TableCell>
                    <TableCell>
                      <div>{itemCount}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {itemDescription || "No items"}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground wrap-break-word">
                      {note}
                    </TableCell>
                    {canDeleteOrders && (
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete order ${order.order_number}`}
                          disabled={deleteOrder.isPending}
                          onClick={() =>
                            setPendingDelete({
                              orderId: order.id,
                              orderNumber: order.order_number,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm status change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingChange ? (
                <>
                  You are changing order <strong>{pendingChange.orderNumber}</strong> to{" "}
                  <strong>{ORDER_STATUS_LABEL[pendingChange.status]}</strong>. This will only apply
                  if you confirm.
                </>
              ) : (
                "Do you want to update this order status?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingChange(null);
                setConfirmOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!pendingChange || updateStatus.isPending}
              onClick={() => {
                if (pendingChange) {
                  updateStatus.mutate(pendingChange);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete order?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>
                  This will permanently delete order <strong>{pendingDelete.orderNumber}</strong>{" "}
                  and its order items/history. This cannot be undone.
                </>
              ) : (
                "Do you want to delete this order?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOrder.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!pendingDelete || deleteOrder.isPending}
              onClick={() => {
                if (pendingDelete) deleteOrder.mutate(pendingDelete.orderId);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOrder.isPending ? "Deleting..." : "Delete order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


