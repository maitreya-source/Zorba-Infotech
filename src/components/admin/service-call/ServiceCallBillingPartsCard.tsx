import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import ProductTypeahead from "@/components/admin/ProductTypeahead";
import type { ServicePart } from "@/lib/types";

interface ServiceCallBillingPartsCardProps {
  parts: ServicePart[];
  onAddPartRow: () => void;
  onUpdatePart: (index: number, field: keyof ServicePart, value: any) => void;
  onRemovePartRow: (index: number) => void;
  serviceChargesInput: string;
  onServiceChargesInputChange: (val: string) => void;
  discountInput: string;
  onDiscountInputChange: (val: string) => void;
  onOpenProductModal?: () => void;
}

export default function ServiceCallBillingPartsCard({
  parts,
  onAddPartRow,
  onUpdatePart,
  onRemovePartRow,
  serviceChargesInput,
  onServiceChargesInputChange,
  discountInput,
  onDiscountInputChange,
  onOpenProductModal,
}: ServiceCallBillingPartsCardProps) {
  return (
    <div
      data-shortcut-section="product"
      data-section="parts"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
            4
          </span>
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Spare Parts & Service Charges
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onOpenProductModal && (
            <button
              type="button"
              onClick={onOpenProductModal}
              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>+ New Product (Alt+C)</span>
            </button>
          )}
          <button
            type="button"
            onClick={onAddPartRow}
            className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
          >
            + Add Row (Alt+A)
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Mobile Stacked Card View (< md) */}
        <div className="md:hidden space-y-3">
          {parts.map((p, idx) => (
            <div
              key={p.id || idx}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Item #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemovePartRow(idx)}
                  className="h-9 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Part / Item Name
                </label>
                <ProductTypeahead
                  value={p.name}
                  onChange={(name) => onUpdatePart(idx, "name", name)}
                  onSelectProduct={(prod) => {
                    const partName = prod.name + (prod.model ? ` (${prod.model})` : "");
                    onUpdatePart(idx, "name", partName);
                    if (prod.price && prod.price > 0) {
                      onUpdatePart(idx, "unitPrice", prod.price);
                    }
                  }}
                  onAddNewProduct={onOpenProductModal}
                  placeholder="Search products by model, name..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={p.quantity === 0 ? "" : p.quantity}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const clean = raw === "" ? 1 : Math.max(1, Number(raw.replace(/^0+(?=\d)/, '')) || 1);
                      onUpdatePart(idx, "quantity", clean);
                    }}
                    className="h-11 text-base sm:text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-center font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Unit Price (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={p.unitPrice === 0 ? "" : p.unitPrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const clean = raw === "" ? 0 : Number(raw.replace(/^0+(?=\d)/, ''));
                      onUpdatePart(idx, "unitPrice", clean);
                    }}
                    className="h-11 text-base sm:text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Line Total:</span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                  ₹{(p.totalPrice || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ))}

          <Button
            type="button"
            onClick={onAddPartRow}
            variant="outline"
            className="w-full h-12 rounded-2xl border-2 border-dashed border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>+ नया स्पेयर पार्ट जोड़ें (Add Part Row)</span>
          </Button>
        </div>

        {/* Desktop Grid View (>= md) */}
        <div className="hidden md:block space-y-2.5">
          {parts.length > 0 && (
            <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
              <div className="col-span-7">Part / Item Name (Search Products Catalog)</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Unit Price (₹)</div>
              <div className="col-span-1 text-right">Total</div>
            </div>
          )}

          {parts.map((p, idx) => (
            <div key={p.id || idx} data-part-row={idx} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-7">
                <ProductTypeahead
                  value={p.name}
                  onChange={(name) => onUpdatePart(idx, "name", name)}
                  onSelectProduct={(prod) => {
                    const partName = prod.name + (prod.model ? ` (${prod.model})` : "");
                    onUpdatePart(idx, "name", partName);
                    if (prod.price && prod.price > 0) {
                      onUpdatePart(idx, "unitPrice", prod.price);
                    }
                  }}
                  onAddNewProduct={onOpenProductModal}
                  placeholder="Search products by model, name, or type custom part..."
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={p.quantity === 0 ? "" : p.quantity}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const clean = raw === "" ? 1 : Math.max(1, Number(raw.replace(/^0+(?=\d)/, '')) || 1);
                    onUpdatePart(idx, "quantity", clean);
                  }}
                  className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors text-center"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={p.unitPrice === 0 ? "" : p.unitPrice}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (idx === parts.length - 1) {
                        onAddPartRow();
                        setTimeout(() => {
                          const nextRowInput = document.querySelector(`[data-part-row="${idx + 1}"] input`) as HTMLElement | null;
                          nextRowInput?.focus();
                        }, 60);
                      } else {
                        const nextRowInput = document.querySelector(`[data-part-row="${idx + 1}"] input`) as HTMLElement | null;
                        nextRowInput?.focus();
                      }
                    }
                  }}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const clean = raw === "" ? 0 : Number(raw.replace(/^0+(?=\d)/, ''));
                    onUpdatePart(idx, "unitPrice", clean);
                  }}
                  className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
                />
              </div>
              <div className="col-span-1 flex items-center justify-end gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white text-xs font-display font-mono">
                  ₹{(p.totalPrice || 0).toLocaleString("en-IN")}
                </span>
                <button
                  type="button"
                  onClick={() => onRemovePartRow(idx)}
                  className="text-slate-400 hover:text-destructive p-1 rounded-md transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {parts.length === 0 && (
          <div className="text-xs text-slate-400 p-4 bg-slate-50/50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
            No spare parts added yet. Click{" "}
            <button
              type="button"
              onClick={onAddPartRow}
              className="text-[#2563EB] font-bold underline cursor-pointer"
            >
              Add Item
            </button>{" "}
            if replacement hardware or components are needed.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div>
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
            Service & Repair Charges (₹)
          </Label>
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={serviceChargesInput === "0" ? "" : serviceChargesInput}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const raw = e.target.value;
              onServiceChargesInputChange(raw === "" ? "" : raw.replace(/^0+(?=\d)/, ''));
            }}
            className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 w-full font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
          />
        </div>

        <div>
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
            Discount (₹)
          </Label>
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={discountInput === "0" ? "" : discountInput}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const raw = e.target.value;
              onDiscountInputChange(raw === "" ? "" : raw.replace(/^0+(?=\d)/, ''));
            }}
            className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 w-full font-mono font-bold text-rose-600 dark:text-rose-400 placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
