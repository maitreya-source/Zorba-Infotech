import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";

const Contact = () => (
  <Layout>
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold font-display">Contact Us</h1>
        <p className="mt-1 text-muted-foreground">Visit our showroom or reach out anytime — we're here to help.</p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {/* Info */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-display text-lg font-bold mb-1">
                ZORBA INFOTECH / ZORBA SERVICE CENTER
              </h2>
              <p className="text-sm font-semibold text-muted-foreground mb-1">PREM SAGAR SALES AGENCY</p>
              <p className="text-sm font-medium">Swami Prem Sagar</p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>Shop No. 5 & 6, U – Shape Market, Tagore Marg, Neemuch 458 441 (M.P.)</span>
                </div>
                <a href="tel:+919993599730" className="flex items-center gap-3 hover:text-primary transition-colors">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  +91 99935 99730
                </a>
                <a href="mailto:zorbainfotech@gmail.com" className="flex items-center gap-3 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  zorbainfotech@gmail.com
                </a>
                <a href="mailto:zorba99730@gmail.com" className="flex items-center gap-3 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  zorba99730@gmail.com
                </a>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <span>Mon – Sat: 10:00 AM – 8:00 PM</span>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <a href="tel:+919993599730" className="flex-1">
                  <Button variant="default" className="w-full gap-2">
                    <Phone className="h-4 w-4" />
                    Call Now
                  </Button>
                </a>
                <a
                  href="https://wa.me/919993599730?text=Hi%20Zorba%20Infotech!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="whatsapp" className="w-full gap-2">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-2">Services Available</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>• Computer & Laptop Sales</li>
                <li>• Authorized Service & Repair Center</li>
                <li>• Custom PC Assembly</li>
                <li>• Wholesale IT Distribution</li>
                <li>• CCTV & Security Installation</li>
                <li>• Networking Solutions</li>
              </ul>
            </div>
          </div>

          {/* Map */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <iframe
              title="Zorba Infotech Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3654.5!2d74.87!3d24.47!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDI4JzEyLjAiTiA3NMKwNTInMTIuMCJF!5e0!3m2!1sen!2sin!4v1700000000000"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 400 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  </Layout>
);

export default Contact;
