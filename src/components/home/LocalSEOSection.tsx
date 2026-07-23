import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { FAQSchema } from "@/components/SEO";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

// Nearby areas we realistically serve — helps local relevance for surrounding towns.
const serviceAreas = [
  "Neemuch",
  "Manasa",
  "Jawad",
  "Singoli",
  "Ratangarh",
  "Jiran",
  "Nimbahera",
  "Chittorgarh",
];

const faqs = [
  {
    question: "Which is the best computer shop in Neemuch?",
    answer:
      "Zorba Infotech is one of Neemuch's leading computer shops and IT distributors, offering 4,000+ products — laptops, desktops, CCTV, networking, biometrics, printers and custom PC builds — with an authorized service centre. Visit Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch.",
  },
  {
    question: "Do you sell laptops and desktops in Neemuch?",
    answer:
      "Yes. Zorba Infotech is a computer and laptop dealer in Neemuch stocking all major brands of laptops, desktops, monitors and PC components, plus custom-assembled computers for home, office and gaming.",
  },
  {
    question: "Do you provide computer repair and service in Neemuch?",
    answer:
      "Yes. We are an authorized computer service centre in Neemuch offering laptop and desktop repair, component-level service, CCTV and networking installation, and annual maintenance contracts (AMC) for schools and offices.",
  },
  {
    question: "Where is Zorba Infotech located and what are the timings?",
    answer:
      "Zorba Infotech is at Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458441, Madhya Pradesh. We are open Monday to Saturday, 10:30 AM to 10:00 PM. Call +91 99935 99730.",
  },
  {
    question: "Do you supply computers to businesses, schools and government (GeM)?",
    answer:
      "Yes. We are a wholesale IT distributor serving dealers, businesses, schools and institutions, and all our computer-related items are available through the Government of India's authorized GeM Portal.",
  },
];

const LocalSEOSection = () => {
  const { ref, isVisible } = useScrollAnimation(0.05);

  return (
    <section className="border-t bg-background">
      <FAQSchema items={faqs} />
      <div
        ref={ref}
        className={`container py-16 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold font-display md:text-3xl">
            Your Trusted Computer Shop &amp; IT Dealer in Neemuch, Madhya Pradesh
          </h2>
          <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              <strong>Zorba Infotech</strong> is a leading <strong>computer hardware dealer,
              wholesale IT distributor and authorized service center in Neemuch</strong>, Madhya
              Pradesh. With over 20 years of experience and 4,000+ IT products, we are the
              one-stop destination for <strong>laptops, desktops, PC components, CCTV camera
              systems, networking equipment, biometric devices, printers and custom PC builds</strong>{" "}
              — for homes, offices, schools and businesses.
            </p>
            <p>
              Looking for a <strong>computer shop near you in Neemuch</strong> or a reliable{" "}
              <strong>laptop &amp; computer dealer in Madhya Pradesh</strong>? From individual
              buyers to bulk and dealer orders, we offer genuine products, competitive wholesale
              pricing and an authorized <strong>computer repair &amp; service center</strong>. All
              computer-related items are also available through the Government of India's authorized{" "}
              <strong>GeM Portal</strong>.
            </p>
          </div>

          {/* Service areas */}
          <div className="mt-8">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              Serving Neemuch &amp; nearby areas
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {serviceAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Hiring banner */}
          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm leading-relaxed">
              💼 <strong>We're hiring in Neemuch, MP &amp; Rajasthan!</strong> Computer Hardware
              Technician, Networking Engineer &amp; Computer Service Engineer roles are open —
              freshers &amp; experienced welcome.{" "}
              <Link to="/careers" className="font-semibold text-primary hover:underline">
                View job openings →
              </Link>
            </p>
          </div>

          {/* FAQ */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold font-display md:text-3xl">
              Frequently Asked Questions
            </h2>
            <div className="mt-5 space-y-4">
              {faqs.map((f) => (
                <div key={f.question} className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold">{f.question}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocalSEOSection;
