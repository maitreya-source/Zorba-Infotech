import { Wrench, ShieldCheck, Clock, Users } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Authorized Service Center", desc: "Factory-trained technicians for all major brands." },
  { icon: Wrench, title: "Expert Repairs", desc: "Laptop, desktop & printer repairs with genuine parts." },
  { icon: Clock, title: "Quick Turnaround", desc: "Most repairs completed within 24-48 hours." },
  { icon: Users, title: "B2B Solutions", desc: "Complete IT infrastructure setup for businesses." },
];

const ServicesSection = () => (
  <section className="bg-zorba-surface py-16">
    <div className="container">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold font-display">Why Choose Zorba?</h2>
        <p className="mt-2 text-muted-foreground">Trusted by hundreds of businesses across the region</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6 card-hover">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ServicesSection;
