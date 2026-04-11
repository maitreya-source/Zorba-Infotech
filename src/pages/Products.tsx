import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Search, Filter, MessageCircle } from "lucide-react";

const allCategories = [
  { slug: "all", label: "All Products" },
  { slug: "laptops", label: "Laptops & Desktops" },
  { slug: "processors", label: "Processors" },
  { slug: "storage", label: "Storage & RAM" },
  { slug: "printers", label: "Printers" },
  { slug: "accessories", label: "Accessories" },
  { slug: "security", label: "CCTV & Security" },
  { slug: "networking", label: "Networking" },
  { slug: "software", label: "Software & Biometric" },
];

const sampleProducts = [
  { id: 1, name: "HP 15s Laptop Intel i5 12th Gen", category: "laptops", brand: "HP", image: "💻" },
  { id: 2, name: "Dell Inspiron 14 Ryzen 5", category: "laptops", brand: "Dell", image: "💻" },
  { id: 3, name: "Lenovo IdeaPad 3 i3 12th Gen", category: "laptops", brand: "Lenovo", image: "💻" },
  { id: 4, name: "Intel Core i5-13400F Processor", category: "processors", brand: "Intel", image: "🔲" },
  { id: 5, name: "AMD Ryzen 5 7600X", category: "processors", brand: "AMD", image: "🔲" },
  { id: 6, name: "Corsair Vengeance 16GB DDR5", category: "storage", brand: "Corsair", image: "🧩" },
  { id: 7, name: "Samsung 980 Pro 1TB NVMe SSD", category: "storage", brand: "Samsung", image: "💾" },
  { id: 8, name: "WD Blue 1TB SATA HDD", category: "storage", brand: "WD", image: "💾" },
  { id: 9, name: "HP LaserJet Pro MFP M428fdw", category: "printers", brand: "HP", image: "🖨️" },
  { id: 10, name: "Canon PIXMA G3060 Ink Tank", category: "printers", brand: "Canon", image: "🖨️" },
  { id: 11, name: "Logitech MK270 Wireless Combo", category: "accessories", brand: "Logitech", image: "⌨️" },
  { id: 12, name: "Ant Esports MK1200 Keyboard", category: "accessories", brand: "Ant Esports", image: "⌨️" },
  { id: 13, name: "Hikvision 2MP Dome Camera", category: "security", brand: "Hikvision", image: "📷" },
  { id: 14, name: "CP Plus 4CH DVR Kit", category: "security", brand: "CP Plus", image: "📷" },
  { id: 15, name: "TP-Link Archer AX23 Wi-Fi 6", category: "networking", brand: "TP-Link", image: "📡" },
  { id: 16, name: "D-Link 8 Port Gigabit Switch", category: "networking", brand: "D-Link", image: "📡" },
  { id: 17, name: "Tally Prime Accounting Software", category: "software", brand: "Tally", image: "📊" },
  { id: 18, name: "Mantra MFS100 Biometric Scanner", category: "software", brand: "Mantra", image: "🔐" },
  { id: 19, name: "ASUS Prime B660M Motherboard", category: "processors", brand: "ASUS", image: "🔲" },
  { id: 20, name: "Cooler Master 650W SMPS", category: "accessories", brand: "Cooler Master", image: "⚡" },
];

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("cat") || "all";
  const searchQuery = searchParams.get("search") || "";
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const filtered = sampleProducts.filter((p) => {
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (localSearch.trim()) params.set("search", localSearch.trim());
    else params.delete("search");
    setSearchParams(params);
  };

  const setCategory = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug === "all") params.delete("cat");
    else params.set("cat", slug);
    setSearchParams(params);
  };

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold font-display">Product Catalog</h1>
        <p className="mt-1 text-muted-foreground">Browse our complete range — inquire for live pricing & availability.</p>

        {/* Search */}
        <form onSubmit={handleSearch} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search products..."
              className="h-10 w-full rounded-lg border bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button type="submit" size="default">Search</Button>
        </form>

        {/* Categories */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {allCategories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setCategory(cat.slug)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((product) => (
            <div key={product.id} className="group rounded-xl border bg-card p-4 card-hover">
              <div className="flex h-28 items-center justify-center rounded-lg bg-secondary text-4xl">
                {product.image}
              </div>
              <div className="mt-3">
                <span className="text-xs font-medium text-primary">{product.brand}</span>
                <h3 className="mt-0.5 text-sm font-semibold leading-snug line-clamp-2">{product.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Price on request</p>
              </div>
              <div className="mt-3 flex gap-2">
                <a
                  href={`https://wa.me/919407466866?text=${encodeURIComponent(`Hi, I'm interested in: ${product.name}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="whatsapp" size="sm" className="w-full gap-1 text-xs">
                    <MessageCircle className="h-3 w-3" />
                    Inquire
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-16 text-center text-muted-foreground">
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Try adjusting your search or filter</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Products;
