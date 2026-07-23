import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Clock, ExternalLink } from "lucide-react";
import zorbaLogo from "@/assets/zorba-logo.png";

const Footer = () => (
  <footer className="border-t bg-card">
    <div className="container py-12">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <img src={zorbaLogo} alt="Zorba Infotech" className="h-8 w-8" width={32} height={32} loading="lazy" />
            <span className="font-display text-lg font-bold">Zorba Infotech</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Premier computer hardware dealer, distributor & authorized service center. Over 4,000 IT products serving Neemuch & beyond.
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            Proprietor: <span className="text-foreground">Swami Prem Sagar</span>
          </p>
          <p className="text-xs text-muted-foreground">
            GST: <span className="font-mono text-foreground">23AATPM9267A1ZH</span>
          </p>
          <div className="rounded-lg bg-zorba-green/10 border border-zorba-green/20 p-3">
            <p className="text-xs font-medium text-foreground leading-relaxed">
              🏛️ Available on the Government of India's authorized <strong>GeM Portal</strong>
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold font-display">Quick Links</h4>
          <nav className="flex flex-col gap-2.5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/products" className="hover:text-foreground transition-colors">Products & Services</Link>
            <Link to="/payments" className="hover:text-foreground transition-colors">Payments</Link>
            <Link to="/dealers" className="hover:text-foreground transition-colors">Dealer Portal</Link>
            <Link to="/careers" className="hover:text-foreground transition-colors">Careers / Jobs</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
          </nav>

          <h4 className="text-sm font-semibold font-display pt-2">Follow Us</h4>
          <nav className="flex flex-col gap-2.5 text-sm text-muted-foreground">
            <a href="https://www.facebook.com/zorbainfotech/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
              Facebook <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://www.instagram.com/ZORBAINFOTECH1/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
              Instagram <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://www.indiamart.com/zorbainfotech" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
              IndiaMart <ExternalLink className="h-3 w-3" />
            </a>
          </nav>
        </div>

        {/* Contact Numbers */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold font-display">Contact Numbers</h4>
          <div className="space-y-3 text-sm">
            {[
              { label: "Zorba Swami", number: "9993599730" },
              { label: "Replacements/Support", number: "9302199730" },
              { label: "Sales", number: "9424899730" },
              { label: "Accounts", number: "9179699730" },
            ].map((c) => (
              <a key={c.number} href={`tel:+91${c.number}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <span className="text-xs text-muted-foreground">{c.label}:</span>{" "}
                  <span className="font-medium text-foreground">+91 {c.number.replace(/(\d{5})(\d{5})/, "$1 $2")}</span>
                </span>
              </a>
            ))}
          </div>

          <h4 className="text-sm font-semibold font-display pt-2">Email</h4>
          <div className="space-y-2 text-sm">
            <a href="mailto:zorbainfotech@gmail.com" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
              zorbainfotech@gmail.com
            </a>
            <a href="mailto:zorba99730@gmail.com" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
              zorba99730@gmail.com
            </a>
          </div>
        </div>

        {/* Address & Hours */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold font-display">Visit Us</h4>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458 441 (M.P.), Madhya Pradesh</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>Monday to Saturday<br />10:30 AM – 10:00 PM</span>
            </div>
          </div>

          <h4 className="text-sm font-semibold font-display pt-2">Legal</h4>
          <nav className="flex flex-col gap-2.5 text-sm text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </nav>
        </div>
      </div>

      <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Zorba Infotech. All rights reserved.</p>
        <p>ZORBA INFOTECH / ZORBA SERVICE CENTER / PREM SAGAR SALES AGENCY</p>
      </div>
    </div>
  </footer>
);

export default Footer;
