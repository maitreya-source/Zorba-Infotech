import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, Truck } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const DealerBanner = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 py-10 md:py-14 text-white shadow-inner">
      <div
        ref={ref}
        className={`container relative z-10 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-3.5 py-1 text-xs font-bold text-amber-300 tracking-wide uppercase mb-3.5 shadow-xs">
            For Dealers &amp; Bulk Buyers
          </span>
          <h2 className="text-3xl font-extrabold font-display md:text-4xl text-white tracking-tight leading-tight">
            Partner With Neemuch's Largest IT Distributor
          </h2>
          <p className="mt-3.5 text-sm md:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Get exclusive wholesale pricing, priority stock access, and dedicated support for your retail business.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3.5">
            <Link to="/dealers">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md hover:shadow-lg transition-all">
                Request Bulk Quote
              </Button>
            </Link>
            <Link to="/dealers">
              <Button size="lg" className="border border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md font-semibold">
                Apply for Dealer Pricing
              </Button>
            </Link>
          </div>

          <div className="mt-8 md:mt-10 grid grid-cols-3 gap-3 md:gap-6 pt-6 border-t border-slate-800/80">
            {[
              { icon: Package, label: "4000+ Products", sub: "In stock daily" },
              { icon: TrendingUp, label: "Best Margins", sub: "Competitive rates" },
              { icon: Truck, label: "Fast Dispatch", sub: "Same-day shipping" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center gap-1 p-2.5 md:p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <item.icon className="h-5 w-5 text-amber-400 mb-0.5" />
                <span className="text-xs md:text-sm font-bold text-white">{item.label}</span>
                <span className="text-[11px] text-slate-400">{item.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DealerBanner;
