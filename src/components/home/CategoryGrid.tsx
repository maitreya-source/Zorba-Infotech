import { Link } from "react-router-dom";
import {
  Monitor, Cpu, HardDrive, Printer, Keyboard, Camera, Wifi, Shield,
} from "lucide-react";

const categories = [
  { icon: Monitor, label: "Laptops & Desktops", desc: "HP, Dell, Lenovo & more" },
  { icon: Cpu, label: "Processors & CPUs", desc: "Intel & AMD latest gen" },
  { icon: HardDrive, label: "Storage & RAM", desc: "SSDs, HDDs, DDR5 RAM" },
  { icon: Printer, label: "Printers & Scanners", desc: "Inkjet, LaserJet, MFPs" },
  { icon: Keyboard, label: "Accessories", desc: "Keyboards, Mice, Cables" },
  { icon: Camera, label: "CCTV & Security", desc: "IP Cameras, DVRs, NVRs" },
  { icon: Wifi, label: "Networking", desc: "Routers, Switches, UPS" },
  { icon: Shield, label: "Software & Biometric", desc: "Tally, Busy, Biometric" },
];

const CategoryGrid = () => (
  <section className="container py-16">
    <div className="mb-10 text-center">
      <h2 className="text-3xl font-bold font-display">What We Offer</h2>
      <p className="mt-2 text-muted-foreground">
        Thousands of products across all major categories
      </p>
    </div>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
      {categories.map((cat) => (
        <Link
          key={cat.label}
          to="/contact"
          className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center card-hover"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <cat.icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{cat.label}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{cat.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  </section>
);

export default CategoryGrid;
