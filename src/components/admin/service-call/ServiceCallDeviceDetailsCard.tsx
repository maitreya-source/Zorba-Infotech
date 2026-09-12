import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, Plus, Trash2 } from "lucide-react";
import ModelTypeahead from "@/components/admin/ModelTypeahead";
import type {
  Product,
  DeviceCategory,
  ServiceCenter,
  Courier,
  ServiceCallType,
  WarrantyStatus,
  ServiceCallProduct,
} from "@/lib/types";

interface ServiceCallDeviceDetailsCardProps {
  products?: ServiceCallProduct[];
  onAddProduct?: () => void;
  onUpdateProduct?: (index: number, field: keyof ServiceCallProduct, value: any) => void;
  onRemoveProduct?: (index: number) => void;
  deviceCategory: string;
  onDeviceCategoryChange: (val: string) => void;
  categories: DeviceCategory[];
  onOpenAddCategoryModal: () => void;
  warrantyStatus: WarrantyStatus;
  onWarrantyStatusChange: (val: WarrantyStatus) => void;
  modelNumber: string;
  onModelNumberChange: (val: string) => void;
  serialNumber: string;
  onSerialNumberChange: (val: string) => void;
  quantity: string | number;
  onQuantityChange: (val: string) => void;
  dateOfPurchase: string;
  onDateOfPurchaseChange: (val: string) => void;
  billNumber: string;
  onBillNumberChange: (val: string) => void;
  issueDescription: string;
  onIssueDescriptionChange: (val: string | ((prev: string) => string)) => void;
  type: ServiceCallType;
  serviceCenters: ServiceCenter[];
  selectedServiceCenterId: string;
  onSelectServiceCenter: (id: string) => void;
  onOpenAddCenterModal: () => void;
  onOpenEditCenterModal?: () => void;
  selectedAddressId: string;
  onSelectAddress: (id: string) => void;
  onOpenAddAddressModal?: () => void;
  couriers: Courier[];
  courierName: string;
  onSelectCourier: (name: string) => void;
  onOpenAddCourierModal: () => void;
  rmaNumber: string;
  onRmaNumberChange: (val: string) => void;
  courierChargesInput: string;
  onCourierChargesInputChange: (val: string) => void;
  onsiteAddress: string;
  onOnsiteAddressChange: (val: string) => void;
  quickTags: string[];
  onOpenDispatchPrint?: () => void;
  issueError?: string;
}

export default function ServiceCallDeviceDetailsCard({
  products,
  onAddProduct,
  onUpdateProduct,
  onRemoveProduct,
  deviceCategory,
  onDeviceCategoryChange,
  categories,
  onOpenAddCategoryModal,
  warrantyStatus,
  onWarrantyStatusChange,
  modelNumber,
  onModelNumberChange,
  serialNumber,
  onSerialNumberChange,
  quantity,
  onQuantityChange,
  dateOfPurchase,
  onDateOfPurchaseChange,
  billNumber,
  onBillNumberChange,
  issueDescription,
  onIssueDescriptionChange,
  type,
  serviceCenters,
  selectedServiceCenterId,
  onSelectServiceCenter,
  onOpenAddCenterModal,
  onOpenEditCenterModal,
  selectedAddressId,
  onSelectAddress,
  onOpenAddAddressModal,
  couriers,
  courierName,
  onSelectCourier,
  onOpenAddCourierModal,
  rmaNumber,
  onRmaNumberChange,
  courierChargesInput,
  onCourierChargesInputChange,
  onsiteAddress,
  onOnsiteAddressChange,
  quickTags,
  onOpenDispatchPrint,
  issueError,
}: ServiceCallDeviceDetailsCardProps) {
  return (
    <>
      {/* Section 2: Device & Warranty Details */}
      <div
        data-section="device"
        data-shortcut-section="device"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs">
              2
            </span>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Device & Issue Details
            </h2>
            {products && products.length > 1 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                {products.length} Products
              </span>
            )}
          </div>

          {onAddProduct && (
            <Button
              type="button"
              tabIndex={-1}
              data-tally-skip="true"
              variant="outline"
              size="sm"
              onClick={onAddProduct}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Another Product</span>
            </Button>
          )}
        </div>

        {/* Product Items List (Multi-Product Mode) */}
        {products && products.length > 0 && onUpdateProduct ? (
          <div className="space-y-4">
            {products.map((prod, pIdx) => {
              const isMulti = products.length > 1;
              return (
                <div
                  key={prod.id || pIdx}
                  className={`space-y-3.5 ${
                    isMulti
                      ? "p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                      : ""
                  }`}
                >
                  {isMulti && (
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold bg-blue-600 text-white">
                          Product #{pIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                          {prod.deviceCategory} {prod.modelNumber ? `— ${prod.modelNumber}` : ""}
                        </span>
                      </div>
                      {onRemoveProduct && (
                        <button
                          type="button"
                          tabIndex={-1}
                          data-tally-skip="true"
                          onClick={() => onRemoveProduct(pIdx)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Primary Row: Category, Warranty, Model Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    {/* Device Category */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Device Category
                        </Label>
                        <button
                          type="button"
                          tabIndex={-1}
                          data-tally-skip="true"
                          onClick={onOpenAddCategoryModal}
                          className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                      <Select
                        value={prod.deviceCategory}
                        onValueChange={(val) => {
                          onUpdateProduct(pIdx, "deviceCategory", val);
                          if (pIdx === 0) onDeviceCategoryChange(val);
                        }}
                      >
                        <SelectTrigger className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.name}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Warranty Status */}
                    <div>
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                        Warranty Status
                      </Label>
                      <Select
                        value={prod.warrantyStatus || "not_applicable"}
                        onValueChange={(val: WarrantyStatus) => {
                          onUpdateProduct(pIdx, "warrantyStatus", val);
                          if (pIdx === 0) onWarrantyStatusChange(val);
                        }}
                      >
                        <SelectTrigger className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                          <SelectValue placeholder="Warranty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_applicable">General Service (N/A)</SelectItem>
                          <SelectItem value="in_warranty">In Warranty (OEM)</SelectItem>
                          <SelectItem value="out_of_warranty">Out of Warranty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Model Number / Name */}
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                        Model Number / Name
                      </Label>
                      <ModelTypeahead
                        categoryName={prod.deviceCategory}
                        value={prod.modelNumber || ""}
                        onChange={(val) => {
                          onUpdateProduct(pIdx, "modelNumber", val);
                          if (pIdx === 0) onModelNumberChange(val);
                        }}
                        onSelectProduct={(catalogProd) => {
                          const targetCat = catalogProd.categoryId || (catalogProd as any).category;
                          if (targetCat && categories?.length > 0) {
                            const matched = categories.find(
                              (c) =>
                                c.id.toLowerCase() === targetCat.toLowerCase() ||
                                c.name.toLowerCase() === targetCat.toLowerCase()
                            );
                            if (matched) {
                              onUpdateProduct(pIdx, "deviceCategory", matched.name);
                              if (pIdx === 0) onDeviceCategoryChange(matched.name);
                            }
                          }
                        }}
                        placeholder="Search 4000+ products by model no. (e.g. T480, DS-2CD...), name, brand..."
                      />
                    </div>
                  </div>

                  {/* Secondary Metadata Sub-Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                        Serial Number / IMEI
                      </Label>
                      <Input
                        placeholder="e.g. 15082026"
                        value={prod.serialNumber || ""}
                        onChange={(e) => {
                          onUpdateProduct(pIdx, "serialNumber", e.target.value);
                          if (pIdx === 0) onSerialNumberChange(e.target.value);
                        }}
                        className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                        Quantity
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={prod.quantity === 0 ? "" : prod.quantity}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const q = raw === "" ? "" : Number(raw.replace(/^0+(?=\d)/, '')) || 1;
                          onUpdateProduct(pIdx, "quantity", q);
                          if (pIdx === 0) onQuantityChange(String(q));
                        }}
                        className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors text-center"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                        Purchase Date (DOP)
                      </Label>
                      <Input
                        type="date"
                        value={prod.dateOfPurchase || ""}
                        onChange={(e) => {
                          onUpdateProduct(pIdx, "dateOfPurchase", e.target.value);
                          if (pIdx === 0) onDateOfPurchaseChange(e.target.value);
                        }}
                        className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                        Bill / Invoice No.
                      </Label>
                      <Input
                        placeholder="e.g. INV-2024-9981"
                        value={prod.billNumber || ""}
                        onChange={(e) => {
                          onUpdateProduct(pIdx, "billNumber", e.target.value);
                          if (pIdx === 0) onBillNumberChange(e.target.value);
                        }}
                        className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Issue / Service Task Description */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                      {isMulti ? `Product #${pIdx + 1} Issue / Service Task` : "Issue / Service Task Description"}{" "}
                      <span className="text-rose-600 font-bold">*</span>
                    </Label>
                    <Textarea
                      placeholder={
                        isMulti
                          ? `Specific fault or service task for Product #${pIdx + 1}...`
                          : "Customer reported issue or service required (e.g. Screen broken, not powering on, no display, Windows reinstall)..."
                      }
                      value={prod.issueDescription || ""}
                      onChange={(e) => {
                        onUpdateProduct(pIdx, "issueDescription", e.target.value);
                        if (pIdx === 0) onIssueDescriptionChange(e.target.value);
                      }}
                      rows={2}
                      required
                      className={`text-base sm:text-sm rounded-xl bg-slate-50/60 dark:bg-slate-950 font-medium placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors ${
                        issueError && pIdx === 0
                          ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 text-rose-900 dark:text-rose-100"
                          : "border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                      }`}
                    />
                    {issueError && pIdx === 0 && (
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                        ⚠️ {issueError}
                      </p>
                    )}

                    {/* Quick Accessories Handover Chips */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                          Accessories:
                        </span>
                        {[
                          { label: "+ Charger", val: "Charger received" },
                          { label: "+ Laptop Bag", val: "Laptop bag received" },
                          { label: "+ Power Adapter / Cable", val: "Power adapter/cable received" },
                          { label: "+ Device Only", val: "Device only (no accessories)" },
                        ].map((acc) => (
                          <button
                            key={acc.label}
                            type="button"
                            tabIndex={-1}
                            data-tally-skip="true"
                            onClick={() => {
                              const prev = prod.issueDescription || "";
                              const next = prev ? `${prev}, [${acc.val}]` : `[${acc.val}]`;
                              onUpdateProduct(pIdx, "issueDescription", next);
                              if (pIdx === 0) onIssueDescriptionChange(next);
                            }}
                            className="shrink-0 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 px-3 py-1.5 min-h-[32px] text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
                          >
                            {acc.label}
                          </button>
                        ))}
                      </div>

                      {/* Quick Symptoms Suggestions */}
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                          Symptoms:
                        </span>
                        {quickTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            tabIndex={-1}
                            data-tally-skip="true"
                            onClick={() => {
                              const prev = prod.issueDescription || "";
                              const next = prev ? `${prev}, ${tag}` : tag;
                              onUpdateProduct(pIdx, "issueDescription", next);
                              if (pIdx === 0) onIssueDescriptionChange(next);
                            }}
                            className="shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 min-h-[32px] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback Single-Product View */
          <div className="space-y-4">
            {/* Primary Row: Category, Warranty, Model Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Device Category
                  </Label>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-tally-skip="true"
                    onClick={onOpenAddCategoryModal}
                    className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
                <Select value={deviceCategory} onValueChange={onDeviceCategoryChange}>
                  <SelectTrigger className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Warranty Status
                </Label>
                <Select value={warrantyStatus} onValueChange={(val: WarrantyStatus) => onWarrantyStatusChange(val)}>
                  <SelectTrigger className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                    <SelectValue placeholder="Warranty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_applicable">General Service (N/A)</SelectItem>
                    <SelectItem value="in_warranty">In Warranty (OEM)</SelectItem>
                    <SelectItem value="out_of_warranty">Out of Warranty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Model Number / Name
                </Label>
                <ModelTypeahead
                  categoryName={deviceCategory}
                  value={modelNumber}
                  onChange={onModelNumberChange}
                  onSelectProduct={(prod) => {
                    const targetCat = prod.categoryId || (prod as any).category;
                    if (targetCat && categories?.length > 0) {
                      const matched = categories.find(
                        (c) =>
                          c.id.toLowerCase() === targetCat.toLowerCase() ||
                          c.name.toLowerCase() === targetCat.toLowerCase()
                      );
                      if (matched) {
                        onDeviceCategoryChange(matched.name);
                      }
                    }
                  }}
                  placeholder="Search 4000+ products by model no. (e.g. T480, DS-2CD...), name, brand..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Serial Number / IMEI
                </Label>
                <Input
                  placeholder="e.g. 15082026"
                  value={serialNumber}
                  onChange={(e) => onSerialNumberChange(e.target.value)}
                  className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Quantity
                </Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={quantity === 0 ? "" : quantity}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onQuantityChange(raw === "" ? "" : raw.replace(/^0+(?=\d)/, ''));
                  }}
                  className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors text-center"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Purchase Date (DOP)
                </Label>
                <Input
                  type="date"
                  value={dateOfPurchase}
                  onChange={(e) => onDateOfPurchaseChange(e.target.value)}
                  className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Bill / Invoice No.
                </Label>
                <Input
                  placeholder="e.g. INV-2024-9981"
                  value={billNumber}
                  onChange={(e) => onBillNumberChange(e.target.value)}
                  className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issue-description-input" className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Issue / Service Task Description <span className="text-rose-600 font-bold">*</span>
              </Label>
              <Textarea
                id="issue-description-input"
                placeholder="Customer reported issue or service required (e.g. Screen broken, not powering on, no display, Windows reinstall)..."
                value={issueDescription}
                onChange={(e) => onIssueDescriptionChange(e.target.value)}
                rows={2}
                required
                className={`text-base sm:text-sm rounded-xl bg-slate-50/60 dark:bg-slate-950 font-medium placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors ${
                  issueError
                    ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 text-rose-900 dark:text-rose-100"
                    : "border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                }`}
              />
              {issueError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                  ⚠️ {issueError}
                </p>
              )}

              <div className="space-y-1 pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    Accessories Handover:
                  </span>
                  {[
                    { label: "+ Charger", val: "Charger received" },
                    { label: "+ Laptop Bag", val: "Laptop bag received" },
                    { label: "+ Power Adapter / Cable", val: "Power adapter/cable received" },
                    { label: "+ Device Only", val: "Device only (no accessories)" },
                  ].map((acc) => (
                    <button
                      key={acc.label}
                      type="button"
                      tabIndex={-1}
                      data-tally-skip="true"
                      onClick={() => {
                        onIssueDescriptionChange((prev) => (prev ? `${prev}, [${acc.val}]` : `[${acc.val}]`));
                      }}
                      className="shrink-0 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 px-3 py-1.5 min-h-[32px] text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    Common Symptoms:
                  </span>
                  {quickTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      tabIndex={-1}
                      data-tally-skip="true"
                      onClick={() => {
                        onIssueDescriptionChange((prev) => (prev ? `${prev}, ${tag}` : tag));
                      }}
                      className="shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 min-h-[32px] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Company Service Center Parcel Dispatch */}
      {type === "company_service_center" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                3
              </span>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Service Center & Courier Dispatch
              </h2>
            </div>
            {onOpenDispatchPrint && (
              <Button
                type="button"
                tabIndex={-1}
                data-tally-skip="true"
                variant="outline"
                size="sm"
                onClick={onOpenDispatchPrint}
                className="h-8 text-xs font-semibold rounded-lg gap-1.5 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                title="Print Dispatch Slip with Zorba & Service Center Addresses"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Print Dispatch Slip</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Select Service Center */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Authorized Service Center
                </Label>
                <div className="flex items-center gap-2">
                  {selectedServiceCenterId && onOpenEditCenterModal && (
                    <button
                      type="button"
                      tabIndex={-1}
                      data-tally-skip="true"
                      onClick={onOpenEditCenterModal}
                      className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer"
                      title="Edit Service Center details & locations"
                    >
                      Edit Center
                    </button>
                  )}
                  <button
                    type="button"
                    tabIndex={-1}
                    data-tally-skip="true"
                    onClick={onOpenAddCenterModal}
                    className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
              <Select
                value={selectedServiceCenterId}
                onValueChange={onSelectServiceCenter}
              >
                <SelectTrigger
                  id="sc-center-select"
                  data-tally-field="service-center"
                  className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors cursor-pointer"
                >
                  <SelectValue placeholder="Select Center..." />
                </SelectTrigger>
                <SelectContent>
                  {serviceCenters.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dispatch Parcel Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Dispatch Address
                </Label>
                {onOpenAddAddressModal && (
                  <button
                    type="button"
                    tabIndex={-1}
                    data-tally-skip="true"
                    onClick={onOpenAddAddressModal}
                    className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    + Add
                  </button>
                )}
              </div>
              <Select
                value={selectedAddressId}
                onValueChange={onSelectAddress}
              >
                <SelectTrigger
                  id="sc-address-select"
                  data-tally-field="dispatch-address"
                  className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors cursor-pointer"
                >
                  <SelectValue placeholder="Select Dispatch Address..." />
                </SelectTrigger>
                <SelectContent>
                  {serviceCenters
                    .find((sc) => sc.id === selectedServiceCenterId)
                    ?.addresses.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.city}: {a.address}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Courier Partner Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Courier Partner
                </Label>
                <button
                  type="button"
                  tabIndex={-1}
                  data-tally-skip="true"
                  onClick={onOpenAddCourierModal}
                  className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  + Add
                </button>
              </div>
              <Select
                value={courierName}
                onValueChange={onSelectCourier}
              >
                <SelectTrigger
                  id="sc-courier-select"
                  data-tally-field="courier-name"
                  className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors cursor-pointer"
                >
                  <SelectValue placeholder="Select Courier..." />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Courier Tracking RMA / Docket No */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Courier Tracking / RMA No.
              </Label>
              <Input
                id="sc-rma-input"
                data-tally-field="rma-number"
                placeholder="e.g. TRK-9981 / AUG-2026"
                value={rmaNumber}
                onChange={(e) => onRmaNumberChange(e.target.value)}
                className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
              />
            </div>

            {/* Courier Charges */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Courier Charges (₹)
              </Label>
              <Input
                id="sc-charges-input"
                data-tally-field="courier-charges"
                type="number"
                min="0"
                placeholder="0"
                value={courierChargesInput === "0" ? "" : courierChargesInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const raw = e.target.value;
                  onCourierChargesInputChange(raw === "" ? "" : raw.replace(/^0+(?=\d)/, ''));
                }}
                className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Section 3 Alternative: Onsite Service Address */}
      {type === "onsite_visit" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
              3
            </span>
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Onsite Service Address
            </h2>
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Customer Site / Address
            </Label>
            <Input
              placeholder="Enter complete onsite location..."
              value={onsiteAddress}
              onChange={(e) => onOnsiteAddressChange(e.target.value)}
              className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
            />
          </div>
        </div>
      )}
    </>
  );
}
