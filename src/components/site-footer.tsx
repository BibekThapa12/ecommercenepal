import { Link } from "@tanstack/react-router";
import { Globe, Mail, ShoppingBag } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="container mx-auto px-4 sm:px-6 py-8 flex flex-wrap items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-gold rotate-45 shadow-gold">
            <ShoppingBag className="h-3.5 w-3.5 text-gold-foreground -rotate-45" />
          </div>
          <div className="font-display text-xl leading-none tracking-tight">
            <span className="text-foreground">Reactify</span>
            <span className="text-gold">Store</span>
          </div>
        </Link>

        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/products" className="hover:text-foreground transition-base">Products</Link>
          <a href="#" className="hover:text-foreground transition-base">Privacy</a>
          <a href="#" className="hover:text-foreground transition-base">Terms</a>
          <a href="#" className="hover:text-foreground transition-base">Support</a>
        </nav>

        <div className="flex items-center gap-3 text-muted-foreground">
          <Globe className="h-4 w-4" />
          <Mail className="h-4 w-4" />
          <span className="text-sm">© {new Date().getFullYear()} Reactify</span>
        </div>
      </div>
    </footer>
  );
}
