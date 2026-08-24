import { Link } from "react-router-dom";
import { MapPin, Phone, Clock, ShieldCheck, Building2, Wrench, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FAQSchema } from "@/components/SEO";

const faqs = [
  {
    question: "Where is Zorba Infotech located and what are the showroom timings?",
    answer:
      "Our showroom and service center is located at Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch (MP) 458441. We are open Monday to Saturday from 10:30 AM to 10:00 PM. Call us directly at +91 99935 99730.",
  },
  {
    question: "Do you supply laptops, desktops, and printers with official brand warranties?",
    answer:
      "Yes. All hardware purchased from Zorba Infotech comes with 100% genuine manufacturer warranties from authorized brands including HP, Dell, Lenovo, Asus, Acer, Epson, Canon, and CP Plus, complete with official GST invoices.",
  },
  {
    question: "Do you build custom gaming PCs and workstation computers in Neemuch?",
    answer:
      "Yes. We specialize in custom PC builds for gaming, video editing, and architecture, with customized component selection (Intel/Ryzen CPUs, RTX graphics cards, DDR4/DDR5 RAM, and high-speed NVMe SSDs).",
  },
  {
    question: "Do you provide IT hardware distribution and GeM Portal billing for institutions?",
    answer:
      "Yes. We are registered on the Government of India's GeM Portal and supply IT infrastructure, networking equipment, biometrics, and surveillance systems to schools, colleges, government offices, and corporate businesses.",
  },
];

const LocalSEOSection = () => {
  return (
    <section className="border-t bg-card/40 py-14 md:py-18">
      <FAQSchema items={faqs} />
      <div className="container">
        <div className="mx-auto max-w-4xl space-y-12">
          {/* Showroom & Service Hub Card */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 md:p-10 shadow-sm space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Showroom &amp; Authorized Service Center
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                Visit Zorba Infotech in Neemuch
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Serving individuals, retail dealers, and institutions across Neemuch, Mandsaur, Manasa, Jawad, and the Malwa region for over 20 years.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-2">
              {/* Location */}
              <div className="flex items-start gap-3 rounded-2xl border bg-secondary/30 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-foreground">Showroom Address</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Shop No. 5 &amp; 6, U-Shape Market, Tagore Marg, Neemuch (MP) 458441
                  </p>
                </div>
              </div>

              {/* Working Hours */}
              <div className="flex items-start gap-3 rounded-2xl border bg-secondary/30 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-foreground">Working Hours</p>
                  <p className="text-muted-foreground">Mon – Sat: 10:30 AM – 10:00 PM</p>
                  <p className="text-muted-foreground text-[11px]">Sunday: Closed</p>
                </div>
              </div>

              {/* Direct Support */}
              <div className="flex items-start gap-3 rounded-2xl border bg-secondary/30 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-foreground">Phone &amp; WhatsApp</p>
                  <p className="text-muted-foreground font-mono">+91 99935 99730</p>
                  <p className="text-muted-foreground font-mono">+91 93021 99730</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="https://maps.google.com/?q=Zorba+Infotech+Neemuch"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="default" className="rounded-xl gap-2 font-semibold">
                  <Navigation className="h-4 w-4" />
                  Get Directions on Google Maps
                </Button>
              </a>

              <a href="tel:+919993599730">
                <Button variant="outline" className="rounded-xl gap-2 font-semibold">
                  <Phone className="h-4 w-4" />
                  Call Showroom
                </Button>
              </a>
            </div>
          </div>

          {/* Three Core Pillars */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5 space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">B2B Wholesale &amp; GeM Supply</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Registered on the Government of India GeM Portal. Bulk corporate and educational procurement with GST billing.
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">100% Genuine Hardware</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Direct authorized sourcing for HP, Dell, Lenovo, Epson, Canon, and CP Plus with full brand warranty.
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Wrench className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Authorized Service Center</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In-house technicians for chip-level repair, laptop screen/battery replacement, and CCTV maintenance.
              </p>
            </div>
          </div>

          {/* Human-Centered FAQs */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Common questions about purchasing hardware, warranties, and service support at Zorba Infotech.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((f) => (
                <div key={f.question} className="rounded-2xl border bg-card p-5 space-y-1.5 shadow-xs">
                  <h3 className="font-semibold text-sm text-foreground">{f.question}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Careers Banner */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-foreground">
              💼 <strong>Looking for a career in IT?</strong> We are hiring Hardware Technicians &amp; Service Engineers in Neemuch.
            </p>
            <Link to="/careers" className="shrink-0">
              <Button variant="outline" size="sm" className="rounded-xl font-semibold text-xs border-primary/30">
                View Openings →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocalSEOSection;
