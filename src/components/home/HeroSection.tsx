import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/home/SearchBar";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0">
      <img src={heroBg} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-hero/90" />
    </div>
    <div className="container relative z-10 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center text-primary-foreground">
        <span className="inline-block rounded-full bg-primary-foreground/10 px-4 py-1 text-sm font-medium backdrop-blur-sm mb-4">
          Neemuch's #1 Computer Hardware Destination
        </span>
        <h1 className="text-4xl font-bold font-display leading-tight md:text-5xl lg:text-6xl">
          Your Complete IT Partner
        </h1>
        <p className="mt-4 text-lg text-primary-foreground/80">
          Wholesale distribution, custom PC builds, repair services & complete IT solutions for consumers and businesses.
        </p>
        <div className="mt-8">
          <SearchBar />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/products">
            <Button variant="hero" size="lg">Browse Catalog</Button>
          </Link>
          <Link to="/pc-builder">
            <Button variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              Build Your PC
            </Button>
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
