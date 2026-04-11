import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import zorbaLogo from "@/assets/zorba-logo.png";

const Footer = () => (
  <footer className="border-t bg-card">
    <div className="container py-12">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <img src={zorbaLogo} alt="Zorba Infotech" className="h-8 w-8" width={32} height={32} loading="lazy" />
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
            <Link to="/pc-builder" className="hover:text-foreground transition-colors">Custom PC Builder</Link>
            <Link to="/dealers" className="hover:text-foreground transition-colors">Dealer Portal</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
          </nav>
        </div>

        {/* Services */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Services</h4>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span>Computer & Laptop Sales</span>
            <span>Authorized Service Center</span>
            <span>Wholesale IT Distribution</span>
            <span>CCTV & Security</span>
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
            <a href="tel:+919993599730" className="flex items-center gap-2 hover:text-foreground transition-colors">
              <Phone className="h-4 w-4 shrink-0" />
              +91 99935 99730
            </a>
            <a href="mailto:zorbainfotech@gmail.com" className="flex items-center gap-2 hover:text-foreground transition-colors">
              <Mail className="h-4 w-4 shrink-0" />
              zorbainfotech@gmail.com
            </a>
            <a href="mailto:zorba99730@gmail.com" className="flex items-center gap-2 hover:text-foreground transition-colors">
              <Mail className="h-4 w-4 shrink-0" />
              zorba99730@gmail.com
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
