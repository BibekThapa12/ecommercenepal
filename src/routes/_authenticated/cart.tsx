import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { Separator } from "@/components/ui/separator";
import { formatNPR } from "@/lib/commerce";
import { useCart } from "@/lib/use-commerce";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({
    meta: [{ title: "Cart — Reactify Commerce" }, { name: "robots", content: "noindex" }],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const shipping = cart.subtotal > 0 ? (cart.subtotal >= 5000 ? 0 : 150) : 0;
  const total = cart.subtotal + shipping;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Your cart</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {cart.count === 0
            ? "Your cart is empty."
            : `${cart.count} item${cart.count === 1 ? "" : "s"}`}
        </p>

        {cart.isLoading ? (
          <div className="mt-8 h-64 rounded-2xl bg-muted animate-pulse" />
        ) : cart.items.length === 0 ? (
          <div className="mt-12 rounded-3xl border bg-card p-12 text-center shadow-card">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-muted-foreground">No items in your cart yet.</p>
            <Button asChild className="mt-6 bg-gradient-primary hover:opacity-90 shadow-elegant">
              <Link to="/">Browse products</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-3">
              {cart.items.map((row) => {
                const p = row.product;
                if (!p) return null;
                const img = p.product_images.find((i) => i.is_primary) ?? p.product_images[0];
                return (
                  <div
                    key={row.id}
                    className="flex gap-4 rounded-2xl border bg-card p-4 shadow-card"
                  >
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {img && (
                        <img
                          src={img.url}
                          alt={img.alt_text ?? p.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium leading-tight truncate">{p.name}</h3>
                        <button
                          aria-label="Remove"
                          className="text-muted-foreground hover:text-destructive transition-base"
                          disabled={cart.remove.isPending}
                          onClick={() => cart.remove.mutate(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {formatNPR(p.price_npr)}
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border bg-background">
                          <button
                            aria-label="Decrease"
                            className="grid h-8 w-8 place-items-center rounded-l-full hover:bg-muted transition-base disabled:opacity-40"
                            disabled={row.quantity <= 1 || cart.setQty.isPending}
                            onClick={() =>
                              cart.setQty.mutate({ id: row.id, quantity: row.quantity - 1 })
                            }
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium tabular-nums">
                            {row.quantity}
                          </span>
                          <button
                            aria-label="Increase"
                            className="grid h-8 w-8 place-items-center rounded-r-full hover:bg-muted transition-base disabled:opacity-40"
                            disabled={cart.setQty.isPending || row.quantity >= p.stock_quantity}
                            onClick={() =>
                              cart.setQty.mutate({ id: row.id, quantity: row.quantity + 1 })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="font-semibold">{formatNPR(p.price_npr * row.quantity)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="rounded-2xl border bg-card p-6 shadow-card h-fit lg:sticky lg:top-24">
              <h2 className="font-display text-xl font-semibold">Order summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <Row label="Subtotal" value={formatNPR(cart.subtotal)} />
                <Row label="Shipping" value={shipping === 0 ? "Free" : formatNPR(shipping)} muted />
                {cart.subtotal < 5000 && cart.subtotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Add {formatNPR(5000 - cart.subtotal)} more for free shipping.
                  </p>
                )}
                <Separator className="my-3" />
                <Row label="Total" value={formatNPR(total)} bold />
              </div>
              <Button
                asChild
                size="lg"
                className="w-full mt-6 bg-gradient-primary hover:opacity-90 shadow-elegant"
              >
                <Link to="/checkout">Proceed to checkout</Link>
              </Button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-semibold" : ""}`}>
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
