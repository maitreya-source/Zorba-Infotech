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
  RefreshCw,
  Search,
  Keyboard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { syncCustomerIndex, invalidateCustomersCache } from "@/lib/firestore";
import AvatarGraphic from "@/components/admin/AvatarGraphic";
import StaffProfileSelectorModal from "@/components/admin/StaffProfileSelectorModal";
import GlobalAdminSearchModal from "@/components/admin/GlobalAdminSearchModal";
import ShortcutsHelpModal from "@/components/admin/ShortcutsHelpModal";
import { useTallyGlobalNavigation } from "@/hooks/useTallyKeyboard";

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
  { label: "Tally Live Sync", to: "/admin/tally-sync", icon: RefreshCw },
  { label: "Backup & Restore", to: "/admin/backup", icon: Database },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { activeProfile, showSelectorModal, setShowSelectorModal } = useStaffProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [desktopCollapsed, setDesktopCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 768 && window.innerWidth < 1280
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Auto-collapse sidebar rail only on squeezed desktop/tablet screens (768px <= width < 1280px).
  // Mobile drawer (< 768px) is NEVER collapsed so counter staff see full labels and actions.
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (window.innerWidth >= 768 && window.innerWidth < 1280) {
        setDesktopCollapsed(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // A sidebar is only ever rendered in collapsed (icon-only) mode on DESKTOP/TABLET rail, NEVER in the mobile drawer!
  const isCollapsed = !isMobile && desktopCollapsed;

  // Tally-style global navigation chords (G -> S, G -> Q, Alt+G), Omnisearch (Ctrl+K, /), and Shortcuts (?)
  const { isChordActive, cancelChord } = useTallyGlobalNavigation({
    onOpenSearch: () => setShowSearchModal(true),
    onOpenShortcuts: () => setShowShortcutsModal(true),
  });

  // Escape key to close mobile sidebar drawer if open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileSidebarOpen) {
        e.preventDefault();
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileSidebarOpen]);

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

  // Lock document-level scrolling so wheel/touch scrolls only internal containers, and strictly anchor window to (0, 0)
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    document.documentElement.classList.add("admin-viewport-locked");
    document.body.classList.add("admin-viewport-locked");

    const forceZeroScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
      if (document.documentElement.scrollTop !== 0 || document.documentElement.scrollLeft !== 0) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      if (document.body.scrollTop !== 0 || document.body.scrollLeft !== 0) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }
    };

    window.addEventListener("scroll", forceZeroScroll, { passive: true });

    // Intercept wheel events on outer layout chrome (header, rails, frames) to prevent window scroll displacement
    const handleWindowWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const scrollable = target.closest("main, aside, [role='dialog'], [data-radix-portal], .overflow-y-auto");
      if (!scrollable) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleWindowWheel, { passive: false });

    return () => {
      document.documentElement.classList.remove("admin-viewport-locked");
      document.body.classList.remove("admin-viewport-locked");
      window.removeEventListener("scroll", forceZeroScroll);
      window.removeEventListener("wheel", handleWindowWheel);
    };
  }, []);

  // Ensure window position resets to top on every route navigation
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  const handleSignOut = async () => {
    invalidateCustomersCache();
    await signOut();
    navigate("/admin", { replace: true });
  };

  const activeNav = navItems.find((n) => location.pathname.startsWith(n.to))?.label || "Service Calls";

  const isServiceCallForm =
    location.pathname !== "/admin/service-calls" &&
    location.pathname.startsWith("/admin/service-calls");

  const isQuotationForm =
    location.pathname !== "/admin/quotations" &&
    location.pathname.startsWith("/admin/quotations");

  return (
    <div data-admin-layout className="fixed inset-0 flex overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar: Fixed Off-Canvas Drawer on Mobile, Static Rail on Desktop */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 h-full flex shrink-0 flex-col bg-[#0F172A] text-slate-300 transition-all duration-300 print:hidden overflow-hidden select-none ${
          mobileSidebarOpen ? "translate-x-0 w-72 max-w-[85vw] shadow-2xl" : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "md:w-18" : "md:w-64"}`}
      >
        {/* Brand Header (Fixed - exact h-14 matching top bar and right rail) */}
        <div className="shrink-0 h-14 px-4 md:px-5 border-b border-slate-800/80 flex items-center justify-between">
          {!isCollapsed ? (
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
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors hidden md:block cursor-pointer"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
          {!isCollapsed && (
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
                title={isCollapsed ? (badgeCount > 0 ? `${label} (${badgeCount} pending)` : label) : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl py-2.5 transition-all text-xs ${
                    isCollapsed ? "justify-center px-0" : "px-3"
                  } ${
                    isActive
                      ? "bg-slate-800/90 text-white font-bold border border-slate-700/80 shadow-xs"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium"
                  }`
                }
              >
                <div className="relative">
                  <Icon className="h-4 w-4 shrink-0 transition-colors group-hover:text-white" />
                  {isCollapsed && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                </div>

                {!isCollapsed && (
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
              isCollapsed ? "justify-center p-1.5" : ""
            }`}
            title="Click to Switch Staff Profile"
          >
            <AvatarGraphic
              avatarId={activeProfile?.avatar || "penguin"}
              size={isCollapsed ? "sm" : "md"}
              showGlow={Boolean(activeProfile)}
            />

            {!isCollapsed && (
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
              isCollapsed ? "justify-center" : "px-2 py-1"
            }`}
            title={`Sign out from Gmail (${user?.email || "Google Account"})`}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && <span className="truncate">Sign out from Gmail</span>}
          </button>
        </div>
      </aside>

      {/* Main Container Area with Fixed Top Navbar & Dedicated Scrollable Ticket Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
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
            ) : isQuotationForm ? (
              <>
                <Link to="/admin/quotations" className="text-slate-300 hover:text-white transition-colors truncate hidden sm:inline">
                  Quotations
                </Link>
                <span className="text-slate-600 hidden sm:inline">/</span>
                <span className="text-slate-300 truncate font-semibold">
                  {location.pathname.includes("/new") ? "New Quotation" : "Edit Quotation"}
                </span>
                <span id="admin-breadcrumb-ticket" className="inline-flex items-center ml-1" />
              </>
            ) : (
              <span className="font-bold text-white tracking-wide truncate">{activeNav}</span>
            )}
          </div>

          {/* Center: Dynamic Center Area for Service Call Type Chips */}
          <div id="admin-header-center" className="flex items-center justify-center flex-1 min-w-0 overflow-x-auto no-scrollbar" />

          {/* Right: Search + Shortcuts + Live Staff On Duty Board + Back Link */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 pr-1 sm:pr-3">
            {/* Global Omnisearch Trigger - 3rd priority: hidden on smaller screens */}
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="h-9 hidden lg:inline-flex items-center gap-2 px-3 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 hover:text-white text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-xs"
              title="Search Tickets, Customers & Models (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden xl:inline">Search...</span>
              <kbd className="hidden 2xl:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-900/60 text-slate-400 rounded border border-slate-700/60">
                Ctrl K
              </kbd>
            </button>

            {/* Keyboard Shortcuts Trigger - 2nd lowest priority: hidden on screens < 2xl when on forms, < xl otherwise */}
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className={`h-9 items-center gap-1.5 px-3 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 hover:text-white text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-xs ${
                isServiceCallForm || isQuotationForm ? "hidden 2xl:inline-flex" : "hidden xl:inline-flex"
              }`}
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden xl:inline">Shortcuts</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-900/60 text-slate-400 rounded border border-slate-700/60">
                ?
              </kbd>
            </button>

            {/* Live Staff On Duty Pill - LEAST priority: completely hidden on forms, only shown on 2xl+ on dashboards */}
            {!isServiceCallForm && !isQuotationForm && (
              <div className="hidden 2xl:block">
                <StaffOnDutyBoard onlineStaff={onlineStaff} />
              </div>
            )}

            {/* Visual Divider before Primary Action Button */}
            <div className="h-6 w-px bg-slate-800/90 mx-1 hidden sm:block" />

            {/* Prominent Prioritized Back Action with generous breathing room */}
            {isServiceCallForm ? (
              <Link
                to="/admin/service-calls"
                className="h-9 inline-flex items-center gap-2 rounded-xl border border-blue-500/60 bg-blue-600/25 hover:bg-blue-600/35 text-blue-200 hover:text-white px-3.5 text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer mr-1 sm:mr-2"
                title="Return to Service Calls List"
              >
                <ArrowLeft className="h-4 w-4 shrink-0 text-blue-400" />
                <span className="hidden sm:inline">Back to List</span>
                <span className="sm:hidden">Back</span>
              </Link>
            ) : isQuotationForm ? (
              <Link
                to="/admin/quotations"
                className="h-9 inline-flex items-center gap-2 rounded-xl border border-blue-500/60 bg-blue-600/25 hover:bg-blue-600/35 text-blue-200 hover:text-white px-3.5 text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer mr-1 sm:mr-2"
                title="Return to Quotations List"
              >
                <ArrowLeft className="h-4 w-4 shrink-0 text-blue-400" />
                <span className="hidden sm:inline">Back to Quotes</span>
                <span className="sm:hidden">Back</span>
              </Link>
            ) : (
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="h-9 inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 hover:text-white px-3 text-xs font-semibold text-slate-200 shadow-xs transition-all shrink-0 mr-1 sm:mr-2"
                title="Open Main Website"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="hidden sm:inline">Back to Website</span>
                <span className="sm:hidden">Website</span>
              </a>
            )}
          </div>
        </header>

        {/* Dedicated Independent Scrollable Ticket / Main Content Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950 p-2 sm:p-4 md:p-6 pb-4 md:pb-6 focus:outline-none overscroll-contain">
          <Suspense fallback={<LoadingScreen fullScreen={false} title="Admin Workspace" subtitle="Loading view..." />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Attached Full-Height Right Action Sidebar Portal Target (Extends to Top of Page, h-full on Desktop/Laptop >=1024px) */}
      <div id="admin-right-rail" className="h-full shrink-0 empty:hidden print:hidden z-20 hidden lg:block border-l border-slate-800/90 shadow-xl" />

      {/* Tally 'Go To' Sequential Navigation HUD */}
      {isChordActive && (
        <aside
          role="status"
          aria-live="polite"
          aria-label="Tally Go To Module Jumper"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-150 print:hidden max-w-[calc(100vw-1.5rem)] sm:max-w-max"
        >
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/95 text-white border border-blue-500/70 shadow-2xl px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl backdrop-blur-md text-xs font-medium max-w-full overflow-hidden">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping shrink-0" />
            <span className="font-extrabold text-blue-400 uppercase tracking-wider font-mono text-[10px] sm:text-[11px] shrink-0">
              GO TO:
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2.5 font-mono text-[11px] sm:text-xs overflow-x-auto no-scrollbar py-0.5">
              <span className="whitespace-nowrap">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-amber-400">S</kbd> Service
              </span>
              <span className="whitespace-nowrap">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-amber-400">Q</kbd> Quotes
              </span>
              <span className="whitespace-nowrap">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-amber-400">P</kbd> Products
              </span>
              <span className="whitespace-nowrap">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-amber-400">C</kbd> Customers
              </span>
              <span className="whitespace-nowrap">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-amber-400">R</kbd> Reports
              </span>
            </div>
            <button
              type="button"
              onClick={cancelChord}
              className="ml-2 sm:ml-3 text-slate-400 hover:text-white text-[11px] underline underline-offset-2 cursor-pointer shrink-0"
            >
              Esc
            </button>
          </div>
        </aside>
      )}

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

      {/* Global Omnisearch Modal */}
      <GlobalAdminSearchModal
        open={showSearchModal}
        onOpenChange={setShowSearchModal}
      />

      {/* Global Keyboard Shortcuts Help Modal */}
      <ShortcutsHelpModal
        open={showShortcutsModal}
        onOpenChange={setShowShortcutsModal}
      />
    </div>
  );
}
