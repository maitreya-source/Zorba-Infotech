import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Monitor, Cpu, Printer, Keyboard, Camera, Wifi, HardDrive,
  Shield, School, Wrench, Package, MessageCircle, ChevronDown, ChevronUp,
  Fingerprint, Tv, Search,
} from "lucide-react";

const categories = [
  {
    icon: Monitor,
    title: "Laptops, Desktops & Printers",
    color: "from-blue-500/10 to-blue-600/5",
    items: [
      "All types of Laptops, Desktops & All-In-One PCs (including touchscreen)",
      "A4 Printers, A3 Copiers, Scanners",
      "Barcode Printers & E-Stamp Printers",
    ],
  },
  {
    icon: Keyboard,
    title: "Accessories & Peripherals",
    color: "from-purple-500/10 to-purple-600/5",
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
    color: "from-red-500/10 to-red-600/5",
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
    color: "from-amber-500/10 to-amber-600/5",
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
    color: "from-emerald-500/10 to-emerald-600/5",
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
    color: "from-cyan-500/10 to-cyan-600/5",
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
    color: "from-indigo-500/10 to-indigo-600/5",
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
    color: "from-teal-500/10 to-teal-600/5",
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
    color: "from-orange-500/10 to-orange-600/5",
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
    color: "from-slate-500/10 to-slate-600/5",
    items: [
      "Ceiling Mounts, Wall Mounts, Table Stands, Floor Mounts",
      "For Monitors, TVs & Projectors — massive variety available",
    ],
  },
  {
    icon: Shield,
    title: "Software Solutions",
    color: "from-green-500/10 to-green-600/5",
    items: [
      "Antivirus Software (Quick Heal, Kaspersky, Norton & more)",
      "Accounting Software (Tally, Busy, Marg)",
    ],
  },
];

const CategoryCard = ({ cat, index }: { cat: typeof categories[0]; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const { ref, isVisible } = useScrollAnimation();
  const showToggle = cat.items.length > 3;
  const visibleItems = expanded ? cat.items : cat.items.slice(0, 3);

  return (
    <div
      ref={ref}
      className={`group relative rounded-2xl border bg-card overflow-hidden transition-all duration-500 hover:shadow-lg hover:border-primary/20 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${(index % 3) * 80}ms` }}
    >
      {/* Color accent top bar */}
      <div className={`h-1 bg-gradient-to-r ${cat.color}`} />

      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-primary transition-transform duration-300 group-hover:scale-110`}>
            <cat.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-bold leading-tight">{cat.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{cat.items.length} items</p>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {visibleItems.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/50" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>

        {showToggle && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            {expanded ? (
              <>Show less <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Show all {cat.items.length} items <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const Products = () => {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = searchQuery
    ? categories.filter(
        (cat) =>
          cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.items.some((item) => item.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : categories;

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

          {/* Search */}
          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/40" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 pl-10 pr-4 py-2.5 text-sm text-primary-foreground placeholder:text-primary-foreground/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-foreground/30"
            />
          </div>
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
        {searchQuery && (
          <p className="text-sm text-muted-foreground mb-6">
            {filteredCategories.length} {filteredCategories.length === 1 ? "category" : "categories"} found for "{searchQuery}"
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((cat, i) => (
            <CategoryCard key={cat.title} cat={cat} index={i} />
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg font-semibold">No products found</p>
            <p className="text-muted-foreground mt-1">Try a different search term or contact us directly.</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-2xl border bg-card p-8 text-center">
          <p className="text-lg font-semibold font-display mb-2">Can't find what you're looking for?</p>
          <p className="text-muted-foreground mb-6">We stock over 4,000 IT-related items. Reach out for current pricing and availability.</p>
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
