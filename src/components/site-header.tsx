import { Link } from "@tanstack/react-router";
import { ShoppingBag, ShoppingCart, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/use-commerce";

export function SiteHeader() {
  const { user } = useAuth();
  const cart = useCart();

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/40">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary shadow-elegant shrink-0">
            <ShoppingBag className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="font-display text-lg font-semibold">Reactify</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">
              Commerce
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {user && (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Wishlist" className="rounded-full">
                <Link to="/account/wishlist">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Cart"
                className="rounded-full relative"
              >
                <Link to="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cart.count > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 grid place-items-center rounded-full bg-primary text-primary-foreground border-0 text-[10px]">
                      {cart.count}
                    </Badge>
                  )}
                </Link>
              </Button>
            </>
          )}
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
  );
}
