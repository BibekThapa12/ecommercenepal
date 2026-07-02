import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, ShoppingBag, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatNPR } from "@/lib/commerce";
import { useCart, useWishlist } from "@/lib/use-commerce";
import { cn } from "@/lib/utils";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  price_npr: number;
  compare_at_price_npr: number | null;
  is_flash_sale: boolean;
  product_images: { url: string; alt_text: string | null; is_primary: boolean }[];
  brand?: { name: string } | null;
  stock_quantity?: number;
};

export function ProductCard({ product, badge }: { product: ProductCardData; badge?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const img = product.product_images.find((i) => i.is_primary) ?? product.product_images[0];
  const discount =
    product.compare_at_price_npr && product.compare_at_price_npr > product.price_npr
      ? Math.round(
          ((product.compare_at_price_npr - product.price_npr) / product.compare_at_price_npr) * 100,
        )
      : null;
  const saved = wishlist.ids.has(product.id);
  const outOfStock = product.stock_quantity === 0;
  const brandName = product.brand?.name ?? "Reactify";

  function requireAuth(action: () => void) {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    action();
  }

  return (
    <div className="group relative rounded-3xl bg-card border border-border/60 overflow-hidden transition-base hover:shadow-elegant hover:-translate-y-1">
      <Link to="/products/$slug" params={{ slug: product.slug }} className="block relative aspect-4/3 bg-muted overflow-hidden">
        {img ? (
          <img
            src={img.url}
            alt={img.alt_text ?? product.name}
            className={cn(
              "h-full w-full object-cover transition-transform duration-700 group-hover:scale-105",
              outOfStock && "opacity-60 blur-[1px]",
            )}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
        )}

        {badge && !outOfStock && (
          <Badge className="absolute top-3 left-3 rounded-full bg-gold text-gold-foreground border-0 shadow-gold font-medium px-3 py-1">
            {badge}
          </Badge>
        )}

        {outOfStock && (
          <div className="absolute inset-0 grid place-items-center">
            <Badge className="rounded-full bg-foreground text-background border-0 px-4 py-1.5 font-medium">
              Out of Stock
            </Badge>
          </div>
        )}

        {discount !== null && !outOfStock && (
          <span className="absolute top-3 right-3 text-xs font-semibold text-foreground/80 bg-background/90 backdrop-blur px-2.5 py-1 rounded-full">
            -{discount}%
          </span>
        )}

        <button
          type="button"
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          onClick={(e) => {
            e.preventDefault();
            requireAuth(() => wishlist.toggle.mutate(product.id));
          }}
          className={cn(
            "absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur border border-border/60 hover:scale-105 transition-base opacity-0 group-hover:opacity-100",
            saved && "text-gold opacity-100",
          )}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        </button>
      </Link>

      <Link to="/products/$slug" params={{ slug: product.slug }} className="block p-5">
        <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
          {brandName}
        </div>
        <h3 className="font-display text-lg leading-snug mt-1 line-clamp-1">{product.name}</h3>


        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-gold text-gold" />
            ))}
          </div>
          <span>(238)</span>
        </div>

        <div className="flex items-end justify-between mt-4 gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-display text-xl font-bold">{formatNPR(product.price_npr)}</span>
            {product.compare_at_price_npr && (
              <span className="text-xs text-muted-foreground line-through">
                {formatNPR(product.compare_at_price_npr)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => requireAuth(() => cart.add.mutate({ productId: product.id }))}
            disabled={cart.add.isPending || outOfStock}
            className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-9 px-4 gap-1.5 font-medium shrink-0"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
