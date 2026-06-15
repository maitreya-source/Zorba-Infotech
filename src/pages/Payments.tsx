import Layout from "@/components/layout/Layout";
import { SEO, BreadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, CreditCard, QrCode, Building2, Landmark } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { QRCodeSVG } from "qrcode.react";

const ZORBA_INFOTECH = {
  name: "ZORBA INFOTECH",
  upiId: "9993599730-1@okbizaxis",
  upiName: "ZORBA INFOTECH",
  phone: "+919993599730",
  phoneDisplay: "99935 99730",
  bankLogo: "https://upload.wikimedia.org/wikipedia/commons/1/12/ICICI_Bank_Logo.svg",
  bank: {
    accountName: "Zorba Infotech, Neemuch",
    type: "Current Account",
    accountNo: "6580 05 111935",
    ifsc: "ICIC0006580",
    bankName: "ICICI Bank",
    branch: "Sajjan Tower, Favvara Chowk, Neemuch Cantt.",
  },
};

const ZORBA_SALES = {
  name: "ZORBA SALES AND SERVICE",
  subtitle: "Sister Concern Firm",
  upiId: "9302199730@sbi",
  upiName: "ZORBA SALES AND SERVICE",
  phone: "+919302199730",
  phoneDisplay: "93021 99730",
  bankLogo: "https://upload.wikimedia.org/wikipedia/en/5/58/State_Bank_of_India_logo.svg",
  bank: {
    accountName: "Zorba Sales And Service, Neemuch",
    type: "Current Account",
    accountNo: "3777 3733 966",
    ifsc: "SBIN0010215",
    bankName: "State Bank of India",
    branch: "Tagore Marg Branch (Code: 10215)",
  },
};

type Entity = typeof ZORBA_INFOTECH | typeof ZORBA_SALES;

const PaymentCard = ({ entity }: { entity: Entity }) => {
  const { ref, isVisible } = useScrollAnimation();
  const upiUri = `upi://pay?pa=${entity.upiId}&pn=${encodeURIComponent(entity.upiName)}&cu=INR`;

  const bankRows = [
    ["Account Name", entity.bank.accountName],
    ["Account Type", entity.bank.type],
    ["Account No.", entity.bank.accountNo],
    ["IFSC Code", entity.bank.ifsc],
    ["Bank", entity.bank.bankName],
    ["Branch", entity.bank.branch],
  ];

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-hero p-6 text-primary-foreground text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl font-bold">{entity.name}</h2>
          {"subtitle" in entity && (
            <p className="text-sm text-primary-foreground/70 mt-1">
              {(entity as typeof ZORBA_SALES).subtitle}
            </p>
          )}
        </div>

        <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col">
          {/* UPI Section */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <QrCode className="h-5 w-5 text-primary" />
              <h3 className="font-display font-bold text-lg">Scan to Pay (UPI)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Use any UPI app — Google Pay, PhonePe, Paytm, or your bank app
            </p>

            <div className="mx-auto mb-4 w-56 rounded-xl border-2 border-dashed border-primary/20 bg-white p-3">
              <QRCodeSVG value={upiUri} size={200} level="H" className="mx-auto" />
            </div>

            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground mb-0.5">UPI ID</p>
              <p className="font-mono text-sm font-bold text-foreground select-all">
                {entity.upiId}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              or pay via Bank Transfer
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Bank Details */}
          <div className="flex-1">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Landmark className="h-5 w-5 text-primary" />
              <h3 className="font-display font-bold text-lg">Bank Details</h3>
            </div>

            {/* Bank Logo */}
            <div className="flex justify-center mb-4">
              <div className="h-10 bg-white rounded-lg px-4 py-1.5 flex items-center justify-center border">
                <img
                  src={entity.bankLogo}
                  alt={entity.bank.bankName}
                  className="h-7 w-auto object-contain"
                />
              </div>
            </div>

            <div className="rounded-xl border bg-secondary/30 divide-y divide-border">
              {bankRows.map(([label, value]) => (
                <div key={label} className="flex justify-between items-center px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold text-foreground text-right select-all">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Note + CTAs */}
          <div className="mt-auto space-y-4">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              After payment, please share the transaction screenshot via WhatsApp for confirmation.
            </p>

            <div className="flex gap-3">
              <a href={`tel:${entity.phone}`} className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              </a>
              <a
                href={`https://wa.me/${entity.phone.replace("+", "")}?text=Hi%20${encodeURIComponent(entity.name)}%2C%20I%20made%20a%20payment.`}
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
      </div>
    </div>
  );
};

const Payments = () => {
  return (
    <Layout>
      <SEO
        title="Payment Methods – Zorba Infotech | UPI, Bank Transfer & More"
        description="Pay Zorba Infotech via UPI, NEFT/RTGS bank transfer or cash. UPI ID: 9993599730-1@okbizaxis. ICICI Bank current account. Secure & hassle-free payments for IT purchases in Neemuch."
        path="/payments"
      />
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Payments", url: "/payments" }]} />
      <section className="bg-gradient-hero py-16 text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-4">
            <CreditCard className="h-3.5 w-3.5" />
            Secure Payments
          </span>
          <h1 className="text-3xl font-bold font-display md:text-4xl">Payment Options</h1>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">
            Pay via UPI or Bank Transfer. Choose the appropriate entity below.
          </p>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
          <PaymentCard entity={ZORBA_INFOTECH} />
          <PaymentCard entity={ZORBA_SALES} />
        </div>
      </section>
    </Layout>
  );
};

export default Payments;
