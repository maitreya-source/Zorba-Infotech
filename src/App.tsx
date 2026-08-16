import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { LocalBusinessSchema } from "@/components/SEO";
import { AuthProvider } from "@/contexts/AuthContext";
import { StaffProfileProvider } from "@/contexts/StaffProfileContext";
import AdminRoute from "@/components/admin/AdminRoute";

// Synchronous public landing page for fastest First Contentful Paint
import Index from "./pages/Index";

// Lazy-loaded public routes
const Products = lazy(() => import("./pages/Products"));
const Catalog = lazy(() => import("./pages/Catalog"));
const CatalogProduct = lazy(() => import("./pages/CatalogProduct"));
const Dealers = lazy(() => import("./pages/Dealers"));
const Contact = lazy(() => import("./pages/Contact"));
const Payments = lazy(() => import("./pages/Payments"));
const Careers = lazy(() => import("./pages/Careers"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy-loaded Admin CRM routes
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductForm = lazy(() => import("./pages/admin/AdminProductForm"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminServiceCalls = lazy(() => import("./pages/admin/AdminServiceCalls"));
const AdminServiceCallForm = lazy(() => import("./pages/admin/AdminServiceCallForm"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminCustomerDetail = lazy(() => import("./pages/admin/AdminCustomerDetail"));
const AdminImportCustomers = lazy(() => import("./pages/admin/AdminImportCustomers"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));
const AdminServiceCenters = lazy(() => import("./pages/admin/AdminServiceCenters"));
const AdminCouriers = lazy(() => import("./pages/admin/AdminCouriers"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminWhatsAppTemplates = lazy(() => import("./pages/admin/AdminWhatsAppTemplates"));
const AdminBackupRestore = lazy(() => import("./pages/admin/AdminBackupRestore"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <StaffProfileProvider>
            <LocalBusinessSchema />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/catalog/:id" element={<CatalogProduct />} />
                  <Route path="/dealers" element={<Dealers />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />

                  {/* Admin login */}
                  <Route path="/admin" element={<AdminLogin />} />

                  {/* Protected admin routes */}
                  <Route element={<AdminRoute />}>
                    <Route element={<AdminLayout />}>
                      <Route path="/admin/products" element={<AdminProducts />} />
                      <Route path="/admin/products/new" element={<AdminProductForm />} />
                      <Route path="/admin/products/:id/edit" element={<AdminProductForm />} />
                      <Route path="/admin/categories" element={<AdminCategories />} />
                      <Route path="/admin/service-calls" element={<AdminServiceCalls />} />
                      <Route path="/admin/service-calls/new" element={<AdminServiceCallForm />} />
                      <Route path="/admin/service-calls/:id/edit" element={<AdminServiceCallForm />} />
                      <Route path="/admin/device-categories" element={<AdminCategories />} />
                      <Route path="/admin/customers" element={<AdminCustomers />} />
                      <Route path="/admin/customers/:id" element={<AdminCustomerDetail />} />
                      <Route path="/admin/customers/import" element={<AdminImportCustomers />} />
                      <Route path="/admin/team" element={<AdminTeam />} />
                      <Route path="/admin/technicians" element={<AdminTeam />} />
                      <Route path="/admin/staff" element={<AdminTeam />} />
                      <Route path="/admin/service-centers" element={<AdminServiceCenters />} />
                      <Route path="/admin/couriers" element={<AdminCouriers />} />
                      <Route path="/admin/reports" element={<AdminReports />} />
                      <Route path="/admin/whatsapp-templates" element={<AdminWhatsAppTemplates />} />
                      <Route path="/admin/backup" element={<AdminBackupRestore />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </StaffProfileProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
