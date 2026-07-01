import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, ShoppingCart, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/lib/auth";
import { useCart, useWishlist } from "@/lib/use-commerce";

export function SiteHeader() {
  const { user } = useAuth();
  const cart = useCart();
  const wishlist = useWishlist();

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-4 h-20 px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-gold rotate-45 shadow-gold">
            <ShoppingBag className="h-4 w-4 text-gold-foreground -rotate-45" />
          </div>
          <div className="font-display text-2xl leading-none tracking-tight">
            <span className="text-foreground">Reactify</span>
            <span className="text-gold">Store</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center justify-center gap-10 text-sm font-medium">
          <Link to="/" className="text-foreground/80 hover:text-foreground transition-base [&.active]:text-foreground">
            Home
          </Link>
          <Link to="/products" className="text-foreground/80 hover:text-foreground transition-base [&.active]:text-foreground">
            Products
          </Link>
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-self-end">
          <Button variant="ghost" size="icon" aria-label="Search" className="rounded-full">
            <Search className="h-4.5 w-4.5" />
          </Button>
          {user && (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Wishlist" className="rounded-full relative">
                <Link to="/account/wishlist">
                  <Heart className="h-4.5 w-4.5" />
                  {wishlist.ids.size > 0 && (
                    <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 grid place-items-center rounded-full bg-gold text-gold-foreground border-0 text-[10px] font-semibold">
                      {wishlist.ids.size}
                    </Badge>
                  )}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Cart" className="rounded-full relative">
                <Link to="/cart">
                  <ShoppingCart className="h-4.5 w-4.5" />
                  {cart.count > 0 && (
                    <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 grid place-items-center rounded-full bg-gold text-gold-foreground border-0 text-[10px] font-semibold">
                      {cart.count}
                    </Badge>
                  )}
                </Link>
              </Button>
            </>
          )}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {user ? (
            <div className="flex items-center gap-2 ml-1">
              <UserMenu />
              <Button asChild className="hidden sm:inline-flex rounded-full bg-foreground text-background hover:bg-foreground/90 h-10 px-5 font-medium">
                <Link to="/products">Shop Now</Link>
              </Button>
            </div>
          ) : (
            <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-10 px-5 font-medium ml-1">
              <Link to="/auth">Shop Now</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
