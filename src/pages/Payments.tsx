import Layout from "@/components/layout/Layout";
import { SEO, BreadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Phone, MessageCircle, CreditCard, QrCode, Building2, Landmark, Copy, Check, Zap, ArrowUpRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { QRCodeSVG } from "qrcode.react";

const ZORBA_INFOTECH = {
  name: "ZORBA INFOTECH",
  categoryTag: "💻 कंप्यूटर रिपेयरिंग, सर्विस व पार्ट्स (Service & Repair)",
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
  categoryTag: "🛒 नया लैपटॉप, प्रिंटर व नया हार्डवेयर (New Hardware Sales)",
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const upiUri = `upi://pay?pa=${entity.upiId}&pn=${encodeURIComponent(entity.upiName)}&cu=INR`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text.replace(/\s+/g, ""));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const bankRows = [
    { label: "Account Name", value: entity.bank.accountName, copyable: false },
    { label: "Account Type", value: entity.bank.type, copyable: false },
    { label: "Account No.", value: entity.bank.accountNo, copyable: true, key: "acc_no" },
    { label: "IFSC Code", value: entity.bank.ifsc, copyable: true, key: "ifsc" },
    { label: "Bank", value: entity.bank.bankName, copyable: false },
    { label: "Branch", value: entity.bank.branch, copyable: false },
  ];

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-card shadow-sm overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-hero p-5 md:p-6 text-primary-foreground text-center">
          <div className="mx-auto mb-2.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-xs">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-white/15 text-xs font-semibold mb-2">
            {entity.categoryTag}
          </div>
          <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">{entity.name}</h2>
          {"subtitle" in entity && (
            <p className="text-xs text-primary-foreground/75 mt-0.5 font-medium">
              {(entity as typeof ZORBA_SALES).subtitle}
            </p>
          )}
        </div>

        <div className="p-5 md:p-8 space-y-6 flex-1 flex flex-col">
          {/* UPI Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Scan or 1-Tap Pay (UPI)
              </h3>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground max-w-xs mx-auto">
              Google Pay • PhonePe • Paytm • BHIM • Any UPI App
            </p>

            {/* Direct 1-Tap Mobile UPI Launch Button */}
            <div className="pt-1">
              <a
                href={upiUri}
                className="group w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition-all px-4"
              >
                <Zap className="h-5 w-5 fill-amber-300 text-amber-300" />
                <span>PhonePe / GPay / Paytm से पे करें</span>
                <ArrowUpRight className="h-4 w-4 opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                (Tap to directly open your preferred payment app on mobile)
              </p>
            </div>

            {/* QR Code Frame */}
            <div className="mx-auto w-56 rounded-2xl border-2 border-dashed border-blue-500/30 bg-white p-3 shadow-xs">
              <QRCodeSVG value={upiUri} size={200} level="H" className="mx-auto" />
            </div>

            {/* Copy UPI ID Box */}
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800/70 p-3.5 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
              <div className="text-left overflow-hidden">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  UPI ID (VPA)
                </p>
                <p className="font-mono text-sm md:text-base font-bold text-slate-900 dark:text-white truncate select-all">
                  {entity.upiId}
                </p>
              </div>
              <Button
                type="button"
                variant={copiedKey === "upi" ? "default" : "outline"}
                size="sm"
                onClick={() => copyToClipboard(entity.upiId, "upi")}
                className={`h-11 px-3.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                  copiedKey === "upi"
                    ? "bg-emerald-600 hover:bg-emerald-600 text-white border-transparent"
                    : "border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {copiedKey === "upi" ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    <span>Copy ID</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              or Bank Transfer (NEFT / IMPS)
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Bank Details */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-display font-bold text-base md:text-lg text-slate-900 dark:text-white">
                Bank Account Details
              </h3>
            </div>

            {/* Bank Logo */}
            <div className="flex justify-center">
              <div className="h-11 bg-white rounded-xl px-4 py-1.5 flex items-center justify-center border shadow-2xs">
                <img
                  src={entity.bankLogo}
                  alt={entity.bank.bankName}
                  className="h-7 w-auto object-contain"
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-secondary/30 divide-y divide-border overflow-hidden">
              {bankRows.map((row) => (
                <div key={row.label} className="flex justify-between items-center px-4 py-3 text-xs md:text-sm">
                  <span className="text-muted-foreground font-medium">{row.label}</span>
                  <div className="flex items-center gap-2 text-right">
                    <span className="font-semibold text-foreground font-mono select-all">
                      {row.value}
                    </span>
                    {row.copyable && row.key && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(row.value, row.key!)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          copiedKey === row.key
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600"
                        }`}
                        title={`Copy ${row.label}`}
                      >
                        {copiedKey === row.key ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Note + CTAs */}
          <div className="mt-auto space-y-4 pt-2">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              पेमेंट के बाद कृपया स्क्रीनशॉट वॉट्सऐप पर भेजें ताकि तुरंत रसीद कन्फर्म हो सके।
            </p>

            <div className="grid grid-cols-2 gap-3">
              <a href={`tel:${entity.phone}`}>
                <Button variant="outline" className="w-full h-12 rounded-xl gap-2 font-bold text-sm">
                  <Phone className="h-4 w-4 text-blue-600" />
                  Call Showroom
                </Button>
              </a>
              <a
                href={`https://wa.me/${entity.phone.replace("+", "")}?text=Hi%20${encodeURIComponent(entity.name)}%2C%20I%20have%20made%20a%20payment.`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="whatsapp" className="w-full h-12 rounded-xl gap-2 font-bold text-sm">
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
