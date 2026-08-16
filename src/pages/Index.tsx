import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import CategoryGrid from "@/components/home/CategoryGrid";
import DealerBanner from "@/components/home/DealerBanner";
import ServicesSection from "@/components/home/ServicesSection";
import LocalSEOSection from "@/components/home/LocalSEOSection";
import { SEO } from "@/components/SEO";

const Index = () => (
  <Layout>
    <SEO
      title="Zorba Infotech – Computer Hardware Dealer & IT Distributor, Neemuch"
      description="Zorba Infotech – Neemuch's #1 computer hardware dealer, wholesale IT distributor & service center. Laptops, desktops, CCTV, networking, biometrics & custom PC builds. 4,000+ IT products. Shop No. 5 & 6, U-Shape Market, Neemuch MP."
      path="/"
    />
    <HeroSection />
    <CategoryGrid />
    <ServicesSection />
    <DealerBanner />
    <LocalSEOSection />
  </Layout>
);

export default Index;
