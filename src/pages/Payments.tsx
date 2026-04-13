import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, CreditCard, QrCode } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import upiQr from "@/assets/upi-qr.png";

const Payments = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <Layout>
      <section className="bg-gradient-hero py-16 text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-4">
            <CreditCard className="h-3.5 w-3.5" />
            Secure Payments
          </span>
          <h1 className="text-3xl font-bold font-display md:text-4xl">Pay via UPI</h1>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">
            Scan the QR code below or use our UPI ID to make payments directly to Zorba Infotech.
          </p>
        </div>
      </section>

      <section className="container py-16">
        <div
          ref={ref}
          className={`mx-auto max-w-md transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <QrCode className="h-7 w-7" />
            </div>

            <h2 className="font-display text-xl font-bold mb-2">Scan to Pay</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Use any UPI app — Google Pay, PhonePe, Paytm, or your bank app
            </p>

            {/* QR Code */}
            <div className="mx-auto mb-6 w-64 rounded-xl border-2 border-dashed border-primary/20 bg-background p-4">
              <img
                src={upiQr}
                alt="Zorba Infotech UPI QR Code"
                className="w-full rounded-lg"
                width={256}
                height={256}
              />
            </div>

            {/* UPI ID */}
            <div className="rounded-xl bg-secondary/50 p-4 mb-6">
              <p className="text-xs text-muted-foreground mb-1">UPI ID</p>
              <p className="font-mono text-lg font-bold text-foreground select-all">
                9993599730-1@okbizaxis
              </p>
            </div>

            <div className="rounded-xl bg-secondary/50 p-4 mb-6">
              <p className="text-xs text-muted-foreground mb-1">Business Name</p>
              <p className="font-semibold text-foreground">ZORBA INFOTECH</p>
              <p className="text-sm text-muted-foreground">+91 99935 99730</p>
            </div>

            {/* Info note */}
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              After payment, please share the transaction screenshot via WhatsApp for confirmation.
            </p>

            {/* CTAs */}
            <div className="flex gap-3">
              <a href="tel:+919993599730" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              </a>
              <a
                href="https://wa.me/919993599730?text=Hi%20Zorba%20Infotech%2C%20I%20made%20a%20payment."
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
        </div>
      </section>
    </Layout>
  );
};

export default Payments;
