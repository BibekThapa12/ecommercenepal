import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, ShoppingBag, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reactify Commerce — Shop Premium Products in Nepal" },
      {
        name: "description",
        content:
          "Shop curated premium products across Nepal with daily flash sales. Pay with eSewa, Khalti, FonePay or Cash on Delivery.",
      },
      { property: "og:title", content: "Reactify Commerce — Shop Premium Products in Nepal" },
      { property: "og:description", content: "Daily flash sales and curated products across Nepal." },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  price_npr: number;
  compare_at_price_npr: number | null;
  is_flash_sale: boolean;
  flash_sale_ends_at: string | null;
  product_images: { url: string; alt_text: string | null; is_primary: boolean }[];
};

function formatNPR(n: number) {
  return `NPR ${new Intl.NumberFormat("en-IN").format(n)}`;
}

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = Math.max(0, new Date(target).getTime() - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Index() {
  const { user, isStaff } = useAuth();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["storefront-products"],
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, short_description, price_npr, compare_at_price_npr, is_flash_sale, flash_sale_ends_at, product_images(url, alt_text, is_primary)",
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const flashSales = useMemo(() => products.filter((p) => p.is_flash_sale), [products]);

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary shadow-elegant">
              <ShoppingBag className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold">Reactify</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">
                Commerce
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <UserMenu />
            ) : (
              <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 shadow-elegant">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-12">
        <FlashSaleSlider items={flashSales} loading={isLoading} />

        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">All Products</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {products.length} curated items
              </p>
            </div>
          </div>

          {isLoading ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FlashSaleSlider({ items, loading }: { items: ProductRow[]; loading: boolean }) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(id);
  }, [items.length]);

  const current = items[index];
  const countdown = useCountdown(current?.flash_sale_ends_at ?? null);

  if (loading) {
    return <div className="h-[380px] rounded-3xl bg-muted animate-pulse" />;
  }
  if (items.length === 0 || !current) return null;

  const img = current.product_images.find((i) => i.is_primary) ?? current.product_images[0];
  const discount =
    current.compare_at_price_npr && current.compare_at_price_npr > current.price_npr
      ? Math.round(
          ((current.compare_at_price_npr - current.price_npr) / current.compare_at_price_npr) * 100,
        )
      : null;

  return (
    <section className="relative">
      <div className="flex items-center gap-2 mb-4">
        <Badge className="bg-gradient-gold text-gold-foreground border-0 shadow-gold gap-1">
          <Flame className="h-3.5 w-3.5" /> Flash Sale
        </Badge>
        {countdown && (
          <span className="text-xs text-muted-foreground font-mono">Ends in {countdown}</span>
        )}
      </div>

      <div
        ref={trackRef}
        className="relative overflow-hidden rounded-3xl border bg-card shadow-elegant"
      >
        <div className="grid md:grid-cols-2 min-h-[380px]">
          <div className="relative bg-gradient-hero overflow-hidden">
            {img && (
              <img
                key={current.id}
                src={img.url}
                alt={img.alt_text ?? current.name}
                className="absolute inset-0 h-full w-full object-cover animate-fade-up"
                loading="eager"
              />
            )}
            {discount !== null && (
              <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground border-0">
                -{discount}%
              </Badge>
            )}
          </div>
          <div className="p-8 lg:p-12 flex flex-col justify-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Limited time offer
            </div>
            <h3 className="font-display text-3xl lg:text-4xl font-semibold mt-2">
              {current.name}
            </h3>
            {current.short_description && (
              <p className="text-muted-foreground mt-3 max-w-md">{current.short_description}</p>
            )}
            <div className="flex items-end gap-3 mt-6">
              <span className="text-3xl font-semibold">{formatNPR(current.price_npr)}</span>
              {current.compare_at_price_npr && (
                <span className="text-muted-foreground line-through">
                  {formatNPR(current.compare_at_price_npr)}
                </span>
              )}
            </div>
            <div className="mt-8 flex gap-3">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-elegant">
                Shop now
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <button
          aria-label="Previous"
          onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full glass border border-border/60 hover:bg-background transition-base"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          aria-label="Next"
          onClick={() => setIndex((i) => (i + 1) % items.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full glass border border-border/60 hover:bg-background transition-base"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: ProductRow }) {
  const img = product.product_images.find((i) => i.is_primary) ?? product.product_images[0];
  const discount =
    product.compare_at_price_npr && product.compare_at_price_npr > product.price_npr
      ? Math.round(
          ((product.compare_at_price_npr - product.price_npr) / product.compare_at_price_npr) * 100,
        )
      : null;

  return (
    <div className="group rounded-2xl border bg-card shadow-card overflow-hidden transition-base hover:shadow-elegant hover:-translate-y-0.5">
      <div className="aspect-square relative bg-muted overflow-hidden">
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
          <Badge className="absolute top-3 right-3 bg-gradient-gold text-gold-foreground border-0 gap-1">
            <Flame className="h-3 w-3" />
          </Badge>
        )}
      </div>
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
      </div>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card overflow-hidden">
          <div className="aspect-square bg-muted animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
