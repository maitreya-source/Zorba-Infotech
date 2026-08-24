import { Wrench, ShieldCheck, Clock, Users } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  { icon: ShieldCheck, title: "Authorized Service Center", desc: "Factory-trained technicians for all major brands." },
  { icon: Wrench, title: "Expert Repairs", desc: "Laptop, desktop & printer repairs with genuine parts." },
  { icon: Clock, title: "Quick Turnaround", desc: "Most repairs completed within 24-48 hours." },
  { icon: Users, title: "B2B Solutions", desc: "Complete IT infrastructure setup for businesses." },
];

const FeatureCard = ({ f }: { f: typeof features[0]; index: number }) => {
  return (
    <div className="rounded-2xl border bg-card p-6 card-hover transition-all">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 hover:scale-110">
        <f.icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">{f.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
    </div>
  );
};

const ServicesSection = () => (
  <section className="bg-zorba-surface/60 border-y py-14 md:py-18">
    <div className="container">
      <div className="mb-10 text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          Why Zorba Infotech
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display tracking-tight text-foreground">
          Built for Businesses, Dealers &amp; Consumers
        </h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Trusted across Neemuch and the Malwa region for over 20 years.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <FeatureCard key={f.title} f={f} index={i} />
        ))}
      </div>
    </div>
  </section>
);

export default ServicesSection;
