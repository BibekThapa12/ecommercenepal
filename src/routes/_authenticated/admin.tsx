import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  LogOut,
  ShoppingBag,
} from "lucide-react";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin — Reactify Commerce" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

type AdminNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  exact?: boolean;
};

const navGroups: { label: string; items: AdminNavItem[] }[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", url: "/admin/products", icon: Package },
      { title: "Categories", url: "/admin/categories", icon: FolderTree },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
      { title: "Customers", url: "/admin/customers", icon: Users },
    ],
  },
];

function AdminLayout() {
  const { user, isStaff, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  // Guard: must be staff or above. Customers bounce home.
  if (user && !isStaff) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-3xl">Access restricted</h1>
          <p className="text-muted-foreground">
            Your account doesn't have permission to access the admin area. Contact your
            administrator if this is unexpected.
          </p>
          <Button onClick={() => navigate({ to: "/" })}>Back to store</Button>
        </div>
      </div>
    );
  }

  const initials =
    (user?.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "U";

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/40">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <Link to="/admin" className="flex items-center gap-2 px-2 py-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary shadow-elegant shrink-0">
                <ShoppingBag className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="font-display text-sm font-semibold">Reactify</span>
                <span className="text-xs text-muted-foreground">Admin Console</span>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = item.exact ? path === item.url : path.startsWith(item.url);
                      return (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                            <Link to={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          <SidebarFooter>
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
          <header className="h-14 flex items-center gap-3 border-b bg-card/60 backdrop-blur px-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
            <ThemeToggle />
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </header>
          <main className="flex-1 p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
