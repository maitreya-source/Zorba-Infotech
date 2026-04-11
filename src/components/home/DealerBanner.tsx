import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, Truck } from "lucide-react";

const DealerBanner = () => (
  <section className="bg-gradient-dealer py-16 text-primary-foreground">
    <div className="container">
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
            <Button variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              Apply for Dealer Pricing
            </Button>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6">
          {[
            { icon: Package, label: "500+ Products", sub: "In stock daily" },
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

export default DealerBanner;
