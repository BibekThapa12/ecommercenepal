import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ProductsSearch = { category?: string };

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "All Products — ReactifyStore" },
      {
        name: "description",
        content: "Browse premium electronics, dev tools, and merchandise curated by Reactify.",
      },
      { property: "og:title", content: "All Products — ReactifyStore" },
      { property: "og:description", content: "Browse premium tech gear and merch on ReactifyStore." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ProductsSearch => ({
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  component: ProductsPage,
});

type ProductRow = ProductCardData & {
  category_id: string | null;
  stock_quantity: number;
};

type Category = { id: string; name: string; slug: string };

function ProductsPage() {
  const { category: catSlug } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(50000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<"newest" | "price-asc" | "price-desc">("newest");

  const { data: categories = [] } = useQuery({
    queryKey: ["storefront-categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
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
          "id, slug, name, short_description, price_npr, compare_at_price_npr, stock_quantity, is_flash_sale, category_id, product_images(url, alt_text, is_primary)",
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === catSlug) ?? null,
    [categories, catSlug],
  );

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory) list = list.filter((p) => p.category_id === activeCategory.id);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    list = list.filter((p) => p.price_npr >= minPrice && p.price_npr <= maxPrice);
    if (inStockOnly) list = list.filter((p) => p.stock_quantity > 0);
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price_npr - b.price_npr);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price_npr - a.price_npr);
    return list;
  }, [products, activeCategory, query, minPrice, maxPrice, inStockOnly, sort]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Products</span>
          {activeCategory && (
            <>
              <span className="mx-2">/</span>
              <span className="text-foreground">{activeCategory.name}</span>
            </>
          )}
        </div>

        <div className="flex items-end justify-between flex-wrap gap-4 mt-4">
          <div>
            <h1 className="font-display text-5xl sm:text-6xl font-black tracking-tight">
              {activeCategory ? activeCategory.name : "All Products"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">{filtered.length} products found</p>
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-10 rounded-full border border-border bg-card px-4 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8 mt-8">
          {/* Sidebar */}
          <aside className="space-y-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                className="pl-10 h-11 rounded-full bg-card"
              />
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">
                Category
              </div>
              <div className="space-y-1">
                <Link
                  to="/products"
                  className={cn(
                    "block px-4 py-2.5 rounded-full text-sm transition-base",
                    !activeCategory
                      ? "bg-foreground text-background font-medium"
                      : "hover:bg-accent",
                  )}
                >
                  All
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to="/products"
                    search={{ category: c.slug }}
                    className={cn(
                      "block px-4 py-2.5 rounded-full text-sm transition-base",
                      activeCategory?.id === c.id
                        ? "bg-foreground text-background font-medium"
                        : "hover:bg-accent",
                    )}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">
                Price Range
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                  className="h-10 rounded-full bg-card text-sm"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
                  className="h-10 rounded-full bg-card text-sm"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>₹{minPrice}</span>
                <span>₹{maxPrice}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">In Stock Only</span>
              <Switch checked={inStockOnly} onCheckedChange={setInStockOnly} />
            </div>
          </aside>

          {/* Grid */}
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-3xl border border-border/60 bg-card overflow-hidden">
                    <div className="aspect-4/3 bg-muted animate-pulse" />
                    <div className="p-5 space-y-2">
                      <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground border border-dashed rounded-3xl">
                No products match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    badge={
                      p.stock_quantity === 0
                        ? undefined
                        : i === 0
                          ? "Best Seller"
                          : p.is_flash_sale
                            ? "Hot"
                            : p.compare_at_price_npr
                              ? `${Math.round(((p.compare_at_price_npr - p.price_npr) / p.compare_at_price_npr) * 100)}% Off`
                              : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
