import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { SEO, BreadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  ExternalLink,
  Send,
  CheckCircle2,
  Loader2,
  Building2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { whatsappLink } from "@/lib/contact";
import { createInquiry } from "@/lib/firestore";
import { isValidIndianPhoneNumber, formatIndianPhoneNumber } from "@/lib/utils";
import { toast } from "sonner";

const contactNumbers = [
  { label: "Direct Support & Sales (Zorba Swami)", number: "9993599730" },
  { label: "Replacements & Service Desk", number: "9302199730" },
  { label: "Wholesale & Dealer Inquiries", number: "9424899730" },
  { label: "Billing & Accounts", number: "9179699730" },
];

const availableServices = [
  "Computer & Laptop Sales (4,000+ products)",
  "Authorized Service & Motherboard Repair",
  "Custom Gaming & Workstation Assembly",
  "B2B Wholesale IT & Peripheral Distribution",
  "CCTV & Security Surveillance Installation",
  "LAN/WAN Networking & Fiber Optic Cabling",
  "School & Institutional IT Lab Solutions",
  "Biometric Attendance & Access Control",
];

export default function Contact() {
  // Inquiry Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    if (!isValidIndianPhoneNumber(phone)) {
      toast.error("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter your message or requirements.");
      return;
    }

    setSubmitting(true);
    try {
      const normalizedPhone = formatIndianPhoneNumber(phone);
      await createInquiry({
        name: name.trim(),
        phone: normalizedPhone,
        email: email.trim() || undefined,
        subject: subject.trim() || "General Inquiry",
        message: message.trim(),
        status: "pending",
        source: "contact_page",
      });

      setSubmitted(true);
      toast.success("Thank you! Your inquiry has been sent to Zorba Infotech. Our team will contact you shortly.");
      setName("");
      setPhone("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to submit inquiry. Please call or WhatsApp us.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppInquiry = () => {
    if (!name.trim()) {
      toast.error("Please enter your name first.");
      return;
    }
    const text = `Hi Zorba Infotech! I want to send an inquiry.\nName: ${name}\nPhone: ${phone || "N/A"}\nEmail: ${email || "N/A"}\nSubject: ${subject || "General Inquiry"}\nMessage: ${message || "I am interested in your products and services."}`;
    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
  };

  return (
    <Layout>
      <SEO
        title="Contact Zorba Infotech – Computer Shop in Neemuch, MP | Call & WhatsApp"
        description="Contact Zorba Infotech at Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458441, MP. Call: +91 9993599730. Open Mon–Sat, 10:30 AM–10 PM. Computer sales, repair & IT support."
        path="/contact"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ]}
      />

      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 py-16 md:py-20 text-white shadow-inner">
        <div className="container mx-auto max-w-3xl text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 px-3.5 py-1 text-xs font-bold text-blue-300 tracking-wide uppercase shadow-xs">
            <Building2 className="h-3.5 w-3.5" />
            Showroom &amp; Authorized Service Hub
          </span>
          <h1 className="text-3xl font-extrabold font-display sm:text-4xl md:text-5xl text-white tracking-tight leading-tight">
            Contact Zorba Infotech
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Visit our Neemuch showroom, talk directly to our hardware &amp; service specialists, or send us your inquiry for fast assistance.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 px-3 py-1 text-slate-200">
              <MapPin className="h-3.5 w-3.5 text-cyan-400" /> Shop No. 5 &amp; 6, Tagore Marg, Neemuch
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 px-3 py-1 text-slate-200">
              <Clock className="h-3.5 w-3.5 text-emerald-400" /> Mon – Sat: 10:30 AM – 10:00 PM
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 px-3 py-1 text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Fast Response Guaranteed
            </span>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="container py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Left Column: Business Info & Services (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Showroom & Contact Card */}
              <div className="rounded-3xl border bg-card p-6 space-y-5 shadow-sm">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    ZORBA INFOTECH
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    ZORBA SERVICE CENTER / PREM SAGAR SALES AGENCY
                  </p>
                  <p className="text-xs font-medium text-foreground mt-1">
                    Proprietor: <span className="font-semibold">Swami Prem Sagar</span>
                  </p>
                </div>

                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <span className="leading-relaxed text-foreground">
                      Shop No. 5 &amp; 6, U-Shape Market, Tagore Marg, Neemuch 458 441 (M.P.), Madhya Pradesh
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground">Monday to Saturday, 10:30 AM – 10:00 PM</span>
                  </div>

                  <div className="flex flex-col gap-1 pl-6 pt-1">
                    <a
                      href="mailto:zorbainfotech@gmail.com"
                      className="hover:text-primary transition-colors truncate"
                    >
                      zorbainfotech@gmail.com
                    </a>
                    <a
                      href="mailto:zorba99730@gmail.com"
                      className="hover:text-primary transition-colors truncate"
                    >
                      zorba99730@gmail.com
                    </a>
                    <span className="text-[11px] pt-1">
                      GST: <span className="font-mono font-medium text-foreground">23AATPM9267A1ZH</span>
                    </span>
                  </div>
                </div>

                {/* Direct Contact Numbers */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Department Direct Lines
                  </h3>
                  <div className="space-y-2">
                    {contactNumbers.map((c) => (
                      <div
                        key={c.number}
                        className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 p-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-[10px] text-muted-foreground truncate">{c.label}</span>
                          <span className="font-semibold font-mono text-foreground text-xs">
                            +91 {c.number.replace(/(\d{5})(\d{5})/, "$1 $2")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a href={`tel:+91${c.number}`}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              aria-label={`Call ${c.label}`}
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                          </a>
                          <a
                            href={`https://wa.me/91${c.number}?text=${encodeURIComponent(
                              "Hi Zorba Infotech, I have an inquiry."
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="whatsapp"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              aria-label={`WhatsApp ${c.label}`}
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Channels */}
                <div className="border-t pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Connect Online
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Facebook", url: "https://www.facebook.com/zorbainfotech/" },
                      { label: "Instagram", url: "https://www.instagram.com/ZORBAINFOTECH1/" },
                      { label: "IndiaMart", url: "https://www.indiamart.com/zorbainfotech" },
                    ].map((s) => (
                      <a
                        key={s.label}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        {s.label} <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Services Available */}
              <div className="rounded-3xl border bg-card p-6 space-y-3 shadow-sm">
                <h3 className="font-display text-sm font-bold text-foreground">
                  Showroom &amp; Technical Capabilities
                </h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {availableServices.map((service) => (
                    <li key={service} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="leading-relaxed">{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column: Online Inquiry Form & Map (3 cols) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Send an Inquiry Form */}
              <div className="rounded-3xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Quick Assistance
                  </div>
                  <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    <span>Send Us an Inquiry</span>
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Have a requirement for computers, laptops, parts, or repairs? Fill in the details below and our team will get back to you immediately.
                  </p>
                </div>

                {submitted ? (
                  <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-emerald-900 dark:text-emerald-100">
                        Inquiry Received Successfully!
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 max-w-sm mx-auto leading-relaxed">
                        Thank you for reaching out to Zorba Infotech. Our technical team is reviewing your requirements and will connect with you shortly.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSubmitted(false)}
                        className="text-xs rounded-xl"
                      >
                        Send Another Message
                      </Button>
                      <a
                        href={whatsappLink("Hi Zorba Infotech! I just submitted an inquiry on your website.")}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          type="button"
                          variant="whatsapp"
                          size="sm"
                          className="text-xs rounded-xl gap-1.5"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Chat on WhatsApp
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitInquiry} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-name" className="text-xs font-semibold">
                          Your Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="contact-name"
                          required
                          placeholder="e.g. FirstName LastName"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-10 text-xs rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="contact-phone" className="text-xs font-semibold">
                          Phone / WhatsApp Number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="contact-phone"
                          required
                          type="tel"
                          placeholder="e.g. 99935 99730"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-10 text-xs rounded-xl font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-email" className="text-xs font-semibold">
                          Email Address (Optional)
                        </Label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="e.g. yourname@gmail.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-10 text-xs rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="contact-subject" className="text-xs font-semibold">
                          Subject / Requirement
                        </Label>
                        <Input
                          id="contact-subject"
                          placeholder="e.g. Bulk Laptop Purchase, CCTV Setup, Printer Service"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="h-10 text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="contact-message" className="text-xs font-semibold">
                        Your Message or Specification <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="contact-message"
                        required
                        rows={4}
                        placeholder="Tell us what you're looking for or describe your device issue..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="text-xs rounded-xl resize-none"
                      />
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 h-11 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 shadow-md cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Sending Inquiry...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>Submit Inquiry Directly</span>
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleWhatsAppInquiry}
                        className="flex-1 h-11 text-xs font-semibold rounded-xl gap-2 border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>Inquire on WhatsApp</span>
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Map */}
              <div className="rounded-3xl border bg-card overflow-hidden h-[340px] shadow-sm">
                <iframe
                  title="Zorba Infotech Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3631.7936639118825!2d74.86806537609837!3d24.457943078194344!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39667386e5b4846f%3A0xec3cd8961ffff43c!2sZorba%20Infotech!5e0!3m2!1sen!2sin!4v1776011306458!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
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
}
