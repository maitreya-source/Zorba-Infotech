import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-card">
    <div className="container py-12">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
              Z
            </div>
            <span className="font-display text-lg font-bold">Zorba Infotech</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Premier computer hardware dealer, distributor & authorized service center serving Neemuch and surrounding regions.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Quick Links</h4>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/products" className="hover:text-foreground transition-colors">Product Catalog</Link>
            <Link to="/pc-builder" className="hover:text-foreground transition-colors">Custom PC Builder</Link>
            <Link to="/dealers" className="hover:text-foreground transition-colors">Dealer Portal</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
          </nav>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Categories</h4>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/products?cat=laptops" className="hover:text-foreground transition-colors">Laptops & Desktops</Link>
            <Link to="/products?cat=components" className="hover:text-foreground transition-colors">PC Components</Link>
            <Link to="/products?cat=networking" className="hover:text-foreground transition-colors">Networking</Link>
            <Link to="/products?cat=security" className="hover:text-foreground transition-colors">CCTV & Security</Link>
          </nav>
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Contact</h4>
          <div className="space-y-2.5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              ZORBA INFOTECH / ZORBA SERVICE CENTER / PREM SAGAR SALES AGENCY
            </p>
            <p className="font-medium text-foreground text-xs">Swami Prem Sagar</p>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Shop No. 5 & 6, U – Shape Market, Tagore Marg, Neemuch 458 441 (M.P.)</span>
            </div>
            <a href="tel:+919407466866" className="flex items-center gap-2 hover:text-foreground transition-colors">
              <Phone className="h-4 w-4 shrink-0" />
              +91 94074 66866
            </a>
            <a href="mailto:info@zorbainfotech.com" className="flex items-center gap-2 hover:text-foreground transition-colors">
              <Mail className="h-4 w-4 shrink-0" />
              info@zorbainfotech.com
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Zorba Infotech. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
