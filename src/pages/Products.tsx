import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Monitor, Cpu, Printer, Keyboard, Camera, Wifi, HardDrive, ShoppingBag,
  Shield, School, Wrench, Package, Layers, MessageCircle, ChevronDown, ChevronUp,
  Fingerprint, Tv,
} from "lucide-react";

const categories = [
  {
    icon: Monitor,
    title: "Laptops, Desktops & Printers",
    items: [
      "All types of Laptops, Desktops & All-In-One PCs (including touchscreen)",
      "A4 Printers, A3 Copiers, Scanners",
      "Barcode Printers & E-Stamp Printers",
    ],
  },
  {
    icon: Keyboard,
    title: "Accessories & Peripherals",
    items: [
      "Keyboards, Mice (Wired/Wireless), Gamepads",
      "Monitors (LED, all types)",
      "USB Speakers, Bluetooth Speakers, Sound Systems, Collar Mikes",
      "Dust Covers, Mouse Pads, Screen Guards",
      "Connectors, Cables, Patch Cords, Adapters, Chargers",
      "Mobile Accessories",
    ],
  },
  {
    icon: Cpu,
    title: "Components",
    items: [
      "Processors (Intel & AMD)",
      "Motherboards",
      "Hard Disks & SSDs",
      "RAM (DDR4/DDR5)",
      "Power Supplies",
      "Cabinets, Gaming Cabinets & Gaming Products",
    ],
  },
  {
    icon: Printer,
    title: "Consumables & Billing Supplies",
    items: [
      "All types of Inkjet & Laser Toner Cartridges",
      "Epson, Canon, HP & Brother Ink Bottles",
      "Billing Rolls, 2-inch & 3-inch Thermal Rolls",
      "Barcode Stickers (all sizes)",
    ],
  },
  {
    icon: Camera,
    title: "CCTV & Security Systems",
    items: [
      "4G SIM-based Cameras, Wi-Fi Cameras, Solar Cameras",
      "IP Networking Cameras, HD Cameras, PTZ Cameras",
      "DVRs, NVRs, Surveillance Hard Disks",
      "Camera Cables, IP Cables, Micro SD Cards",
    ],
  },
  {
    icon: Fingerprint,
    title: "Biometrics & Attendance",
    items: [
      "Mantra (MFS100), Morpho, Cogent, Startek, SecuGen, Identity5, Aratek",
      "Global Set GPS Receivers",
      "Attendance Devices, Face Recognition Devices",
      "USB & Wireless Thumb Scanners",
      "School/College Scholarship Ready devices",
    ],
  },
  {
    icon: School,
    title: "School & Institutional Solutions",
    items: [
      "8-inch & 10-inch Tablets, Projectors, Projector Screens, Presenters",
      "Digital Boards, Cables & Accessories",
      "Automatic School Bells, School Timers, Gong Bells, Wireless Bells",
      "Sirens, Announcement Systems, Classroom Talkies, Street Light Timers",
      "Lamination Machines, Spiral Binding Machines, Currency Counting Machines",
      "Complete campus security & Wi-Fi solutions",
    ],
  },
  {
    icon: Wifi,
    title: "Networking & Fiber Optics",
    items: [
      "Indoor/Outdoor Networking Cables, Routers, SIM Routers",
      "Access Points, Internet Extenders",
      "Fiber Optic Cables, ONT/ONU, Media Converters",
      "Switches, Patch Cords, Couplers, Converters & Jointers",
    ],
  },
  {
    icon: Wrench,
    title: "Spare Parts",
    items: [
      "Printer & Copier Parts: Toner Powder, Cartridges, Drum Units, Wiper/Doctor Blades",
      "Teflon Sleeves, Teflon Grease, Hinges, Fuser Units, Paper Pickup Assemblies",
      "Printer Heads, OPC Drums — Konica Minolta, Kyocera, Canon, HP, Sharp, Toshiba",
      "Laptop Parts: Batteries, Hinges, Screens, Speakers, Adapters & Chargers",
    ],
  },
  {
    icon: Tv,
    title: "Mounts & Stands",
    items: [
      "Ceiling Mounts, Wall Mounts, Table Stands, Floor Mounts",
      "For Monitors, TVs & Projectors — massive variety available",
    ],
  },
  {
    icon: Shield,
    title: "Software Solutions",
    items: [
      "Antivirus Software (Quick Heal, Kaspersky, Norton & more)",
      "Accounting Software (Tally, Busy, Marg)",
    ],
  },
];

const CategoryCard = ({ cat, index }: { cat: typeof categories[0]; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div
      ref={ref}
      className={`rounded-2xl border bg-card p-6 transition-all duration-500 card-hover ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${(index % 3) * 80}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <cat.icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-bold leading-tight">{cat.title}</h3>
          <ul className={`mt-3 space-y-1.5 text-sm text-muted-foreground ${!expanded ? "max-h-[4.5rem] overflow-hidden" : ""}`}>
            {cat.items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                {item}
              </li>
            ))}
          </ul>
          {cat.items.length > 2 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {expanded ? "Show less" : `Show all ${cat.items.length} items`}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Products = () => {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation();

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 text-primary-foreground">
        <div
          ref={heroRef}
          className={`container mx-auto max-w-3xl text-center transition-all duration-700 ${
            heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-4">
            <Package className="h-3.5 w-3.5" />
            4,000+ IT Products
          </span>
          <h1 className="text-3xl font-bold font-display md:text-4xl">Products & Services</h1>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">
            Comprehensive computer solutions — from components to complete campus setups. Browse our categories and inquire for current pricing and availability.
          </p>
        </div>
      </section>

      {/* GeM Badge */}
      <div className="bg-zorba-green/10 border-b border-zorba-green/20">
        <div className="container py-4 text-center">
          <p className="text-sm font-medium text-foreground">
            🏛️ All computer-related items are now available through <strong>Zorba Infotech</strong> on the Government of India's authorized <strong>GeM Portal</strong>.
          </p>
        </div>
      </div>

      {/* Categories */}
      <section className="container py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <CategoryCard key={cat.title} cat={cat} index={i} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">Can't find what you're looking for? We stock over 4,000 IT-related items.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/919424899730?text=Hi%20Zorba%20Infotech!%20I'm%20looking%20for%20a%20product." target="_blank" rel="noopener noreferrer">
              <Button variant="whatsapp" size="lg" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp Sales
              </Button>
            </a>
            <a href="tel:+919424899730">
              <Button variant="cta" size="lg">
                Call Sales: 94248 99730
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Products;
