import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  LogOut,
  Terminal,
  BarChart3,
  FileText,
  CreditCard,
  Receipt,
  Tag,
  Boxes,
  CalendarCheck,
  Star,
  TicketPercent,
  ShoppingBasket,
  MessageSquare,
  Settings,
  Activity,
  Search,
  Bell,
  Palette,
} from "lucide-react";
import { useEffect } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin Console — Reactify Commerce" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

type AdminNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
  exact?: boolean;
  soon?: boolean;
};

const navGroups: { label: string; items: AdminNavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Orders & Sales",
    items: [
      { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
      { title: "Draft Orders", url: "/admin/draft-orders", icon: FileText },
      { title: "Payments", url: "/admin/payments", icon: CreditCard },
      { title: "Invoices", url: "/admin/invoices", icon: Receipt },
    ],
  },
  {
    label: "Catalog & Inventory",
    items: [
      { title: "Products", url: "/admin/products", icon: Package },
      { title: "Categories", url: "/admin/categories", icon: FolderTree },
      { title: "Brands", url: "/admin/brands", icon: Tag },
      { title: "Inventory", url: "/admin/inventory", icon: Boxes },
      { title: "Reservations", url: "/admin/reservations", icon: CalendarCheck },
    ],
  },
  {
    label: "Customers & Promotions",
    items: [
      { title: "Customers Directory", url: "/admin/customers", icon: Users },
      { title: "Product Reviews", url: "/admin/reviews", icon: Star },
      { title: "Coupons & Discounts", url: "/admin/coupons", icon: TicketPercent },
      { title: "Abandoned Carts", url: "/admin/abandoned-carts", icon: ShoppingBasket },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Customer Inquiries", url: "/admin/inquiries", icon: MessageSquare },
      { title: "Store Settings", url: "/admin/settings", icon: Settings },
      { title: "System Logs", url: "/admin/logs", icon: Activity },
    ],
  },
];


function AdminLayout() {
  const { user, isStaff, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Force dark theme inside admin console for the reference look.
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!wasDark) root.classList.remove("dark");
    };
  }, []);

  if (loading) return <div className="min-h-screen bg-background" />;

  if (user && !isStaff) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-3xl">Access restricted</h1>
          <p className="text-muted-foreground">
            Your account doesn't have permission to access the admin area.
          </p>
          <Button onClick={() => navigate({ to: "/" })}>Back to store</Button>
        </div>
      </div>
    );
  }

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "Admin User";
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground admin-shell">
        <Sidebar collapsible="icon" className="border-r border-border/40">
          <SidebarHeader className="border-b border-border/40 pb-3">
            <Link to="/admin" className="flex items-center gap-2.5 px-2 py-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-gold shadow-gold shrink-0">
                <Terminal className="h-5 w-5 text-gold-foreground" />
              </div>
              <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="font-display text-base font-semibold tracking-tight">
                  Reactify Admin
                </span>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Console
                </span>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent className="gap-1 py-2">
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = !item.soon && (item.exact ? path === item.url : path.startsWith(item.url));
                      const content = (
                        <>
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge className="h-5 px-1.5 text-[10px] bg-gold text-gold-foreground border-0">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      );
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={item.title}
                            className="data-[active=true]:bg-gold/15 data-[active=true]:text-gold data-[active=true]:font-medium"
                          >
                            {item.soon ? (
                              <a
                                href={item.url}
                                onClick={(e) => {
                                  e.preventDefault();
                                  toast.info(`${item.title} — coming soon`);
                                }}
                                className="opacity-70"
                              >
                                {content}
                              </a>
                            ) : (
                              <Link to={item.url}>{content}</Link>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          <SidebarFooter className="border-t border-border/40">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip="Sign out">
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center gap-3 border-b border-border/40 bg-card/40 backdrop-blur px-4 lg:px-6 sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="hidden sm:flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-gold" />
              Admin Panel
            </div>
            <div className="flex-1 flex justify-center max-w-xl mx-auto">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, products, customers…"
                  className="pl-9 h-9 bg-muted/40 border-border/60 rounded-full"
                />
              </div>
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative">
              <Palette className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Button>
            <div className="flex items-center gap-2 pl-2 border-l border-border/40 ml-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-gold text-gold-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col leading-tight">
                <span className="text-xs text-muted-foreground">Signed in</span>
                <span className="text-sm font-medium">{displayName}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
