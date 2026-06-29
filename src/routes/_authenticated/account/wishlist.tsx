import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNPR } from "@/lib/commerce";
import { useCart, useWishlist } from "@/lib/use-commerce";

export const Route = createFileRoute("/_authenticated/account/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const wishlist = useWishlist();
  const cart = useCart();

  if (wishlist.isLoading) return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;

  if (wishlist.items.length === 0) {
    return (
      <div className="rounded-3xl border bg-card p-12 text-center shadow-card">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted">
          <Heart className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="mt-4 font-display text-xl">Your wishlist is empty</h2>
        <p className="text-sm text-muted-foreground mt-1">Tap the heart on any product to save it for later.</p>
        <Button asChild className="mt-6 bg-gradient-primary">
          <Link to="/">Discover products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {wishlist.items.map((row) => {
        const p = row.product;
        if (!p) return null;
        const img = p.product_images.find((i) => i.is_primary) ?? p.product_images[0];
        return (
          <div key={row.id} className="rounded-2xl border bg-card overflow-hidden shadow-card group">
            <div className="aspect-square bg-muted overflow-hidden relative">
              {img && (
                <img src={img.url} alt={img.alt_text ?? p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
              )}
              <button
                aria-label="Remove from wishlist"
                onClick={() => wishlist.remove.mutate(row.id)}
                className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full glass border border-border/60 hover:text-destructive transition-base"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-medium line-clamp-1">{p.name}</h3>
                <div className="font-semibold mt-1">{formatNPR(p.price_npr)}</div>
              </div>
              <Button
                size="sm"
                className="w-full bg-gradient-primary hover:opacity-90"
                onClick={() => cart.add.mutate({ productId: p.id })}
                disabled={cart.add.isPending}
              >
                <ShoppingBag className="h-3.5 w-3.5" /> Move to cart
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
