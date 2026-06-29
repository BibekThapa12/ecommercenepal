import { Link, useNavigate } from "@tanstack/react-router";
import { Flame, Heart, ShoppingBag, Star } from "lucide-react";

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
};

export function ProductCard({ product }: { product: ProductCardData }) {
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

  function requireAuth(action: () => void) {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    action();
  }

  return (
    <div className="group relative rounded-2xl border bg-card shadow-card overflow-hidden transition-base hover:shadow-elegant hover:-translate-y-0.5">
      <Link to="/" className="block aspect-square relative bg-muted overflow-hidden">
        {img ? (
          <img
            src={img.url}
            alt={img.alt_text ?? product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
        )}
        {discount !== null && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-0">
            -{discount}%
          </Badge>
        )}
        {product.is_flash_sale && (
          <Badge className="absolute top-3 right-12 bg-gradient-gold text-gold-foreground border-0 gap-1">
            <Flame className="h-3 w-3" />
          </Badge>
        )}
      </Link>

      <button
        type="button"
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        onClick={(e) => {
          e.preventDefault();
          requireAuth(() => wishlist.toggle.mutate(product.id));
        }}
        className={cn(
          "absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full glass border border-border/60 hover:scale-105 transition-base z-10",
          saved && "text-primary",
        )}
      >
        <Heart className={cn("h-4 w-4", saved && "fill-current")} />
      </button>

      <div className="p-4">
        <h3 className="font-medium leading-snug line-clamp-1">{product.name}</h3>
        {product.short_description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {product.short_description}
          </p>
        )}
        <div className="flex items-end justify-between mt-3">
          <div>
            <div className="font-semibold">{formatNPR(product.price_npr)}</div>
            {product.compare_at_price_npr && (
              <div className="text-xs text-muted-foreground line-through">
                {formatNPR(product.compare_at_price_npr)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-gold text-gold" />
            <span>4.8</span>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full mt-3 bg-gradient-primary hover:opacity-90 shadow-elegant"
          onClick={() => requireAuth(() => cart.add.mutate({ productId: product.id }))}
          disabled={cart.add.isPending}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Add to cart
        </Button>
      </div>
    </div>
  );
}
