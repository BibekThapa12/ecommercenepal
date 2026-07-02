import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Heart, Minus, Plus, ShoppingBag, Star, Truck, ShieldCheck, RotateCcw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatNPR } from "@/lib/commerce";
import { useCart, useWishlist } from "@/lib/use-commerce";
import { cn } from "@/lib/utils";

type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  short_description: string | null;
  price_npr: number;
  compare_at_price_npr: number | null;
  stock_quantity: number;
  is_flash_sale: boolean;
  tags: string[];
  sku: string | null;
  category_id: string | null;
  brand: { name: string } | null;
  category: { name: string; slug: string } | null;
  product_images: { url: string; alt_text: string | null; is_primary: boolean }[];
};

const PRODUCT_SELECT =
  "id, slug, name, description, short_description, price_npr, compare_at_price_npr, stock_quantity, is_flash_sale, tags, sku, category_id, brand:brands(name), category:categories(name, slug), product_images(url, alt_text, is_primary)";

export const Route = createFileRoute("/products/$slug")({
  head: ({ loaderData }) => {
    const p = loaderData as ProductDetail | undefined;
    const title = p ? `${p.name} — ReactifyStore` : "Product — ReactifyStore";
    const desc = p?.short_description ?? p?.description?.slice(0, 155) ?? "Premium product on ReactifyStore.";
    const img = p?.product_images.find((i) => i.is_primary)?.url ?? p?.product_images[0]?.url;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: async ({ params }): Promise<ProductDetail> => {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", params.slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data as unknown as ProductDetail;
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="font-display text-5xl">Product not found</h1>
        <p className="text-muted-foreground mt-3">The item you're looking for may have been removed.</p>
        <Button asChild className="mt-6 rounded-full bg-foreground text-background hover:bg-foreground/90">
          <Link to="/products">Browse all products</Link>
        </Button>
      </div>
    </div>
  ),
  component: ProductDetailsPage,
});

function ProductDetailsPage() {
  const product = Route.useLoaderData() as ProductDetail;
  const { user } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const images = product.product_images.length
    ? product.product_images
    : [{ url: "", alt_text: product.name, is_primary: true }];
  const discount = product.compare_at_price_npr && product.compare_at_price_npr > product.price_npr
    ? Math.round(((product.compare_at_price_npr - product.price_npr) / product.compare_at_price_npr) * 100)
    : null;
  const outOfStock = product.stock_quantity === 0;
  const lowStock = !outOfStock && product.stock_quantity <= 5;
  const saved = wishlist.ids.has(product.id);

  const { data: related = [] } = useQuery({
    queryKey: ["related-products", product.category_id, product.id],
    enabled: !!product.category_id,
    queryFn: async (): Promise<ProductCardData[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, short_description, price_npr, compare_at_price_npr, is_flash_sale, stock_quantity, product_images(url, alt_text, is_primary), brand:brands(name)")
        .eq("status", "active")
        .eq("category_id", product.category_id!)
        .neq("id", product.id)
        .limit(4);
      if (error) throw error;
      return (data ?? []) as unknown as ProductCardData[];
    },
  });

  function requireAuth(action: () => void) {
    if (!user) return navigate({ to: "/auth" });
    action();
  }

  const variants = useMemo(() => {
    // Derive faux "variants" from tags for now so the UI matches designs.
    const colors = product.tags.filter((t) => ["black", "white", "silver", "gold", "blue", "red", "green"].includes(t.toLowerCase()));
    const sizes = product.tags.filter((t) => ["xs", "s", "m", "l", "xl", "xxl"].includes(t.toLowerCase()));
    return { colors, sizes };
  }, [product.tags]);

  const [color, setColor] = useState(variants.colors[0] ?? null);
  const [size, setSize] = useState(variants.sizes[0] ?? null);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="hover:text-foreground">Products</Link>
          {product.category && (
            <>
              <span className="mx-2">/</span>
              <Link to="/products" search={{ category: product.category.slug }} className="hover:text-foreground">
                {product.category.name}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-foreground truncate">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 mt-8">
          {/* Gallery */}
          <div>
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted border border-border/60">
              {images[activeImg]?.url ? (
                <img
                  src={images[activeImg].url}
                  alt={images[activeImg].alt_text ?? product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-muted-foreground">
                  <ShoppingBag className="h-10 w-10" />
                </div>
              )}
              {discount !== null && (
                <Badge className="absolute top-4 left-4 rounded-full bg-gold text-gold-foreground border-0 shadow-gold px-3 py-1">
                  -{discount}%
                </Badge>
              )}
              {product.is_flash_sale && (
                <Badge className="absolute top-4 right-4 rounded-full bg-foreground text-background border-0 px-3 py-1">
                  Flash Sale
                </Badge>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-3 mt-4">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={cn(
                      "aspect-square rounded-xl overflow-hidden border-2 transition-base",
                      i === activeImg ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100",
                    )}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              {product.brand?.name ?? "Reactify"}
              {product.category && <> · {product.category.name}</>}
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight mt-2 leading-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <span>4.9 (238 reviews)</span>
            </div>

            <div className="flex items-baseline gap-3 mt-6">
              <span className="font-display text-4xl font-bold">{formatNPR(product.price_npr)}</span>
              {product.compare_at_price_npr && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatNPR(product.compare_at_price_npr)}
                </span>
              )}
            </div>

            {product.short_description && (
              <p className="text-muted-foreground mt-5 leading-relaxed">{product.short_description}</p>
            )}

            {/* Stock */}
            <div className="mt-6 flex items-center gap-2 text-sm">
              <span className={cn("h-2 w-2 rounded-full", outOfStock ? "bg-destructive" : lowStock ? "bg-gold" : "bg-emerald-500")} />
              <span className="font-medium">
                {outOfStock ? "Out of stock" : lowStock ? `Only ${product.stock_quantity} left` : "In stock"}
              </span>
              {product.sku && <span className="text-muted-foreground">· SKU {product.sku}</span>}
            </div>

            {/* Variants */}
            {variants.colors.length > 0 && (
              <div className="mt-6">
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-2">
                  Color: <span className="text-foreground">{color}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        "px-4 h-10 rounded-full border text-sm capitalize transition-base",
                        color === c ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {variants.sizes.length > 0 && (
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-2">
                  Size: <span className="text-foreground">{size?.toUpperCase()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={cn(
                        "min-w-12 h-10 px-3 rounded-full border text-sm uppercase font-medium transition-base",
                        size === s ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Qty + CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-full border border-border h-12">
                <button
                  className="h-full w-11 grid place-items-center hover:bg-accent rounded-l-full disabled:opacity-40"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <button
                  className="h-full w-11 grid place-items-center hover:bg-accent rounded-r-full disabled:opacity-40"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  disabled={qty >= product.stock_quantity}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                size="lg"
                onClick={() => requireAuth(() => cart.add.mutate({ productId: product.id, quantity: qty }))}
                disabled={cart.add.isPending || outOfStock}
                className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-12 px-8 gap-2 font-medium flex-1 sm:flex-none"
              >
                <ShoppingBag className="h-4 w-4" />
                {outOfStock ? "Out of stock" : "Add to cart"}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => requireAuth(() => wishlist.toggle.mutate(product.id))}
                className={cn("rounded-full h-12 w-12 p-0", saved && "text-gold border-gold")}
                aria-label="Save to wishlist"
              >
                <Heart className={cn("h-4 w-4", saved && "fill-current")} />
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-3 gap-3 pt-6 border-t border-border/60">
              <TrustBadge icon={<Truck className="h-4 w-4" />} label="Free shipping" hint="Orders over NPR 5,000" />
              <TrustBadge icon={<ShieldCheck className="h-4 w-4" />} label="Secure payment" hint="COD & digital wallets" />
              <TrustBadge icon={<RotateCcw className="h-4 w-4" />} label="7-day returns" hint="Hassle-free" />
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <section className="mt-16 max-w-3xl">
            <h2 className="font-display text-3xl font-bold">About this product</h2>
            <div className="mt-4 text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          </section>
        )}

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20">
            <div className="flex items-end justify-between mb-6">
              <h2 className="font-display text-3xl sm:text-4xl font-bold">You may also like</h2>
              <Link to="/products" className="text-sm hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function TrustBadge({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-8 w-8 rounded-full bg-accent grid place-items-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-medium leading-tight">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
      </div>
    </div>
  );
}
