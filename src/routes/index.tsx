import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { formatNPR } from "@/lib/commerce";

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

type ProductRow = ProductCardData & {
  flash_sale_ends_at: string | null;
};

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
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["storefront-products"],
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, short_description, price_npr, compare_at_price_npr, stock_quantity, is_flash_sale, flash_sale_ends_at, product_images(url, alt_text, is_primary)",
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
      <SiteHeader />

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

      <div ref={trackRef} className="relative overflow-hidden rounded-3xl border bg-card shadow-elegant">
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
            <h3 className="font-display text-3xl lg:text-4xl font-semibold mt-2">{current.name}</h3>
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
