import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Check, MessageCircle, RotateCcw } from "lucide-react";

interface Part {
  category: string;
  options: string[];
}

const partsList: Part[] = [
  { category: "Processor (CPU)", options: ["Intel Core i3-13100", "Intel Core i5-13400F", "Intel Core i7-13700K", "AMD Ryzen 5 7600X", "AMD Ryzen 7 7700X"] },
  { category: "Motherboard", options: ["ASUS Prime B660M", "Gigabyte B660M DS3H", "MSI PRO B760M-A", "ASUS TUF B650-Plus", "Gigabyte B650M Aorus Elite"] },
  { category: "RAM", options: ["8GB DDR4 3200MHz", "16GB DDR4 3200MHz", "16GB DDR5 5600MHz", "32GB DDR5 5600MHz"] },
  { category: "Storage", options: ["256GB NVMe SSD", "512GB NVMe SSD", "1TB NVMe SSD", "1TB HDD + 256GB SSD", "2TB HDD + 512GB SSD"] },
  { category: "Graphics Card", options: ["None (Integrated)", "NVIDIA GTX 1650 4GB", "NVIDIA RTX 4060 8GB", "NVIDIA RTX 4070 12GB", "AMD RX 7600 8GB"] },
  { category: "Power Supply", options: ["450W 80+ Bronze", "550W 80+ Bronze", "650W 80+ Gold", "750W 80+ Gold"] },
  { category: "Cabinet", options: ["Basic ATX Case", "Ant Esports ICE-100", "Cooler Master Q300L", "NZXT H5 Flow"] },
  { category: "Monitor", options: ["None", '22" Full HD 75Hz', '24" Full HD 165Hz', '27" QHD 165Hz'] },
];

const PCBuilder = () => {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const handleSelect = (category: string, option: string) => {
    setSelections((prev) => ({ ...prev, [category]: option }));
  };

  const selectedParts = Object.entries(selections).filter(([, v]) => v);
  const buildSummary = selectedParts.map(([cat, opt]) => `${cat}: ${opt}`).join("\n");

  const whatsappLink = `https://wa.me/919407466866?text=${encodeURIComponent(
    `Hi Zorba Infotech! I'd like a quote for this custom PC build:\n\n${buildSummary}\n\nPlease share pricing and availability.`
  )}`;

  return (
    <Layout>
      <div className="container py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold font-display">Custom PC Builder</h1>
          <p className="mt-1 text-muted-foreground">
            Select your components below and submit for a personalized quote from our team.
          </p>

          <div className="mt-8 space-y-6">
            {partsList.map((part) => (
              <div key={part.category} className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{part.category}</h3>
                  {selections[part.category] && (
                    <span className="flex items-center gap-1 text-xs font-medium text-zorba-green">
                      <Check className="h-3 w-3" />
                      Selected
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {part.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSelect(part.category, opt)}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        selections[part.category] === opt
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {selectedParts.length > 0 && (
            <div className="mt-8 rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold">Your Build Summary</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelections({})} className="gap-1">
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              </div>
              <div className="space-y-2">
                {selectedParts.map(([cat, opt]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{cat}</span>
                    <span className="font-medium">{opt}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="whatsapp" size="lg" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Get Quote on WhatsApp
                  </Button>
                </a>
                <Button variant="cta" size="lg">
                  Request Quote via Email
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PCBuilder;
