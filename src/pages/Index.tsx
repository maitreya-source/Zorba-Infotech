import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import CategoryGrid from "@/components/home/CategoryGrid";
import DealerBanner from "@/components/home/DealerBanner";
import ServicesSection from "@/components/home/ServicesSection";

const Index = () => (
  <Layout>
    <HeroSection />
    <CategoryGrid />
    <DealerBanner />
    <ServicesSection />
  </Layout>
);

export default Index;
