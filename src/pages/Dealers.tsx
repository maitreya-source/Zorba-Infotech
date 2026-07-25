import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { SEO, BreadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { TrendingUp, Truck, Package, Shield, MessageCircle, Send } from "lucide-react";
import { whatsappLink } from "@/lib/contact";

const benefits = [
  { icon: TrendingUp, title: "Best Wholesale Pricing", desc: "Competitive margins on 500+ products from all major brands." },
  { icon: Truck, title: "Priority Dispatch", desc: "Same-day dispatch for in-stock items across MP & Rajasthan." },
  { icon: Package, title: "Extensive Inventory", desc: "Access to the widest range of IT hardware in the Neemuch region." },
  { icon: Shield, title: "Warranty Support", desc: "Hassle-free warranty claims and service center backing." },
];

const Dealers = () => {
  const [form, setForm] = useState({ name: "", business: "", phone: "", city: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Dealer Inquiry:\nName: ${form.name}\nBusiness: ${form.business}\nPhone: ${form.phone}\nCity: ${form.city}\nMessage: ${form.message}`;
    window.open(whatsappLink(text), "_blank");
  };

  const handleEmail = () => {
    const subject = `Dealer Inquiry from ${form.name}`;
    const body = `Name: ${form.name}\nBusiness: ${form.business}\nPhone: ${form.phone}\nCity: ${form.city}\nMessage: ${form.message}`;
    window.open(`mailto:zorbainfotech@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <Layout>
      <SEO
        title="Dealer & Bulk Buyer Portal – Zorba Infotech | Wholesale IT Hardware Neemuch"
        description="Become a Zorba Infotech dealer and get wholesale pricing on 4,000+ IT products. Serving retailers across Neemuch, Mandsaur, Chittorgarh, MP & Rajasthan. Apply for dealer pricing today."
        path="/dealers"
      />
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Dealer Portal", url: "/dealers" }]} />
      {/* Hero */}
      <section className="bg-gradient-dealer py-16 text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-zorba-orange/20 px-4 py-1 text-sm font-semibold text-zorba-orange mb-4">
            B2B Distribution
          </span>
          <h1 className="text-3xl font-bold font-display md:text-4xl">Dealer & Bulk Buyer Portal</h1>
          <p className="mt-3 text-primary-foreground/80">
            Partner with Zorba Infotech for the best wholesale pricing on IT hardware across Neemuch, MP & Rajasthan.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="container py-16">
        <h2 className="text-2xl font-bold font-display text-center mb-10">Why Partner With Us?</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-xl border bg-card p-6 card-hover text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zorba-orange/10 text-zorba-orange">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section className="bg-zorba-surface py-16">
        <div className="container mx-auto max-w-xl">
          <h2 className="text-2xl font-bold font-display text-center">Apply for Dealer Pricing</h2>
          <p className="mt-2 text-center text-muted-foreground">Fill out the form and our team will get back to you within 24 hours.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {[
              { name: "name", label: "Your Name", type: "text", placeholder: "Full name" },
              { name: "business", label: "Business Name", type: "text", placeholder: "Your shop / business name" },
              { name: "phone", label: "Phone / WhatsApp", type: "tel", placeholder: "+91 XXXXX XXXXX" },
              { name: "city", label: "City", type: "text", placeholder: "e.g. Neemuch, Mandsaur, Chittorgarh" },
            ].map((field) => (
              <div key={field.name}>
                <label className="mb-1.5 block text-sm font-medium">{field.label}</label>
                <input
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-lg border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Message (optional)</label>
              <textarea
                name="message"
                rows={3}
                placeholder="Tell us about your requirements..."
                value={form.message}
                onChange={handleChange}
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" variant="dealer" size="lg" className="flex-1 gap-2">
                <MessageCircle className="h-4 w-4" />
                Submit via WhatsApp
              </Button>
              <Button type="button" variant="cta" size="lg" className="flex-1 gap-2" onClick={handleEmail}>
                <Send className="h-4 w-4" />
                Send via Email
              </Button>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default Dealers;
