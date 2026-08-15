import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Users,
  Package,
  Layers,
  Folder,
  UserCheck,
  ShieldCheck,
  Building2,
  LogOut,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Service Calls", to: "/admin/service-calls", icon: Activity },
  { label: "Daily/Monthly Reports", to: "/admin/reports", icon: BarChart3 },
  { label: "Technicians", to: "/admin/technicians", icon: UserCheck },
  { label: "Back Office Staff", to: "/admin/staff", icon: ShieldCheck },
  { label: "Service Centers", to: "/admin/service-centers", icon: Building2 },
  { label: "Products", to: "/admin/products", icon: Package },
  { label: "Categories", to: "/admin/categories", icon: Layers },
  { label: "Customers", to: "/admin/customers", icon: Users },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin", { replace: true });
  };

  const activeNav = navItems.find((n) => location.pathname.startsWith(n.to))?.label || "Service Calls";

  const userInitial = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "MA";

  const userName = user?.displayName || (user?.email ? user.email.split("@")[0] : "Maitreya");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Fixed Non-scrollable Sidebar (Dark Navy #0F172A) */}
      <aside
        className={`h-screen flex shrink-0 flex-col bg-[#0F172A] text-slate-300 z-20 transition-all duration-300 print:hidden overflow-hidden select-none ${
          collapsed ? "w-18" : "w-64"
        }`}
      >
        {/* Brand Header (Fixed) */}
        <div className="shrink-0 p-6 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          {!collapsed ? (
            <div>
              <h1 className="text-xl font-extrabold font-display tracking-tight text-white">
                ZORBA
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Service & Catalog ERP</p>
            </div>
          ) : (
            <div className="mx-auto text-white font-extrabold text-lg">Z</div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors hidden md:block"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Modules (Scrolls internally only if viewport is tiny) */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Core Modules
            </div>
          )}

          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3.5 rounded-xl py-2.5 transition-all text-xs font-semibold ${
                  collapsed ? "justify-center px-0" : "px-3.5"
                } ${
                  isActive
                    ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/30 font-bold"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-[.bg-\[\#2563EB\]]:opacity-100 transition-opacity" />
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* User Profile Footer (Fixed at bottom) */}
        <div className="shrink-0 p-4 border-t border-slate-800/80 bg-slate-900/40 space-y-3">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-white font-extrabold text-xs shadow-sm shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-white leading-tight capitalize">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || "maitreya.mul@gmail.com"}</p>
              </div>
            </div>
          ) : (
            <div
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-white font-extrabold text-xs"
              title={user?.email || "Admin User"}
            >
              {userInitial}
            </div>
          )}

          <button
            onClick={handleSignOut}
            className={`flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors w-full ${
              collapsed ? "justify-center" : "px-1"
            }`}
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Container Area with Fixed Top Navbar & Dedicated Scrollable Ticket Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Fixed Top Header Bar */}
        <header className="shrink-0 h-14 flex items-center justify-between px-6 md:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 z-10 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md text-slate-600 hover:bg-slate-100 md:hidden mr-1"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span>Admin</span>
            <span>/</span>
            <span className="font-bold text-slate-900 dark:text-white">{activeNav}</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-colors"
            >
              <span>View Main Website</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>
          </div>
        </header>

        {/* Dedicated Independent Scrollable Ticket / Main Content Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950 p-6 md:p-8 focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
