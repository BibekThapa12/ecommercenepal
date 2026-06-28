import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Banknote,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reactify Commerce — Premium Online Shopping in Nepal" },
      {
        name: "description",
        content:
          "Curated premium shopping across Nepal. Fast delivery to all 7 provinces, secure checkout with eSewa, Khalti, FonePay and Cash on Delivery.",
      },
      { property: "og:title", content: "Reactify Commerce — Premium Online Shopping in Nepal" },
      { property: "og:description", content: "Curated premium shopping across Nepal with eSewa, Khalti, FonePay and COD." },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Reactify Software Technologies Pvt. Ltd.",
          url: "/",
          description: "Premium e-commerce platform for Nepal.",
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, isStaff } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary shadow-elegant">
              <ShoppingBag className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold">Reactify</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">Commerce</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#featured" className="hover:text-foreground transition-base">Featured</a>
            <a href="#categories" className="hover:text-foreground transition-base">Categories</a>
            <a href="#why" className="hover:text-foreground transition-base">Why us</a>
            <a href="#about" className="hover:text-foreground transition-base">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                {isStaff && (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/admin">Admin</Link>
                  </Button>
                )}
                <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 shadow-elegant">
                  <Link to="/">Account</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 shadow-elegant">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container mx-auto px-4 py-24 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <Badge variant="secondary" className="mb-5 gap-1.5 rounded-full px-3 py-1 border border-border/60 bg-card/60">
              <Sparkles className="h-3 w-3 text-gold" /> Crafted for Nepal
            </Badge>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
              Premium shopping,<br />
              <span className="text-gradient-primary">delivered to your door.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              A curated marketplace built for Nepal — from Kathmandu to Karnali. Pay with eSewa, Khalti, FonePay, or Cash on Delivery.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-elegant gap-2">
                Start shopping <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">Explore categories</Button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                  ))}
                </div>
                <span>Trusted by thousands</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-border" />
              <div className="hidden sm:block">7 provinces · same-day in valley</div>
            </div>
          </div>

          {/* Visual showcase card */}
          <div className="relative animate-fade-up">
            <div className="aspect-[4/5] rounded-3xl bg-gradient-primary p-1 shadow-elegant">
              <div className="h-full w-full rounded-[calc(theme(borderRadius.3xl)-4px)] bg-card relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-hero opacity-50" />
                <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
                  <Badge className="bg-gradient-gold text-gold-foreground border-0 shadow-gold">Flash Sale</Badge>
                  <Badge variant="secondary" className="glass">Ends in 02:14:33</Badge>
                </div>
                <div className="absolute bottom-6 left-6 right-6 glass rounded-2xl p-5">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Limited Edition</div>
                  <div className="font-display text-2xl font-semibold mt-1">Heritage Collection</div>
                  <div className="flex items-end justify-between mt-3">
                    <div>
                      <div className="text-2xl font-semibold">NPR 12,499</div>
                      <div className="text-xs text-muted-foreground line-through">NPR 16,999</div>
                    </div>
                    <Button size="sm" className="bg-gradient-primary hover:opacity-90">Shop now</Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-gradient-gold opacity-40 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Value props */}
      <section id="why" className="container mx-auto px-4 py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Truck, title: "Fast Delivery", text: "Same-day in Kathmandu valley. 1–5 days nationwide." },
            { icon: Banknote, title: "Pay Your Way", text: "eSewa, Khalti, FonePay, IME Pay, or Cash on Delivery." },
            { icon: ShieldCheck, title: "Buyer Protected", text: "Easy returns. Refunds processed within 7 days." },
            { icon: Sparkles, title: "Curated Quality", text: "Every brand and product is vetted before listing." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card shadow-card p-6 transition-base hover:shadow-elegant hover:-translate-y-0.5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary shadow-elegant">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="font-display text-lg font-semibold mt-4">{f.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="container mx-auto px-4 pb-24">
        <div className="rounded-3xl bg-gradient-primary p-10 lg:p-16 shadow-elegant relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
          <div className="relative max-w-2xl text-primary-foreground">
            <h2 className="font-display text-3xl lg:text-5xl font-semibold leading-tight">
              Built in Nepal. Built for Nepal.
            </h2>
            <p className="mt-4 text-primary-foreground/85 text-lg">
              Reactify Commerce is a flagship product of Reactify Software Technologies Pvt. Ltd. — a modern, secure, and locally-aware e-commerce platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="secondary" className="shadow-elegant">Create your account</Button>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                Browse the store
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/40">
        <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary">
                <ShoppingBag className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="font-display text-lg font-semibold">Reactify Commerce</div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 max-w-xs">
              A product of Reactify Software Technologies Pvt. Ltd. — Kathmandu, Nepal.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Shop</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>New Arrivals</li><li>Best Sellers</li><li>Flash Sales</li><li>Categories</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Support</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Help Center</li><li>Returns</li><li>Shipping</li><li>Contact</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Legal</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Privacy Policy</li><li>Terms of Service</li><li>VAT & PAN Info</li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="container mx-auto px-4 py-5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Reactify Software Technologies Pvt. Ltd. All rights reserved.</span>
            <span>NPR · Made with care in Nepal 🇳🇵</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
