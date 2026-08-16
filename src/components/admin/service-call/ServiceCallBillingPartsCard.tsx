import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import SparePartTypeahead from "@/components/admin/SparePartTypeahead";
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
}: ServiceCallBillingPartsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
            4
          </span>
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Spare Parts & Service Charges
          </h2>
        </div>

        <button
          type="button"
          onClick={onAddPartRow}
          className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
        >
          Add Item
        </button>
      </div>

      <div className="space-y-2.5">
        {parts.length > 0 && (
          <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
            <div className="col-span-7">Part / Item Name (Auto-saved to Catalog)</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-2">Unit Price (₹)</div>
            <div className="col-span-1 text-right">Total</div>
          </div>
        )}

        {parts.map((p, idx) => (
          <div key={p.id || idx} className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-7">
              <SparePartTypeahead
                value={p.name}
                onChangeName={(name) => onUpdatePart(idx, "name", name)}
                onSelectCatalogItem={(item) => {
                  if (item.unitPrice > 0) {
                    onUpdatePart(idx, "unitPrice", item.unitPrice);
                  }
                }}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="1"
                value={p.quantity}
                onChange={(e) => onUpdatePart(idx, "quantity", e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="0"
                value={p.unitPrice}
                onChange={(e) => onUpdatePart(idx, "unitPrice", e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white transition-colors"
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

        {parts.length === 0 && (
          <div className="text-xs text-slate-400 p-3 bg-slate-50/50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
            No spare parts added. Click{" "}
            <button
              type="button"
              onClick={onAddPartRow}
              className="text-[#2563EB] font-bold underline cursor-pointer"
            >
              Add Item
            </button>{" "}
            if replacement hardware is required.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div>
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
            Service & Repair Charges (₹)
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={serviceChargesInput}
            onChange={(e) => onServiceChargesInputChange(e.target.value)}
            className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 w-44 font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white transition-colors"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
            Discount (₹)
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={discountInput}
            onChange={(e) => onDiscountInputChange(e.target.value)}
            className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 w-44 font-mono font-medium text-rose-600 dark:text-rose-400 placeholder:text-slate-400 focus:bg-white transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
