import { useState } from "react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import { SEO, BreadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  Truck,
  Package,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Phone,
  Send,
  Loader2,
  MessageCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { whatsappLink } from "@/lib/contact";
import { createInquiry } from "@/lib/firestore";
import { isValidIndianPhoneNumber, formatIndianPhoneNumber, formatPhoneForDisplay } from "@/lib/utils";

const benefits = [
  {
    icon: TrendingUp,
    title: "Wholesale Margin Tiers",
    desc: "Competitive distributor margins on 4,000+ products across all major global IT brands.",
  },
  {
    icon: Truck,
    title: "Priority Regional Dispatch",
    desc: "Same-day dispatch for in-stock inventory across Neemuch, Mandsaur, Ratlam & Rajasthan.",
  },
  {
    icon: Package,
    title: "Direct Distributor Inventory",
    desc: "Direct access to ready warehouse stock of laptops, RAM, NVMe SSDs, CCTV & printers.",
  },
  {
    icon: ShieldCheck,
    title: "Authorized Service Backing",
    desc: "Direct manufacturer warranty claims and in-house chip-level RMA repair center.",
  },
];

const BRANDS = [
  "HP",
  "Dell",
  "Lenovo",
  "Epson",
  "CP PLUS",
  "Hikvision",
  "Canon",
  "Brother",
  "Acer",
  "Asus",
];

export default function Dealers() {
  const [form, setForm] = useState({
    name: "",
    business: "",
    phone: "",
    city: "",
    message: "",
  });
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));

    if (name === "phone") {
      if (phoneError) setPhoneError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    if (!isValidIndianPhoneNumber(form.phone)) {
      setPhoneError("Please enter a valid 10-digit mobile number (e.g. 98260 12345)");
      toast.error("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const normalizedPhone = formatIndianPhoneNumber(form.phone);
      const requirementNote = `[Dealer Application]\nBusiness Name: ${form.business.trim() || "Not specified"}\nCity/Region: ${form.city.trim() || "Not specified"}\nRequirements: ${form.message.trim() || "General Dealer Wholesale Pricing"}`;

      const businessName = form.business.trim();
      const subject = businessName
        ? `Dealer Wholesale Pricing – ${businessName}`
        : "Dealer & Wholesale Pricing Registration";

      await createInquiry({
        name: form.name.trim(),
        phone: normalizedPhone,
        subject,
        message: requirementNote,
        status: "pending",
        source: "dealers_portal",
      });

      setSubmitted(true);
      toast.success("Dealer inquiry submitted successfully! Our B2B team will contact you within 24 hours.");
    } catch (err) {
      console.error("Failed to submit dealer inquiry:", err);
      toast.error("Failed to submit inquiry. Please try calling our showroom directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppDirect = () => {
    if (!form.name.trim()) {
      toast.error("Please enter your name first.");
      return;
    }
    const text = `Hi Zorba Infotech! I want to apply for Dealer Pricing.\nName: ${form.name}\nBusiness: ${form.business || "N/A"}\nPhone: ${form.phone || "N/A"}\nCity: ${form.city || "N/A"}\nRequirements: ${form.message || "Wholesale catalog & pricing"}`;
    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
  };

  return (
    <Layout>
      <SEO
        title="Dealer & Bulk Buyer Portal – Zorba Infotech | Wholesale IT Hardware Neemuch"
        description="Partner with Zorba Infotech for wholesale dealer pricing on 4,000+ IT hardware products. Serving retailers and system integrators across Neemuch, Mandsaur, MP & Rajasthan."
        path="/dealers"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Dealer Portal", url: "/dealers" },
        ]}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 py-16 md:py-20 text-white shadow-inner">
        <div className="container mx-auto max-w-3xl text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-3.5 py-1 text-xs font-bold text-amber-300 tracking-wide uppercase shadow-xs">
            <Building2 className="h-3.5 w-3.5" />
            B2B IT Distribution &amp; Wholesale
          </span>
          <h1 className="text-3xl font-extrabold font-display sm:text-4xl md:text-5xl text-white tracking-tight leading-tight">
            Dealer &amp; Bulk Buyer Portal
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Partner with Zorba Infotech — Neemuch's largest IT hardware distributor. Enjoy special dealer pricing, priority dispatch, and direct GST billing.
          </p>

          {/* Authorized Brands Strip */}
          <div className="pt-6 border-t border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Official Hardware Distribution Across
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {BRANDS.map((brand) => (
                <span
                  key={brand}
                  className="rounded-lg bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 text-xs font-semibold text-slate-200"
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="container py-14 md:py-18">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Dealer Advantage
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
            Why Partner With Zorba Infotech?
          </h2>
          <p className="text-sm text-muted-foreground">
            Supplying 500+ computer shops, CCTV installers, and corporate resellers since 2004.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border bg-card p-6 card-hover flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-base">{b.title}</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* High-Craft Dealer Application Section */}
      <section className="bg-zorba-surface/60 border-t py-14 md:py-20">
        <div className="container mx-auto max-w-2xl">
          <div className="rounded-3xl border bg-card p-6 sm:p-10 shadow-xl relative overflow-hidden">
            {/* Ambient Background Accent */}
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

            <div className="text-center space-y-2 mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                Direct Wholesale Account Registration
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
                Apply for Dealer Pricing
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                Submit your business details below. Our B2B account manager will review and activate your dealer rate sheet within 24 hours.
              </p>
            </div>

            {submitted ? (
              <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold font-display text-foreground">
                    Dealer Inquiry Received!
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Thank you, <strong className="text-foreground">{form.name}</strong>. We have registered your inquiry for <strong className="text-foreground">{form.business || "your business"}</strong> ({formatPhoneForDisplay(form.phone)}). Our wholesale desk will contact you with the latest dealer catalog.
                  </p>
                </div>

                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: "", business: "", phone: "", city: "", message: "" });
                    }}
                    className="rounded-xl text-xs font-semibold"
                  >
                    Submit Another Inquiry
                  </Button>

                  <a href="tel:+919424899730">
                    <Button variant="default" className="gap-2 rounded-xl text-xs font-semibold">
                      <Phone className="h-3.5 w-3.5" />
                      Call Wholesale Desk: 94248 99730
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dealer-name" className="text-xs font-semibold">
                      Your Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dealer-name"
                      name="name"
                      type="text"
                      placeholder="e.g. FirstName LastName"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dealer-business" className="text-xs font-semibold">
                      Shop / Business Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dealer-business"
                      name="business"
                      type="text"
                      placeholder="Your Firm Name"
                      value={form.business}
                      onChange={handleChange}
                      required
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dealer-phone" className="text-xs font-semibold">
                      Mobile / WhatsApp Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="dealer-phone"
                        name="phone"
                        type="tel"
                        placeholder="e.g. 98260 12345"
                        value={form.phone}
                        onChange={handleChange}
                        required
                        className={`h-10 text-xs rounded-xl font-mono ${
                          phoneError ? "border-destructive focus-visible:ring-destructive" : ""
                        }`}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-[11px] font-medium text-destructive">{phoneError}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dealer-city" className="text-xs font-semibold">
                      City / District <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dealer-city"
                      name="city"
                      type="text"
                      placeholder="e.g. Neemuch, Mandsaur, Chittorgarh"
                      value={form.city}
                      onChange={handleChange}
                      required
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dealer-message" className="text-xs font-semibold">
                    Product Requirements &amp; Quantities (Optional)
                  </Label>
                  <Textarea
                    id="dealer-message"
                    name="message"
                    rows={3}
                    placeholder="e.g. Need bulk dealer pricing on RAM, 512GB NVMe SSDs, CP Plus CCTV & Epson Printers..."
                    value={form.message}
                    onChange={handleChange}
                    className="text-xs rounded-xl resize-none"
                  />
                </div>

                <div className="pt-3 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="flex-1 gap-2 rounded-xl font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Dealer Inquiry
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleWhatsAppDirect}
                    className="gap-2 rounded-xl font-semibold border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Inquire on WhatsApp
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
