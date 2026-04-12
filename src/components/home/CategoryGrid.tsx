import { Link } from "react-router-dom";
import {
  Monitor, Cpu, HardDrive, Printer, Keyboard, Camera, Wifi, Shield, Fingerprint, School,
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const categories = [
  { icon: Monitor, label: "Laptops & Desktops", desc: "HP, Dell, Lenovo & more" },
  { icon: Cpu, label: "Components", desc: "CPUs, Motherboards, RAM" },
  { icon: HardDrive, label: "Storage & SSDs", desc: "SSDs, HDDs, NVMe" },
  { icon: Printer, label: "Printers & Scanners", desc: "Inkjet, LaserJet, MFPs" },
  { icon: Keyboard, label: "Accessories", desc: "Keyboards, Mice, Cables" },
  { icon: Camera, label: "CCTV & Security", desc: "IP Cameras, DVRs, NVRs" },
  { icon: Wifi, label: "Networking", desc: "Routers, Fiber, Switches" },
  { icon: Fingerprint, label: "Biometrics", desc: "Attendance & Fingerprint" },
  { icon: School, label: "School Solutions", desc: "Tablets, Projectors, Bells" },
  { icon: Shield, label: "Software", desc: "Tally, Antivirus & more" },
];

const CategoryCard = ({ cat, index }: { cat: typeof categories[0]; index: number }) => {
  const { ref, isVisible } = useScrollAnimation<HTMLAnchorElement>();

  return (
    <Link
      ref={ref}
      to="/products"
      className={`group flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center card-hover transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${(index % 5) * 60}ms` }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:shadow-lg">
        <cat.icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{cat.label}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{cat.desc}</p>
      </div>
    </Link>
  );
};

const CategoryGrid = () => (
  <section className="container py-16">
    <div className="mb-10 text-center">
      <h2 className="text-3xl font-bold font-display">What We Offer</h2>
      <p className="mt-2 text-muted-foreground">
        Over 4,000 products across all major IT categories
      </p>
    </div>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:gap-6">
      {categories.map((cat, i) => (
        <CategoryCard key={cat.label} cat={cat} index={i} />
      ))}
    </div>
  </section>
);

export default CategoryGrid;
