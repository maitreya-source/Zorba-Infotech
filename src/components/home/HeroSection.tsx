import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/home/SearchBar";
import { QuickInquiryDialog } from "@/components/common";
import { ArrowRight, Cpu, Monitor, Wrench, MessageSquare, ShieldCheck } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const HeroSection = () => {
  const { ref, isVisible } = useScrollAnimation(0.05);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-gradient-hero py-16 sm:py-20 md:py-24 lg:py-28 text-primary-foreground border-b border-primary-foreground/10">
      {/* Subtle geometric dot grid background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)`,
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      {/* Ambient Lighting Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-80 w-[600px] rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

      <div
        ref={ref}
        className="container relative z-10"
      >
        <div className="mx-auto max-w-3xl text-center space-y-6">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1 text-xs font-semibold backdrop-blur-sm shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Your Trusted Computer Shop in Neemuch for 20+ Years</span>
          </div>

          {/* Display Headline */}
          <h1 className="text-3xl font-extrabold font-display sm:text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.15]">
            Zorba Infotech
            <span
              className="block text-gradient-primary bg-clip-text text-transparent mt-1.5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
              style={{
                backgroundImage: "linear-gradient(135deg, hsl(199 89% 48%), hsl(152 69% 50%))",
              }}
            >
              Computer Hardware, Wholesale IT &amp; Service Center
            </span>
          </h1>

          {/* Concise 2-Line Value Proposition (No Text Wall) */}
          <p className="text-sm sm:text-base text-primary-foreground/80 max-w-xl mx-auto leading-relaxed">
            Wholesale IT distributor, custom PC assembler, and authorized service center — your trusted computer shop in Neemuch with over 4,000 products in stock.
          </p>

          {/* Compact Category-Driven Search Bar */}
          <div className="pt-2 max-w-lg mx-auto">
            <SearchBar />
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap justify-center items-center gap-3">
            <Link to="/catalog">
              <Button variant="hero" size="lg" className="gap-2 rounded-xl font-bold shadow-md">
                Explore Catalog
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Button
              type="button"
              size="lg"
              onClick={() => setInquiryOpen(true)}
              className="border border-emerald-400/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 backdrop-blur-sm font-semibold rounded-xl gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Quick Inquire
            </Button>

            <Link to="/dealers">
              <Button
                size="lg"
                className="border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 backdrop-blur-sm font-semibold rounded-xl"
              >
                Dealer Portal
              </Button>
            </Link>
          </div>

          {/* Centered Quick Metrics & Trust Badges */}
          <div className="pt-8 border-t border-primary-foreground/15 max-w-md mx-auto grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-1">
              <Monitor className="h-4 w-4 text-cyan-400" />
              <span className="text-base sm:text-lg font-bold font-mono font-display">4,000+</span>
              <span className="text-[11px] text-primary-foreground/60">IT Products</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <span className="text-base sm:text-lg font-bold font-mono font-display">20+ Yrs</span>
              <span className="text-[11px] text-primary-foreground/60">In Neemuch</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Wrench className="h-4 w-4 text-amber-400" />
              <span className="text-base sm:text-lg font-bold font-mono font-display">24-48hr</span>
              <span className="text-[11px] text-primary-foreground/60">Fast Repairs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Quick Inquiry Modal */}
      <QuickInquiryDialog
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        source="hero_central_cta"
      />
    </section>
  );
};

export default HeroSection;
