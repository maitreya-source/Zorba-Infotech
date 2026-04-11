import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/home/SearchBar";
import { ArrowRight, Cpu, Monitor, Wrench } from "lucide-react";

const HeroSection = () => (
  <section className="relative overflow-hidden bg-gradient-hero">
    {/* Subtle geometric pattern */}
    <div className="absolute inset-0 opacity-[0.04]">
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />
    </div>

    <div className="container relative z-10 py-20 md:py-28 lg:py-36">
      <div className="mx-auto max-w-3xl text-center text-primary-foreground">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-6">
          <span className="h-2 w-2 rounded-full bg-zorba-green animate-pulse" />
          Neemuch's #1 Computer Hardware Destination
        </span>
        <h1 className="text-4xl font-bold font-display leading-tight md:text-5xl lg:text-6xl tracking-tight">
          Your Complete
          <span className="block text-gradient-primary bg-clip-text text-transparent" style={{
            backgroundImage: 'linear-gradient(135deg, hsl(199 89% 48%), hsl(152 69% 50%))'
          }}>
            IT Partner
          </span>
        </h1>
        <p className="mt-5 text-lg text-primary-foreground/70 max-w-xl mx-auto leading-relaxed">
          Wholesale distribution, custom PC builds, repair services & complete IT solutions for consumers and businesses.
        </p>
        <div className="mt-8 max-w-lg mx-auto">
          <SearchBar />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/pc-builder">
            <Button variant="hero" size="lg" className="gap-2">
              Build Your PC
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/dealers">
            <Button size="lg" className="border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 backdrop-blur-sm font-semibold">
              Dealer Portal
            </Button>
          </Link>
          <Link to="/contact">
            <Button size="lg" className="border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 backdrop-blur-sm font-semibold">
              Contact Us
            </Button>
          </Link>
        </div>

        {/* Quick stats */}
        <div className="mt-14 grid grid-cols-3 gap-6 max-w-md mx-auto">
          {[
            { icon: Monitor, value: "500+", label: "Products" },
            { icon: Cpu, value: "10+", label: "Years Exp." },
            { icon: Wrench, value: "24hr", label: "Repairs" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1.5">
              <stat.icon className="h-5 w-5 text-primary-foreground/50" />
              <span className="text-xl font-bold font-display">{stat.value}</span>
              <span className="text-xs text-primary-foreground/50">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
