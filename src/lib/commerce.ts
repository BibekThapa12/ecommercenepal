export function formatNPR(n: number): string {
  return `NPR ${new Intl.NumberFormat("en-IN").format(n)}`;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  processing: "Packing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export type PaymentMethod = "cod" | "esewa" | "khalti" | "fonepay";

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; description: string; available: boolean }[] = [
  { id: "cod", label: "Cash on Delivery", description: "Pay when your order arrives.", available: true },
  { id: "esewa", label: "eSewa", description: "Coming soon — gateway integration pending.", available: false },
  { id: "khalti", label: "Khalti", description: "Coming soon — gateway integration pending.", available: false },
  { id: "fonepay", label: "FonePay", description: "Coming soon — gateway integration pending.", available: false },
];
