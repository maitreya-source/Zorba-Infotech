import Layout from "@/components/layout/Layout";
import { Scale } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const TermsOfService = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-14 text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-4">
            <Scale className="h-3.5 w-3.5" />
            Legal
          </span>
          <h1 className="text-3xl font-bold font-display md:text-4xl">Terms of Service</h1>
          <p className="mt-2 text-primary-foreground/70">Last updated: April 13, 2026</p>
        </div>
      </section>

      <section className="container py-14">
        <div
          ref={ref}
          className={`mx-auto max-w-3xl transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="rounded-2xl border bg-card p-8 md:p-10 space-y-8">
            <div>
              <p className="text-muted-foreground leading-relaxed">
                These Terms of Service ("Terms") govern your use of the Zorba Infotech website and
                services. By accessing or using our website, you agree to be bound by these Terms.
              </p>
            </div>

            <Section title="1. Nature of Service">
              <p>
                Zorba Infotech operates as a computer hardware dealer, distributor, and authorized service
                center. Our website serves as a digital catalog and inquiry platform — it is not an
                e-commerce store. All transactions, pricing, and orders are finalized offline through direct
                communication with our team.
              </p>
            </Section>

            <Section title="2. Product Information">
              <p>
                While we strive to keep product information accurate and up-to-date, prices, availability,
                and specifications are subject to change without notice. Product listings on our website are
                for informational purposes only and do not constitute a binding offer.
              </p>
            </Section>

            <Section title="3. Quotations & Pricing">
              <ul className="list-disc pl-5 space-y-2">
                <li>All prices are quoted in Indian Rupees (INR) and are exclusive of applicable taxes unless stated otherwise.</li>
                <li>Quotations provided via WhatsApp, email, or phone are valid for 24 hours unless otherwise specified.</li>
                <li>Dealer/bulk pricing is available upon application and approval through our Dealer Portal.</li>
                <li>GST No: 23AATPM9267A1ZH</li>
              </ul>
            </Section>

            <Section title="4. Sales, Warranty & Returns">
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 mb-4">
                <p className="text-sm font-semibold text-destructive mb-2">Important Policy Notice</p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li><strong>Goods once sold will not be taken back or exchanged.</strong></li>
                  <li>We are not responsible for any breakage, theft, or damage of goods after leaving our premises.</li>
                  <li>In case of warranty period, all courier/transport charges will be paid by the Customer/Dealer.</li>
                  <li>All warranty terms will be as per the manufacturing company's warranty policy.</li>
                  <li>Always bring along a copy of our invoice/challan for any type of warranty repairs, if applicable.</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Warranty claims are processed through our authorized service center. Return and replacement
                policies vary by product category and manufacturer — please confirm at the time of purchase.
              </p>
            </Section>

            <Section title="5. Credit Terms">
              <div className="rounded-xl bg-zorba-orange/5 border border-zorba-orange/20 p-4">
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>All credits will be charged with <strong>compound interest @ 2% per month</strong> after 15 days of bill date.</li>
                  <li>All terms & conditions disclosed in Hindi language and accepted by the customer/dealer.</li>
                </ul>
              </div>
            </Section>

            <Section title="6. Repair Services">
              <ul className="list-disc pl-5 space-y-2">
                <li>Repair estimates are provided after physical inspection of the device.</li>
                <li>Repair timelines are estimates and may vary based on parts availability.</li>
                <li>Devices not collected within 30 days of repair completion will be subject to storage charges.</li>
              </ul>
            </Section>

            <Section title="7. Dealer/B2B Terms">
              <ul className="list-disc pl-5 space-y-2">
                <li>Dealer applications are subject to verification and approval.</li>
                <li>Bulk order pricing, credit terms, and minimum order quantities are determined on a case-by-case basis.</li>
                <li>Dealer pricing is confidential and non-transferable.</li>
              </ul>
            </Section>

            <Section title="8. Intellectual Property">
              <p>
                All content on this website, including text, graphics, logos, and images, is the property of
                Zorba Infotech and is protected under applicable intellectual property laws.
              </p>
            </Section>

            <Section title="9. Limitation of Liability">
              <p>
                Zorba Infotech shall not be liable for any indirect, incidental, or consequential damages
                arising from the use of our website or services. Our total liability shall not exceed the
                amount paid for the specific product or service in question.
              </p>
            </Section>

            <Section title="10. Governing Law">
              <p>
                These Terms shall be governed by the laws of India. Any disputes shall be subject to the
                exclusive jurisdiction of the courts in Neemuch, Madhya Pradesh.
              </p>
            </Section>

            <Section title="11. Contact">
              <p className="mb-3">For questions about these Terms, please contact:</p>
              <ul className="space-y-1.5 text-sm">
                <li>📧 Email: zorbainfotech@gmail.com</li>
                <li>📞 Phone: +91 99935 99730</li>
                <li>📍 Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458 441 (M.P.)</li>
              </ul>
            </Section>
          </div>
        </div>
      </section>
    </Layout>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-t pt-6">
    <h2 className="font-display text-lg font-bold mb-3">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
      {children}
    </div>
  </div>
);

export default TermsOfService;
