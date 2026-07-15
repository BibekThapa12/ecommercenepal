import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Share2,
  GitCompare,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { ProductReviews } from "@/components/product-reviews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatNPR } from "@/lib/commerce";
import { useCart, useWishlist } from "@/lib/use-commerce";
import { cn } from "@/lib/utils";

type Img = { url: string; alt_text: string | null; is_primary: boolean; variant_id?: string | null };
type Variant = {
  id: string;
  sku: string | null;
  options: Record<string, string>;
  price_npr: number | null;
  compare_at_price_npr: number | null;
  stock_quantity: number;
  is_active: boolean;
  display_order: number;
};

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
  weight_grams: number | null;
  brand: { name: string } | null;
  category: { name: string; slug: string } | null;
  product_images: Img[];
  product_variants: Variant[];
};

const PRODUCT_SELECT =
  "id, slug, name, description, short_description, price_npr, compare_at_price_npr, stock_quantity, is_flash_sale, tags, sku, category_id, weight_grams, brand:brands(name), category:categories(name, slug), product_images(url, alt_text, is_primary, variant_id), product_variants(id, sku, options, price_npr, compare_at_price_npr, stock_quantity, is_active, display_order)";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const bySlug = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", params.slug)
      .eq("status", "active")
      .maybeSingle();
    if (bySlug.error) throw bySlug.error;
    if (bySlug.data) return bySlug.data as unknown as ProductDetail;

    if (UUID_RE.test(params.slug)) {
      const byId = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("id", params.slug)
        .eq("status", "active")
        .maybeSingle();
      if (byId.error) throw byId.error;
      if (byId.data) return byId.data as unknown as ProductDetail;
    }

    throw notFound();
  },
  pendingComponent: ProductDetailSkeleton,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center shadow-card">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 font-display text-3xl font-semibold">Product could not load</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button asChild className="mt-6 rounded-full bg-foreground text-background hover:bg-foreground/90">
            <Link to="/products">Back to products</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
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

function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 sm:px-6 py-8">
        <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        <div className="mt-8 grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="aspect-square rounded-3xl bg-muted animate-pulse" />
          <div className="space-y-5">
            <div className="h-3 w-40 rounded bg-muted animate-pulse" />
            <div className="h-12 w-4/5 rounded bg-muted animate-pulse" />
            <div className="h-5 w-72 rounded bg-muted animate-pulse" />
            <div className="h-10 w-52 rounded bg-muted animate-pulse" />
            <div className="h-20 w-full rounded bg-muted animate-pulse" />
            <div className="flex gap-3">
              <div className="h-12 w-36 rounded-full bg-muted animate-pulse" />
              <div className="h-12 w-36 rounded-full bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const COLOR_KEYS = new Set(["color", "colour"]);

function ProductDetailsPage() {
  const product = Route.useLoaderData() as ProductDetail;
  const { user } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const variants = (product.product_variants ?? []).filter((v) => v.is_active);
  const hasVariants = variants.length > 0;

  // Collect option keys and values from all variants (preserving order of appearance).
  const optionKeys = useMemo(() => {
    const seen: string[] = [];
    for (const v of variants) {
      for (const k of Object.keys(v.options ?? {})) {
        if (!seen.includes(k)) seen.push(k);
      }
    }
    return seen;
  }, [variants]);

  const optionValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const k of optionKeys) map[k] = [];
    for (const v of variants) {
      for (const k of optionKeys) {
        const val = v.options?.[k];
        if (val && !map[k].includes(val)) map[k].push(val);
      }
    }
    return map;
  }, [variants, optionKeys]);

  // Selected options — default to first variant's options.
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    if (!hasVariants) return {};
    const first = variants[0];
    return { ...(first.options ?? {}) };
  });

  // Which variant fully matches current selection.
  const matchedVariant = useMemo(() => {
    if (!hasVariants) return null;
    return (
      variants.find((v) =>
        optionKeys.every((k) => v.options?.[k] === selected[k]),
      ) ?? null
    );
  }, [variants, optionKeys, selected, hasVariants]);

  // Is a specific (key,value) available given other current selections?
  function isValueAvailable(key: string, value: string) {
    return variants.some(
      (v) =>
        v.options?.[key] === value &&
        v.stock_quantity > 0 &&
        optionKeys.every(
          (k) => k === key || !selected[k] || v.options?.[k] === selected[k],
        ),
    );
  }

  // Dynamic gallery: variant match > partial match on Color > product images.
  const gallery: Img[] = useMemo(() => {
    const all = product.product_images ?? [];
    if (matchedVariant) {
      const exact = all.filter((i) => i.variant_id === matchedVariant.id);
      if (exact.length) return exact;
    }
    // Partial match: variants that share the selected color.
    const colorKey = optionKeys.find((k) => COLOR_KEYS.has(k.toLowerCase()));
    if (colorKey && selected[colorKey]) {
      const colorVariantIds = variants
        .filter((v) => v.options?.[colorKey] === selected[colorKey])
        .map((v) => v.id);
      const colored = all.filter(
        (i) => i.variant_id && colorVariantIds.includes(i.variant_id),
      );
      if (colored.length) return colored;
    }
    const generic = all.filter((i) => !i.variant_id);
    return generic.length ? generic : all;
  }, [product.product_images, matchedVariant, selected, optionKeys, variants]);

  // Reset active image index when gallery changes.
  const currentImg = gallery[activeImg] ?? gallery[0];

  const effectivePrice = matchedVariant?.price_npr ?? product.price_npr;
  const effectiveCompare =
    matchedVariant?.compare_at_price_npr ?? product.compare_at_price_npr;
  const effectiveStock = hasVariants
    ? matchedVariant?.stock_quantity ?? 0
    : product.stock_quantity;
  const effectiveSku = matchedVariant?.sku ?? product.sku;

  const discount =
    effectiveCompare && effectiveCompare > effectivePrice
      ? Math.round(((effectiveCompare - effectivePrice) / effectiveCompare) * 100)
      : null;
  const outOfStock = effectiveStock === 0;
  const lowStock = !outOfStock && effectiveStock <= 5;
  const saved = wishlist.ids.has(product.id);

  const missingOption = hasVariants
    ? optionKeys.find((k) => !selected[k]) ?? null
    : null;
  const needsSelection = hasVariants && (!matchedVariant || missingOption);

  const { data: related = [] } = useQuery({
    queryKey: ["related-products", product.category_id, product.id],
    enabled: !!product.category_id,
    queryFn: async (): Promise<ProductCardData[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, short_description, price_npr, compare_at_price_npr, is_flash_sale, stock_quantity, product_images(url, alt_text, is_primary), product_variants(id, is_active), brand:brands(name)",
        )
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

  function handleAdd(buyNow = false) {
    if (needsSelection) {
      toast.error(`Please select ${missingOption ?? "a variant"} first`);
      return;
    }
    if (outOfStock) return;
    requireAuth(() =>
      cart.add.mutate(
        {
          productId: product.id,
          variantId: matchedVariant?.id ?? null,
          selectedOptions: selected,
          quantity: qty,
        },
        {
          onSuccess: () => {
            if (buyNow) navigate({ to: "/checkout" });
          },
        },
      ),
    );
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  }

  function handleCompare() {
    if (typeof window === "undefined") return;
    const key = "compare-products";
    const existing: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (existing.includes(product.slug)) {
      toast.info("Already in compare list");
      return;
    }
    const next = [...existing, product.slug].slice(-4);
    localStorage.setItem(key, JSON.stringify(next));
    toast.success(`Added to compare (${next.length})`);
  }

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
              <span className="hover:text-foreground">{product.category.name}</span>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-foreground truncate">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 mt-8">
          {/* Gallery */}
          <div>
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted border border-border/60">
              {currentImg?.url ? (
                <img
                  src={currentImg.url}
                  alt={currentImg.alt_text ?? product.name}
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

            {gallery.length > 1 && (
              <div className="grid grid-cols-5 gap-3 mt-4">
                {gallery.map((img, i) => (
                  <button
                    key={`${img.url}-${i}`}
                    onClick={() => setActiveImg(i)}
                    className={cn(
                      "aspect-square rounded-xl overflow-hidden border-2 transition-base",
                      i === activeImg
                        ? "border-foreground"
                        : "border-transparent opacity-70 hover:opacity-100",
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
              {effectiveSku && (
                <>
                  <span>·</span>
                  <span className="font-mono text-xs">SKU: {effectiveSku}</span>
                </>
              )}
            </div>

            <div className="flex items-baseline gap-3 mt-6">
              <span className="font-display text-4xl font-bold">{formatNPR(effectivePrice)}</span>
              {effectiveCompare && effectiveCompare > effectivePrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatNPR(effectiveCompare)}
                </span>
              )}
            </div>

            {product.short_description && (
              <p className="text-muted-foreground mt-5 leading-relaxed">
                {product.short_description}
              </p>
            )}

            {/* Variant selectors */}
            {hasVariants &&
              optionKeys.map((key) => (
                <div key={key} className="mt-6">
                  <div className="text-sm font-medium capitalize mb-2">
                    {key}
                    {selected[key] && (
                      <span className="text-muted-foreground font-normal ml-2">
                        {selected[key]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {optionValues[key].map((val) => {
                      const active = selected[key] === val;
                      const available = isValueAvailable(key, val);
                      return (
                        <button
                          key={val}
                          type="button"
                          disabled={!available && !active}
                          onClick={() => {
                            setSelected((s) => ({ ...s, [key]: val }));
                            setActiveImg(0);
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full border text-sm transition-base",
                            active
                              ? "bg-foreground text-background border-foreground"
                              : "border-border hover:border-foreground",
                            !available &&
                              !active &&
                              "opacity-40 line-through cursor-not-allowed",
                          )}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            {/* Stock */}
            <div className="mt-6 flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  outOfStock
                    ? "bg-destructive"
                    : lowStock
                      ? "bg-gold"
                      : "bg-emerald-500",
                )}
              />
              <span className="text-muted-foreground">
                {outOfStock
                  ? "Out of stock"
                  : lowStock
                    ? `Only ${effectiveStock} left in stock`
                    : "In stock — ready to ship"}
              </span>
            </div>

            {/* Qty + CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full border border-border h-12 overflow-hidden">
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
                  disabled={qty >= effectiveStock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                size="lg"
                onClick={() => handleAdd(false)}
                disabled={cart.add.isPending || outOfStock}
                className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-12 px-8 gap-2 font-medium flex-1 sm:flex-none"
              >
                <ShoppingBag className="h-4 w-4" />
                {outOfStock ? "Out of stock" : "Add to cart"}
              </Button>

              <Button
                size="lg"
                onClick={() => handleAdd(true)}
                disabled={cart.add.isPending || outOfStock}
                className="rounded-full bg-gold text-gold-foreground hover:opacity-90 h-12 px-8 gap-2 font-medium"
              >
                <Zap className="h-4 w-4" />
                Buy now
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => requireAuth(() => wishlist.toggle.mutate(product.id))}
                className={cn(
                  "rounded-full h-12 w-12 p-0",
                  saved && "text-gold border-gold",
                )}
                aria-label="Save to wishlist"
              >
                <Heart className={cn("h-4 w-4", saved && "fill-current")} />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handleShare}
                className="rounded-full h-12 w-12 p-0"
                aria-label="Share product"
              >
                <Share2 className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handleCompare}
                className="rounded-full h-12 w-12 p-0"
                aria-label="Add to compare"
              >
                <GitCompare className="h-4 w-4" />
              </Button>
            </div>

            {needsSelection && (
              <p className="text-xs text-muted-foreground mt-3">
                Select {missingOption ?? "a variant"} to continue.
              </p>
            )}

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-3 gap-3 pt-6 border-t border-border/60">
              <TrustBadge icon={<Truck className="h-4 w-4" />} label="Free shipping" hint="Orders over NPR 5,000" />
              <TrustBadge icon={<ShieldCheck className="h-4 w-4" />} label="Secure payment" hint="COD & digital wallets" />
              <TrustBadge icon={<RotateCcw className="h-4 w-4" />} label="7-day returns" hint="Hassle-free" />
            </div>
          </div>
        </div>

        {/* Description & Specs */}
        <div className="grid md:grid-cols-2 gap-10 mt-16">
          {product.description && (
            <section>
              <h2 className="font-display text-3xl font-bold">About this product</h2>
              <div className="mt-4 text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </section>
          )}
          <section>
            <h2 className="font-display text-3xl font-bold">Specifications</h2>
            <dl className="mt-4 divide-y divide-border/60 border rounded-2xl overflow-hidden bg-card">
              <SpecRow label="Brand" value={product.brand?.name ?? "—"} />
              <SpecRow label="Category" value={product.category?.name ?? "—"} />
              <SpecRow label="SKU" value={effectiveSku ?? "—"} />
              {product.weight_grams != null && (
                <SpecRow label="Weight" value={`${product.weight_grams} g`} />
              )}
              {matchedVariant &&
                Object.entries(matchedVariant.options).map(([k, v]) => (
                  <SpecRow key={k} label={k} value={String(v)} />
                ))}
              <SpecRow
                label="Availability"
                value={outOfStock ? "Out of stock" : `${effectiveStock} in stock`}
              />
            </dl>
          </section>
        </div>

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

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-3 text-sm">
      <dt className="text-muted-foreground capitalize">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
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
