import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Heart, MapPin, Package, User as UserIcon, ShoppingBag } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "My Account — Reactify Commerce" }, { name: "robots", content: "noindex" }] }),
  component: AccountLayout,
});

const NAV = [
  { to: "/account/orders", label: "Orders", icon: Package },
  { to: "/account/wishlist", label: "Wishlist", icon: Heart },
  { to: "/account/addresses", label: "Addresses", icon: MapPin },
  { to: "/account/profile", label: "Profile", icon: UserIcon },
] as const;

function AccountLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">My Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your orders, saved items, and delivery addresses.
          </p>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="rounded-2xl border bg-card p-2 shadow-card flex lg:flex-col gap-1 overflow-x-auto">
              {NAV.map((item) => {
                const active = path.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-base whitespace-nowrap",
                      active
                        ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                to="/"
                className="hidden lg:flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-base mt-2 border-t pt-3"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                Continue shopping
              </Link>
            </nav>
          </aside>

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
