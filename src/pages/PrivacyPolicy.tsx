import Layout from "@/components/layout/Layout";
import { ShieldCheck } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const PrivacyPolicy = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-14 text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            Legal
          </span>
          <h1 className="text-3xl font-bold font-display md:text-4xl">Privacy Policy</h1>
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
                Zorba Infotech ("we", "our", or "us") operates the website zorbainfotech.lovable.app. This
                page informs you of our policies regarding the collection, use, and disclosure of personal
                information when you use our website or services.
              </p>
            </div>

            <Section title="Information We Collect">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Contact Information:</strong> Name, phone number, email address, and business name when you submit inquiry or dealer application forms.</li>
                <li><strong>Usage Data:</strong> Browser type, pages visited, time spent on pages, and other diagnostic data collected automatically.</li>
                <li><strong>Communication Data:</strong> Messages sent via WhatsApp, email, or our contact forms regarding product inquiries, service requests, or dealer applications.</li>
              </ul>
            </Section>

            <Section title="How We Use Your Information">
              <ul className="list-disc pl-5 space-y-2">
                <li>To respond to your product inquiries and service requests.</li>
                <li>To process dealer/bulk buyer applications and provide quotations.</li>
                <li>To improve our website and services.</li>
                <li>To communicate about orders, repairs, and service updates.</li>
                <li>To comply with applicable laws and regulations.</li>
              </ul>
            </Section>

            <Section title="Sales & Transaction Policy">
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4">
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li><strong>Goods once sold will not be taken back or exchanged.</strong></li>
                  <li>We are not responsible for any breakage, theft, or damage of goods after leaving our premises.</li>
                  <li>In case of warranty period, all courier/transport charges will be paid by the Customer/Dealer.</li>
                  <li>All warranty terms will be as per the manufacturing company's warranty policy.</li>
                  <li>Always bring along a copy of our invoice/challan for any type of warranty repairs, if applicable.</li>
                  <li>All credits will be charged with <strong>compound interest @ 2% per month</strong> after 15 days of bill date.</li>
                  <li>All terms & conditions disclosed in Hindi language and accepted by the customer/dealer.</li>
                </ul>
              </div>
            </Section>

            <Section title="Data Sharing">
              <p>
                We do not sell, trade, or rent your personal information to third parties. We may share
                information with trusted service providers who assist in operating our business (e.g.,
                logistics partners for product delivery) under strict confidentiality agreements.
              </p>
            </Section>

            <Section title="Data Security">
              <p>
                We implement commercially reasonable security measures to protect your personal information.
                However, no method of transmission over the internet is 100% secure, and we cannot guarantee
                absolute security.
              </p>
            </Section>

            <Section title="Cookies">
              <p>
                Our website may use cookies to enhance your browsing experience. You can choose to disable
                cookies through your browser settings, though some features may not function properly.
              </p>
            </Section>

            <Section title="Third-Party Links">
              <p>
                Our website may contain links to external sites (e.g., GeM Portal, IndiaMart, social media
                platforms). We are not responsible for the privacy practices of these third-party sites.
              </p>
            </Section>

            <Section title="Your Rights">
              <p>
                You may request access to, correction of, or deletion of your personal information by
                contacting us at zorbainfotech@gmail.com or calling +91 99935 99730.
              </p>
            </Section>

            <Section title="Changes to This Policy">
              <p>
                We may update this Privacy Policy periodically. Changes will be posted on this page with an
                updated revision date.
              </p>
            </Section>

            <Section title="Contact Us">
              <p className="mb-3">If you have any questions about this Privacy Policy, please contact us:</p>
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

export default PrivacyPolicy;
