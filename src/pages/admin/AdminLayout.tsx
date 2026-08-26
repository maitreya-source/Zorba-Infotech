import { useState, useEffect, useRef, Suspense } from "react";
import { NavLink, Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { playNotificationChime, useStaffDutyPresence } from "@/lib/realtimeSync";
import { toast } from "sonner";
import LoadingScreen from "@/components/common/LoadingScreen";
import StaffOnDutyBoard from "@/components/admin/StaffOnDutyBoard";
import {
  Activity,
  BarChart3,
  Users,
  Package,
  Layers,
  UserCheck,
  Building2,
  Truck,
  Database,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  ArrowLeft,
  MessageSquare,
  FileText,
  Briefcase,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { syncCustomerIndex, invalidateCustomersCache } from "@/lib/firestore";
import AvatarGraphic from "@/components/admin/AvatarGraphic";
import StaffProfileSelectorModal from "@/components/admin/StaffProfileSelectorModal";

const navItems = [
  { label: "Service Calls", to: "/admin/service-calls", icon: Activity },
  { label: "Quotations", to: "/admin/quotations", icon: FileText },
  { label: "Website Inquiries", to: "/admin/inquiries", icon: Inbox },
  { label: "Job Applications", to: "/admin/job-applications", icon: Briefcase },
  { label: "Daily/Monthly Reports", to: "/admin/reports", icon: BarChart3 },
  { label: "WhatsApp Templates", to: "/admin/whatsapp-templates", icon: MessageSquare },
  { label: "Team & Personnel", to: "/admin/team", icon: Users },
  { label: "Service Centers", to: "/admin/service-centers", icon: Building2 },
  { label: "Couriers & Logistics", to: "/admin/couriers", icon: Truck },
  { label: "Products", to: "/admin/products", icon: Package },
  { label: "Categories", to: "/admin/categories", icon: Layers },
  { label: "Customers", to: "/admin/customers", icon: UserCheck },
  { label: "Backup & Restore", to: "/admin/backup", icon: Database },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { activeProfile, showSelectorModal, setShowSelectorModal } = useStaffProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Real-time duty presence
  const { onlineStaff } = useStaffDutyPresence(activeProfile);

  // Real-time unread pending counts
  const [pendingInquiriesCount, setPendingInquiriesCount] = useState(0);
  const [pendingJobAppsCount, setPendingJobAppsCount] = useState(0);
  const isFirstLoadRef = useRef(true);

  // Sync customer index in background only for authenticated admin staff
  useEffect(() => {
    syncCustomerIndex();
  }, []);

  // Real-time unread pending counts listener
  useEffect(() => {
    // 1. Pending Inquiries
    const qInq = query(collection(db, "inquiries"), where("status", "==", "pending"));
    const unsubInq = onSnapshot(
      qInq,
      (snap) => {
        const nonJobDocs = snap.docs.filter(
          (d) => d.data().source !== "careers_page" && !d.data().message?.startsWith("[Job Application")
        );
        const count = nonJobDocs.length;
        if (!isFirstLoadRef.current && count > pendingInquiriesCount) {
          playNotificationChime();
          toast.info("🔔 New website customer inquiry received!");
        }
        setPendingInquiriesCount(count);
      },
      (err) => {
        console.warn("Inquiries unread snapshot warning:", err);
      }
    );

    // 2. Pending Job Applications
    const qJobs = query(collection(db, "job_applications"), where("status", "==", "pending"));
    const unsubJobs = onSnapshot(
      qJobs,
      (snap) => {
        const count = snap.size;
        if (!isFirstLoadRef.current && count > pendingJobAppsCount) {
          playNotificationChime();
          toast.info("💼 New career job application received!");
        }
        setPendingJobAppsCount(count);
        isFirstLoadRef.current = false;
      },
      (err) => {
        console.warn("Job applications unread snapshot warning:", err);
      }
    );

    return () => {
      unsubInq();
      unsubJobs();
    };
  }, []);

  const handleSignOut = async () => {
    invalidateCustomersCache();
    await signOut();
    navigate("/admin", { replace: true });
  };

  const activeNav = navItems.find((n) => location.pathname.startsWith(n.to))?.label || "Service Calls";

  const isServiceCallForm =
    location.pathname !== "/admin/service-calls" &&
    location.pathname.startsWith("/admin/service-calls");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar: Fixed Off-Canvas Drawer on Mobile, Static Rail on Desktop */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 h-screen flex shrink-0 flex-col bg-[#0F172A] text-slate-300 transition-all duration-300 print:hidden overflow-hidden select-none ${
          mobileSidebarOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-18" : "md:w-64"}`}
      >
        {/* Brand Header (Fixed - exact h-14 matching top bar and right rail) */}
        <div className="shrink-0 h-14 px-4 md:px-5 border-b border-slate-800/80 flex items-center justify-between">
          {!collapsed ? (
            <div>
              <h1 className="text-lg font-extrabold font-display tracking-tight text-white leading-tight">
                ZORBA
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Service & Catalog ERP</p>
            </div>
          ) : (
            <div className="mx-auto text-white font-extrabold text-lg">Z</div>
          )}

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors hidden md:block cursor-pointer"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Mobile Close Toggle */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 md:hidden transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Modules (Scrolls internally only if viewport is tiny) */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Core Modules
            </div>
          )}

          {navItems.map(({ label, to, icon: Icon }) => {
            const isJobNav = to === "/admin/job-applications";
            const isInqNav = to === "/admin/inquiries";
            const badgeCount = isJobNav ? pendingJobAppsCount : isInqNav ? pendingInquiriesCount : 0;

            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileSidebarOpen(false)}
                title={collapsed ? (badgeCount > 0 ? `${label} (${badgeCount} pending)` : label) : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl py-2.5 transition-all text-xs ${
                    collapsed ? "justify-center px-0" : "px-3"
                  } ${
                    isActive
                      ? "bg-slate-800/90 text-white font-bold border border-slate-700/80 shadow-xs"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium"
                  }`
                }
              >
                <div className="relative">
                  <Icon className="h-4 w-4 shrink-0 transition-colors group-hover:text-white" />
                  {collapsed && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                </div>

                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{label}</span>
                    {badgeCount > 0 ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold shadow-xs ${
                          isJobNav
                            ? "bg-blue-500/20 text-blue-300 border border-blue-400/40"
                            : "bg-rose-500/20 text-rose-300 border border-rose-400/40"
                        }`}
                      >
                        {badgeCount}
                      </span>
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity text-slate-500" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Unified Profile & Account Footer (Fixed at bottom) */}
        <div className="shrink-0 p-3 border-t border-slate-800/80 bg-slate-900/60 space-y-2.5">
          {/* Active Staff Profile Card (Click to Switch) */}
          <div
            onClick={() => {
              setShowSelectorModal(true);
              setMobileSidebarOpen(false);
            }}
            className={`group flex items-center gap-3 cursor-pointer rounded-2xl p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/80 transition-all duration-200 shadow-sm ${
              collapsed ? "justify-center p-1.5" : ""
            }`}
            title="Click to Switch Staff Profile"
          >
            <AvatarGraphic
              avatarId={activeProfile?.avatar || "penguin"}
              size={collapsed ? "sm" : "md"}
              showGlow={Boolean(activeProfile)}
            />

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                    {activeProfile?.name || "Select Profile"}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 capitalize truncate mt-0.5">
                  {activeProfile?.role ? `${activeProfile.role}` : "Who is working?"}
                </p>
              </div>
            )}
          </div>

          {/* Sign Out from Gmail Button */}
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors w-full cursor-pointer ${
              collapsed ? "justify-center" : "px-2 py-1"
            }`}
            title={`Sign out from Gmail (${user?.email || "Google Account"})`}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span className="truncate">Sign out from Gmail</span>}
          </button>
        </div>
      </aside>

      {/* Main Container Area with Fixed Top Navbar & Dedicated Scrollable Ticket Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Continuous Dark Navy Top Header Bar (h-14) */}
        <header className="shrink-0 h-14 flex items-center justify-between px-3 md:px-6 bg-[#0F172A] border-b border-slate-800/80 text-slate-300 z-10 print:hidden gap-2 md:gap-3">
          <div className="flex items-center gap-1.5 md:gap-2 text-xs text-slate-400 font-medium shrink-0 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden mr-0.5 cursor-pointer"
              aria-label="Open Menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-slate-400 hidden sm:inline">Admin</span>
            <span className="text-slate-600 hidden sm:inline">/</span>
            {isServiceCallForm ? (
              <>
                <Link to="/admin/service-calls" className="text-slate-300 hover:text-white transition-colors truncate hidden sm:inline">
                  Service Calls
                </Link>
                <span className="text-slate-600 hidden sm:inline">/</span>
                <span className="text-slate-300 truncate font-semibold">
                  {location.pathname.includes("/new") ? "New Service Call" : "Edit Ticket"}
                </span>
                <span id="admin-breadcrumb-ticket" className="inline-flex items-center ml-1" />
              </>
            ) : (
              <span className="font-bold text-white tracking-wide truncate">{activeNav}</span>
            )}
          </div>

          {/* Center: Dynamic Center Area for Service Call Type Chips */}
          <div id="admin-header-center" className="flex items-center justify-center flex-1 min-w-0 overflow-x-auto no-scrollbar" />

          {/* Right: Live Staff On Duty Board + Back Link */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Live Staff On Duty Pill */}
            <StaffOnDutyBoard onlineStaff={onlineStaff} />

            {isServiceCallForm ? (
              <Link
                to="/admin/service-calls"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 hover:text-white px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-slate-200 shadow-xs transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">Back to List</span>
                <span className="sm:hidden">List</span>
              </Link>
            ) : (
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 hover:text-white px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-slate-200 shadow-xs transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">Back to Main Website</span>
                <span className="sm:hidden">Website</span>
              </a>
            )}
          </div>
        </header>

        {/* Dedicated Independent Scrollable Ticket / Main Content Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950 p-2 sm:p-4 md:p-6 focus:outline-none">
          <Suspense fallback={<LoadingScreen fullScreen={false} title="Admin Workspace" subtitle="Loading view..." />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Attached Full-Height Right Action Sidebar Portal Target (Extends to Top of Page, h-screen on Desktop) */}
      <div id="admin-right-rail" className="h-screen shrink-0 empty:hidden print:hidden z-20 hidden xl:block" />

      {/* Mandatory Staff Profile Selector Modal */}
      <StaffProfileSelectorModal
        open={!activeProfile || showSelectorModal}
        onOpenChange={(next) => {
          if (!next && !activeProfile) {
            return;
          }
          setShowSelectorModal(next);
        }}
        canDismiss={Boolean(activeProfile)}
      />
    </div>
  );
}
