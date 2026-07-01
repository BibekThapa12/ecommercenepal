import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { formatNPR } from "@/lib/commerce";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReactifyStore — Shop the Future of Tech" },
      {
        name: "description",
        content:
          "Premium merchandise, developer tools, and tech gear — curated by engineers, built for everyone.",
      },
      { property: "og:title", content: "ReactifyStore — Shop the Future of Tech" },
      { property: "og:description", content: "Curated tech, dev tools, and merch — shipped across Nepal." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

type ProductRow = ProductCardData & {
  flash_sale_ends_at: string | null;
  category_id: string | null;
  stock_quantity: number;
};

type Category = { id: string; name: string; slug: string; description: string | null };

const CATEGORY_IMAGES: Record<string, string> = {
  electronics: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
  clothing: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
  accessories: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
  "home-living": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
  "beauty-wellness": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
};

function Index() {
  const { data: categories = [] } = useQuery({
    queryKey: ["storefront-categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["storefront-products"],
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, short_description, price_npr, compare_at_price_npr, stock_quantity, is_flash_sale, flash_sale_ends_at, category_id, product_images(url, alt_text, is_primary)",
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const featured = useMemo(() => products.slice(0, 6), [products]);
  const heroProduct = products[0];
  const heroImg = heroProduct?.product_images.find((i) => i.is_primary) ?? heroProduct?.product_images[0];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 sm:px-6 pt-12 lg:pt-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Reactify Software Technologies
              </div>
              <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-black leading-[0.95] mt-6 tracking-tight">
                Shop the
                <br />
                <span className="text-gold italic font-semibold">Future</span> of
                <br />
                Tech<span className="text-gold">.</span>
              </h1>
              <p className="text-muted-foreground mt-6 max-w-md text-base leading-relaxed">
                Premium merchandise, developer tools, and tech gear — curated by engineers, built for
                everyone.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-8">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-12 px-7 gap-2 font-medium"
                >
                  <Link to="/products">
                    Browse Catalog <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="rounded-full h-12 px-6 font-medium"
                >
                  <Link to="/products">New Arrivals</Link>
                </Button>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-elegant bg-gradient-hero">
                {heroImg ? (
                  <img
                    src={heroImg.url}
                    alt={heroImg.alt_text ?? heroProduct?.name ?? "Featured"}
                    className="h-full w-full object-cover"
                  />
                ) : null}

                {heroProduct && (
                  <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs glass rounded-2xl p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                        Just Restocked
                      </div>
                      <div className="font-display text-lg leading-tight truncate">{heroProduct.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="h-2.5 w-2.5 fill-gold text-gold" />
                          ))}
                        </div>
                        <span className="font-display font-bold text-sm">
                          {formatNPR(heroProduct.price_npr)}
                        </span>
                      </div>
                    </div>
                    <Button asChild size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90 shrink-0">
                      <Link to="/products">View</Link>
                    </Button>
                  </div>
                )}

                <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur px-3 py-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  In Stock
                </div>
              </div>

              <div className="hidden sm:grid grid-cols-3 gap-3 mt-4">
                {[
                  { k: "Products", v: "2,400+" },
                  { k: "Orders Shipped", v: "12,000+" },
                  { k: "Avg Rating", v: "4.8 ★" },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl border border-border/60 bg-card px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      {s.k}
                    </div>
                    <div className="font-display text-xl font-bold mt-0.5">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="container mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Browse by Category
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-bold mt-2">Find Your Gear</h2>
            </div>
            <Link
              to="/products"
              className="text-sm text-muted-foreground hover:text-foreground transition-base"
            >
              All categories →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                to="/products"
                search={{ category: c.slug } as never}
                className="group relative aspect-square rounded-3xl overflow-hidden border border-border/60"
              >
                <img
                  src={CATEGORY_IMAGES[c.slug] ?? CATEGORY_IMAGES.electronics}
                  alt={c.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="font-display text-xl font-bold text-background">{c.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="container mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Hand-picked for You
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-bold mt-2">Featured Products</h2>
            </div>
            <Link
              to="/products"
              className="text-sm text-muted-foreground hover:text-foreground transition-base"
            >
              View all →
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-3xl border border-border/60 bg-card overflow-hidden">
                  <div className="aspect-[4/3] bg-muted animate-pulse" />
                  <div className="p-5 space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  badge={
                    i === 0
                      ? "Best Seller"
                      : p.is_flash_sale
                        ? "Hot"
                        : p.compare_at_price_npr
                          ? "Sale"
                          : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="container mx-auto px-4 sm:px-6 py-16">
          <div className="mb-8">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              What Customers Say
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mt-2">Real Reviews</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: "Aayush K.",
                place: "Kathmandu",
                text: "Fast delivery and the packaging felt premium. Mechanical keyboard is a dream.",
              },
              {
                name: "Sneha R.",
                place: "Pokhara",
                text: "Loved the noise-cancelling headset. Support team helped with COD hassle-free.",
              },
              {
                name: "Bikash T.",
                place: "Biratnagar",
                text: "Prices are fair and the site is beautiful. Will keep buying my dev gear here.",
              },
            ].map((r) => (
              <div key={r.name} className="rounded-3xl border border-border/60 bg-card p-6">
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-foreground/80 leading-relaxed">"{r.text}"</p>
                <div className="mt-4 text-sm">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-muted-foreground text-xs">{r.place}, Nepal</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
