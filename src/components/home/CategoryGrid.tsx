import { Link } from "react-router-dom";
import {
  Monitor, Cpu, HardDrive, Printer, Keyboard, Camera, Wifi, Shield, Fingerprint, School,
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const categories = [
  { icon: Monitor, label: "Laptops & Desktops", desc: "HP, Dell, Lenovo & more", href: "/catalog?category=laptop" },
  { icon: Cpu, label: "Components & RAM", desc: "CPUs, Motherboards, RAM", href: "/catalog?category=accessories" },
  { icon: HardDrive, label: "Storage & SSDs", desc: "SSDs, HDDs, NVMe", href: "/catalog?search=SSD" },
  { icon: Printer, label: "Printers & Scanners", desc: "Laser, Inkjet, Thermal", href: "/catalog?category=printer" },
  { icon: Keyboard, label: "Accessories", desc: "Keyboards, Mice, Cables", href: "/catalog?category=accessories" },
  { icon: Camera, label: "CCTV & Security", desc: "4G SIM, IP & DVR Systems", href: "/catalog?category=cctv-security" },
  { icon: Wifi, label: "Networking", desc: "Routers, Fiber, Switches", href: "/catalog?category=router-networking" },
  { icon: Fingerprint, label: "Biometrics", desc: "Mantra, Morpho, Attendance", href: "/catalog?category=biometric-attendance" },
  { icon: School, label: "School Solutions", desc: "Tablets, Projectors, Bells", href: "/catalog?search=School" },
  { icon: Shield, label: "Software", desc: "Tally, Antivirus & more", href: "/catalog?search=Software" },
];

const CategoryCard = ({ cat }: { cat: typeof categories[0]; index: number }) => {
  return (
    <Link
      to={cat.href}
      className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center card-hover transition-all"
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
  <section className="container py-14 md:py-18">
    <div className="mb-10 text-center space-y-2">
      <span className="text-xs font-bold uppercase tracking-wider text-primary">
        Browse by Category
      </span>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display tracking-tight text-foreground">
        Explore Our Product Catalog
      </h2>
      <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
        Over 4,000 IT products in ready stock at wholesale and retail rates.
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
