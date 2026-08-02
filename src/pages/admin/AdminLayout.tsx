import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Tag,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Folder,
  Users,
  ExternalLink,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { label: "Service Calls", to: "/admin/service-calls", icon: Wrench },
  { label: "Daily/Monthly Reports", to: "/admin/reports", icon: BarChart3 },
  { label: "Technicians", to: "/admin/technicians", icon: UserCheck },
  { label: "Products", to: "/admin/products", icon: LayoutGrid },
  { label: "Categories", to: "/admin/categories", icon: Tag },
  { label: "Device Categories", to: "/admin/device-categories", icon: Folder },
  { label: "Customers", to: "/admin/customers", icon: Users },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Collapsed BY DEFAULT as requested
  const [collapsed, setCollapsed] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin", { replace: true });
  };

  const activeNav = navItems.find((n) => location.pathname.startsWith(n.to))?.label || "Admin";

  return (
    <div className="flex min-h-screen bg-slate-950/5 dark:bg-slate-950 text-foreground">
      {/* Collapsible Sidebar - Default Collapsed (w-16) (Hidden during print) */}
      <aside
        className={`flex shrink-0 flex-col border-r border-slate-200/80 dark:border-slate-800 bg-card/90 backdrop-blur-xl shadow-xl z-20 transition-all duration-300 print:hidden ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 p-3 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
          <div className="flex items-center gap-3 overflow-hidden">
            {!collapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5 font-bold font-display text-sm tracking-tight text-foreground">
                  ZORBA <span className="text-primary font-mono text-xs">ADMIN</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium truncate">Service & Catalog ERP</p>
              </div>
            )}
          </div>

          {/* Toggle Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0 ${collapsed ? "mx-auto" : ""}`}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation - Icon only when collapsed */}
        <nav className="flex-1 space-y-2 p-2 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Core Modules
            </div>
          )}
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl py-2.5 transition-all duration-200 ${
                  collapsed ? "justify-center px-0" : "px-3.5"
                } ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 font-bold"
                    : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-xs font-semibold truncate">{label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="border-t border-slate-200/80 dark:border-slate-800 p-2 bg-muted/20">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 rounded-xl p-2 bg-card/60 border mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 shrink-0">
                  {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "AD"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate text-foreground leading-tight">
                    {user?.displayName || "Admin User"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email || "admin@zorbainfotech.com"}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20"
                title={user?.email || "Admin User"}
              >
                {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "AD"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar (Hidden during print) */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-card/80 backdrop-blur-md px-6 shadow-sm print:hidden">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-7 w-7 p-0 mr-1 text-muted-foreground hover:text-foreground md:hidden"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
            <span>Admin</span>
            <span>/</span>
            <span className="font-bold text-foreground">{activeNav}</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <span>View Main Website</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </header>

        {/* Outlet View */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
