import type { Database } from "@/integrations/supabase/types";

export function formatNPR(n: number): string {
  return `NPR ${new Intl.NumberFormat("en-IN").format(n)}`;
}

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  packed: "Packed",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
  failed: "Failed",
};

export type PaymentMethod = "cod" | "esewa" | "khalti" | "fonepay";

export const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  description: string;
  available: boolean;
}[] = [
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay when your order arrives.",
    available: true,
  },
  {
    id: "esewa",
    label: "eSewa",
    description: "Coming soon — gateway integration pending.",
    available: false,
  },
  {
    id: "khalti",
    label: "Khalti",
    description: "Coming soon — gateway integration pending.",
    available: false,
  },
  {
    id: "fonepay",
    label: "FonePay",
    description: "Coming soon — gateway integration pending.",
    available: false,
  },
];
