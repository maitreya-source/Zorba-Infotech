import Layout from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Scale, ShoppingCart, Wrench, FileText } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const TermsOfService = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <Layout>
      <SEO
        title="Terms & Conditions – Zorba Infotech"
        description="Terms and conditions for sales, warranty, service & technical support at Zorba Infotech, Neemuch. Read our official declaration before making a purchase."
        path="/terms-of-service"
      />

      {/* Hero */}
      <section className="bg-gradient-hero py-14 text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-4">
            <Scale className="h-3.5 w-3.5" />
            Legal
          </span>
          <h1 className="text-3xl font-bold font-display md:text-4xl">Terms & Conditions</h1>
          <p className="mt-1 text-primary-foreground/60 text-sm font-medium tracking-wide uppercase">
            Declaration of Zorba Infotech
          </p>
          <p className="mt-3 text-primary-foreground/70">Last updated: April 24, 2026</p>
        </div>
      </section>

      <section className="container py-14">
        <div
          ref={ref}
          className={`mx-auto max-w-3xl transition-all duration-700 space-y-6 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Sales Terms */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center gap-3 bg-primary/5 border-b px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <h2 className="font-display text-lg font-bold">Terms for Sales</h2>
            </div>
            <ul className="divide-y">
              {[
                "Goods once sold will not be taken back or exchanged.",
                "All credit amounts and overdue invoices will be charged with compound interest @ 2% per month after 15 days of the bill date.",
                "Cheque bouncing charges: minimum ₹1,000 or 1% of the cheque amount — non-negotiable.",
                "We are not responsible for any type of online scheme. Customers must directly claim their online scheme from the respective company.",
                "Toll-free complaint registration and online product registration is the customer's responsibility.",
                "We are not responsible for any breakage, theft, or damage of goods after leaving our premises.",
                "Subject to Neemuch jurisdiction only.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 px-6 py-3.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Service Terms */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center gap-3 bg-zorba-orange/5 border-b px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zorba-orange/10 text-zorba-orange">
                <Wrench className="h-4 w-4" />
              </div>
              <h2 className="font-display text-lg font-bold">Terms for Service & Technical Support</h2>
            </div>
            <ul className="divide-y">
              {[
                "During warranty / non-warranty repair, all courier/transport charges for parcels sent to company service centers will be paid by the Customer/Dealer, along with any repair or estimate charges quoted by the service center.",
                "For parcels sent to external / company Authorized Service Centers (A.S.P.), the customer bears all two-way courier charges and any service center charges quoted.",
                "No warranty support will be provided if your payment is outstanding.",
                "We are not responsible for any software support or data loss.",
                "All warranty terms will be as per the manufacturing company's warranty policy.",
                "Always bring a copy of our invoice/challan for any type of warranty repair, if applicable.",
                "Virus cleaning, data backup, hard disk reconfiguring, and repair work will be charged extra and carried out at owner's risk.",
                "Goods under warranty will be repaired or replaced by their respective vendors or Authorized Service Partners (A.S.P.).",
                "Warranty will be void if the warranty seal is broken, or the product has physical damage or burning marks.",
                "Warranty is not applicable due to water exposure, getting wet, or submersion in water. / पानी लगने या गीला होने की वजह, पानी में डूबने की वजह से वारंटी नहीं मिलती है।",
                "No warranty for products priced below ₹500.",
                "Proper earthing must be compulsorily maintained at your premises.",
                "Minimum replacement charges: ₹100 | Minimum service call charges: ₹200 (by cash, compulsory).",
                "One-year On-Site Care Pack: ₹2,500 + GST extra.",
                "Visit charge for any technician on-site: ₹450 for the first two hours.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 px-6 py-3.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zorba-orange/50" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            {/* Software note */}
            <div className="mx-6 mb-6 mt-2 rounded-xl bg-muted/50 border p-4 text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Note:</strong> Any storage device supplied/sold by us and
              mentioned in the invoice is sold to you as hardware only. It is your sole responsibility to
              ensure you use genuine, licensed software. We are not responsible for any pirated software —
              whether loaded by you or any third party.
            </div>
          </div>

          {/* Declaration */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center gap-3 bg-zorba-green/5 border-b px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zorba-green/10 text-zorba-green">
                <FileText className="h-4 w-4" />
              </div>
              <h2 className="font-display text-lg font-bold">Declaration</h2>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                Goods once sold will not be taken back or exchanged. We are not responsible for any
                breakage, theft, or damage of goods after leaving our premises. For all parcels sent to
                company authorized service centers, <strong className="text-foreground">the customer/dealer
                bears all courier/transport charges and any charges quoted by the service center</strong>.
                All warranty terms will be as per the manufacturing company's warranty policy. Always bring
                a copy of our invoice/challan for any type of warranty repair.
              </p>
              <p>
                All credit amounts and overdue invoices will be charged with <strong className="text-foreground">compound
                interest @ 2% per month</strong> after 15 days of bill date.
              </p>
              <p>
                सर्विस सेंटर भेजे जाने वाले पार्सल का कूरियर खर्च एवं सर्विस सेंटर द्वारा निर्धारित समस्त शुल्क ग्राहक/डीलर द्वारा ही वहन किया जाएगा।
              </p>
              <p>
                Warranty is not applicable due to water exposure, getting wet, or submersion in water.
              </p>
              <p className="font-medium text-foreground">
                पानी लगने या गीला होने की वजह, पानी में डूबने की वजह से वारंटी नहीं मिलती है।
              </p>
              <p className="border-t pt-4">
                All terms &amp; conditions are disclosed in both English and Hindi and are deemed accepted by the
                customer/dealer upon purchase and service booking.
              </p>
            </div>

            {/* Signature lines */}
            <div className="grid grid-cols-2 gap-8 px-6 pb-8 pt-2">
              <div>
                <div className="border-b border-dashed border-muted-foreground/40 pb-1 mb-2" />
                <p className="text-xs text-muted-foreground">Customer / Dealer Signature</p>
              </div>
              <div>
                <div className="border-b border-dashed border-muted-foreground/40 pb-1 mb-2" />
                <p className="text-xs text-muted-foreground">Zorba Infotech (Authorised Signatory)</p>
              </div>
            </div>
          </div>

          {/* Governing law & contact */}
          <div className="rounded-2xl border bg-card p-6 space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Governing Law</h3>
              <p>These terms shall be governed by the laws of India. All disputes are subject to the exclusive jurisdiction of courts in <strong className="text-foreground">Neemuch, Madhya Pradesh</strong>.</p>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold text-foreground mb-2">Contact</h3>
              <ul className="space-y-1">
                <li>Email: zorbainfotech@gmail.com</li>
                <li>Phone: +91 99935 99730</li>
                <li>Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458 441 (M.P.)</li>
                <li className="text-xs pt-1">GST: 23AATPM9267A1ZH</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TermsOfService;
