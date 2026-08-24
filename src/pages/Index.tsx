import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import CategoryGrid from "@/components/home/CategoryGrid";
import DealerBanner from "@/components/home/DealerBanner";
import ServicesSection from "@/components/home/ServicesSection";
import { SEO, FAQSchema } from "@/components/SEO";

const HOMEPAGE_FAQS = [
  {
    question: "Where is Zorba Infotech located and what are the showroom timings?",
    answer:
      "Zorba Infotech is located at Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch (MP) 458441. Open Monday to Saturday from 10:30 AM to 10:00 PM.",
  },
  {
    question: "Do you sell laptops, printers, and custom desktop computers in Neemuch?",
    answer:
      "Yes. We stock official laptops from HP, Dell, Lenovo, Asus, and Acer, printers from Epson, Canon, and HP, plus custom assembled gaming and workstation PCs.",
  },
  {
    question: "Do you provide authorized computer and laptop repair services in Neemuch?",
    answer:
      "Yes. Our in-house authorized service center offers chip-level diagnostics, laptop screen and battery replacement, printer maintenance, and CCTV camera installation.",
  },
  {
    question: "Do you supply IT products for businesses, schools, and government (GeM)?",
    answer:
      "Yes. Zorba Infotech is registered on the Government of India GeM Portal and provides wholesale IT distribution with official GST invoices.",
  },
];

const Index = () => (
  <Layout>
    <SEO
      title="Zorba Infotech – Best Computer Shop in Neemuch | Laptops, Printers & IT Hardware"
      description="Your trusted computer shop in Neemuch for 20+ years. Wholesale IT distributor, custom PC assembler, and authorized service center with 4,000+ products in stock."
      path="/"
    />
    <FAQSchema items={HOMEPAGE_FAQS} />
    <HeroSection />
    <CategoryGrid />
    <ServicesSection />
    <DealerBanner />
  </Layout>
);

export default Index;
