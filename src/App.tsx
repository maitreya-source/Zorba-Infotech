import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { LocalBusinessSchema } from "@/components/SEO";
import { AuthProvider } from "@/contexts/AuthContext";
import AdminRoute from "@/components/admin/AdminRoute";
import Index from "./pages/Index";
import Dealers from "./pages/Dealers";
import Contact from "./pages/Contact";
import Products from "./pages/Products";
import Catalog from "./pages/Catalog";
import CatalogProduct from "./pages/CatalogProduct";
import Payments from "./pages/Payments";
import Careers from "./pages/Careers";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminServiceCalls from "./pages/admin/AdminServiceCalls";
import AdminServiceCallForm from "./pages/admin/AdminServiceCallForm";
import AdminDeviceCategories from "./pages/admin/AdminDeviceCategories";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminImportCustomers from "./pages/admin/AdminImportCustomers";
import AdminTechnicians from "./pages/admin/AdminTechnicians";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminServiceCenters from "./pages/admin/AdminServiceCenters";
import AdminReports from "./pages/admin/AdminReports";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LocalBusinessSchema />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
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
                  <Route path="/admin/device-categories" element={<AdminDeviceCategories />} />
                  <Route path="/admin/customers" element={<AdminCustomers />} />
                  <Route path="/admin/customers/import" element={<AdminImportCustomers />} />
                  <Route path="/admin/technicians" element={<AdminTechnicians />} />
                  <Route path="/admin/staff" element={<AdminStaff />} />
                  <Route path="/admin/service-centers" element={<AdminServiceCenters />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
