import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, Truck } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const DealerBanner = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className="bg-gradient-dealer py-10 md:py-12 text-primary-foreground">
      <div
        ref={ref}
        className={`container transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-zorba-orange/20 px-4 py-1 text-sm font-semibold text-zorba-orange mb-4">
            For Dealers & Bulk Buyers
          </span>
          <h2 className="text-3xl font-bold font-display md:text-4xl">
            Partner With Neemuch's Largest IT Distributor
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Get exclusive wholesale pricing, priority stock access, and dedicated support for your retail business.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/dealers">
              <Button variant="dealer" size="lg">
                Request Bulk Quote
              </Button>
            </Link>
            <Link to="/dealers">
              <Button size="lg" className="border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 backdrop-blur-sm font-semibold">
                Apply for Dealer Pricing
              </Button>
            </Link>
          </div>

          <div className="mt-8 md:mt-10 grid grid-cols-3 gap-6">
            {[
              { icon: Package, label: "4000+ Products", sub: "In stock daily" },
              { icon: TrendingUp, label: "Best Margins", sub: "Competitive rates" },
              { icon: Truck, label: "Fast Dispatch", sub: "Same-day shipping" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <item.icon className="h-6 w-6 text-zorba-orange" />
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-xs text-primary-foreground/60">{item.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DealerBanner;
