import Layout from "@/components/layout/Layout";
import { SEO, BreadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Clock, MessageCircle, ExternalLink } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const contactNumbers = [
  { label: "Zorba Swami", number: "9993599730" },
  { label: "Replacements / Support", number: "9302199730" },
  { label: "Sales", number: "9424899730" },
  { label: "Accounts", number: "9179699730" },
];

const Contact = () => {
  const { ref: infoRef, isVisible: infoVisible } = useScrollAnimation();
  const { ref: mapRef, isVisible: mapVisible } = useScrollAnimation();

  return (
    <Layout>
      <SEO
        title="Contact Zorba Infotech – Computer Shop in Neemuch, MP | Call & WhatsApp"
        description="Contact Zorba Infotech at Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458441, MP. Call: +91 9993599730. Open Mon–Sat, 10:30 AM–10 PM. Computer sales, repair & IT support."
        path="/contact"
      />
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Contact", url: "/contact" }]} />
      <div className="container py-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold font-display">Contact Us</h1>
          <p className="mt-1 text-muted-foreground">Visit our showroom or reach out anytime — we're here to help.</p>

          <div className="mt-8 grid gap-8 lg:grid-cols-5">
            {/* Info - takes 2 cols */}
            <div
              ref={infoRef}
              className={`lg:col-span-2 space-y-6 transition-all duration-700 ${
                infoVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <div className="rounded-2xl border bg-card p-6 space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold">ZORBA INFOTECH</h2>
                  <p className="text-sm text-muted-foreground">ZORBA SERVICE CENTER / PREM SAGAR SALES AGENCY</p>
                  <p className="text-sm font-medium mt-1">Proprietor: Swami Prem Sagar</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <span>Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458 441 (M.P.), Madhya Pradesh</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <span>Monday to Saturday, 10:30 AM – 10:00 PM</span>
                  </div>
                  <a href="mailto:zorbainfotech@gmail.com" className="flex items-center gap-3 hover:text-primary transition-colors">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    zorbainfotech@gmail.com
                  </a>
                  <a href="mailto:zorba99730@gmail.com" className="flex items-center gap-3 hover:text-primary transition-colors">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    zorba99730@gmail.com
                  </a>
                  <p className="text-xs text-muted-foreground pl-7">GST: <span className="font-mono">23AATPM9267A1ZH</span></p>
                </div>

                {/* Contact Numbers */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Contact Numbers</h3>
                  <div className="space-y-2.5">
                    {contactNumbers.map((c) => (
                      <a key={c.number} href={`tel:+91${c.number}`} className="flex items-center gap-3 text-sm hover:text-primary transition-colors group">
                        <Phone className="h-4 w-4 shrink-0 text-primary" />
                        <span className="flex-1">
                          <span className="text-muted-foreground text-xs">{c.label}</span>
                          <br />
                          <span className="font-medium group-hover:text-primary transition-colors">
                            +91 {c.number.replace(/(\d{5})(\d{5})/, "$1 $2")}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex gap-3 pt-2">
                  <a href="tel:+919993599730" className="flex-1">
                    <Button variant="default" className="w-full gap-2">
                      <Phone className="h-4 w-4" />
                      Call Now
                    </Button>
                  </a>
                  <a href="https://wa.me/919993599730?text=Hi%20Zorba%20Infotech!" target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="whatsapp" className="w-full gap-2">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </a>
                </div>

                {/* Social links */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Find Us Online</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Facebook", url: "https://www.facebook.com/zorbainfotech/" },
                      { label: "Instagram", url: "https://www.instagram.com/ZORBAINFOTECH1/" },
                      { label: "IndiaMart", url: "https://www.indiamart.com/zorbainfotech" },
                    ].map((s) => (
                      <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        {s.label} <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* GeM Badge */}
              <div className="rounded-2xl border border-zorba-green/20 bg-zorba-green/5 p-5">
                <p className="text-sm font-medium leading-relaxed">
                  🏛️ All computer-related items are now available through <strong>Zorba Infotech</strong> on the Government of India's authorized <strong>GeM Portal</strong>.
                </p>
              </div>

              {/* Services */}
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="font-semibold mb-3">Services Available</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>• Computer & Laptop Sales (4,000+ products)</li>
                  <li>• Authorized Service & Repair Center</li>
                  <li>• Custom PC Assembly</li>
                  <li>• Wholesale IT Distribution</li>
                  <li>• CCTV & Security Installation</li>
                  <li>• Networking & Fiber Optic Solutions</li>
                  <li>• School & Institutional IT Solutions</li>
                  <li>• Biometric Device Sales & Setup</li>
                </ul>
              </div>
            </div>

            {/* Map - takes 3 cols */}
            <div
              ref={mapRef}
              className={`lg:col-span-3 transition-all duration-700 delay-150 ${
                mapVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <div className="rounded-2xl border bg-card overflow-hidden h-full min-h-[500px]">
                <iframe
                  title="Zorba Infotech Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3631.7936639118825!2d74.86806537609837!3d24.457943078194344!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39667386e5b4846f%3A0xec3cd8961ffff43c!2sZorba%20Infotech!5e0!3m2!1sen!2sin!4v1776011306458!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: 500 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
