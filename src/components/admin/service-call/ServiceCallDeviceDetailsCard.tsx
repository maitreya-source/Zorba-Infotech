import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ModelTypeahead from "@/components/admin/ModelTypeahead";
import type {
  DeviceCategory,
  ServiceCenter,
  Courier,
  ServiceCallType,
  WarrantyStatus,
} from "@/lib/types";

interface ServiceCallDeviceDetailsCardProps {
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
  selectedAddressId: string;
  onSelectAddress: (id: string) => void;
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
}

export default function ServiceCallDeviceDetailsCard({
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
  selectedAddressId,
  onSelectAddress,
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
}: ServiceCallDeviceDetailsCardProps) {
  return (
    <>
      {/* Section 2: Device & Warranty Details */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
            2
          </span>
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Device & Issue Details
          </h2>
        </div>

        {/* Primary Row: Category, Warranty, Model Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Device Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Device Category
              </Label>
              <button
                type="button"
                onClick={onOpenAddCategoryModal}
                className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                + Add
              </button>
            </div>
            <Select value={deviceCategory} onValueChange={onDeviceCategoryChange}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
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
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Warranty Status
            </Label>
            <Select value={warrantyStatus} onValueChange={(val: WarrantyStatus) => onWarrantyStatusChange(val)}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                <SelectValue placeholder="Warranty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_applicable">N/A General Service</SelectItem>
                <SelectItem value="in_warranty">In Warranty (OEM)</SelectItem>
                <SelectItem value="out_of_warranty">Out of Warranty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Number / Name */}
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Model Number / Name
            </Label>
            <ModelTypeahead
              categoryName={deviceCategory}
              value={modelNumber}
              onChange={onModelNumberChange}
            />
          </div>
        </div>

        {/* Secondary Metadata Sub-Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Serial Number / IMEI
            </Label>
            <Input
              placeholder="e.g. 15082026"
              value={serialNumber}
              onChange={(e) => onSerialNumberChange(e.target.value)}
              className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
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
              className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors text-center"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Purchase Date (DOP)
            </Label>
            <Input
              type="date"
              value={dateOfPurchase}
              onChange={(e) => onDateOfPurchaseChange(e.target.value)}
              className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Invoice / Bill Number
            </Label>
            <Input
              placeholder="e.g. INV-2024-9981"
              value={billNumber}
              onChange={(e) => onBillNumberChange(e.target.value)}
              className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Issue / Service Task Description */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Issue / Service Task Description <span className="text-red-500 font-bold">*</span>
          </Label>
          <Textarea
            placeholder="Describe symptoms, requested repair, or installation tasks..."
            value={issueDescription}
            onChange={(e) => onIssueDescriptionChange(e.target.value)}
            rows={2}
            required
            className="text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
          />

          {/* Quick Tags Suggestions */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 no-scrollbar text-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold shrink-0">Suggestions:</span>
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  onIssueDescriptionChange((prev) => (prev ? `${prev}, ${tag}` : tag));
                }}
                className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Company Service Center Parcel Dispatch */}
      {type === "company_service_center" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
              3
            </span>
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Service Center & Courier Dispatch
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Select Service Center */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Service Center
                </Label>
                <button
                  type="button"
                  onClick={onOpenAddCenterModal}
                  className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  + Add
                </button>
              </div>
              <Select
                value={selectedServiceCenterId}
                onValueChange={onSelectServiceCenter}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                  <SelectValue placeholder="Select Service Center" />
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
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Dispatch Address
              </Label>
              <Select
                value={selectedAddressId}
                onValueChange={onSelectAddress}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                  <SelectValue placeholder="Dispatch Address" />
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
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Courier Partner
                </Label>
                <button
                  type="button"
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
                <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                  <SelectValue placeholder="Select Courier Partner" />
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
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Docket / RMA Tracking No.
              </Label>
              <Input
                placeholder="e.g. TRK-9981 / AUG-2026"
                value={rmaNumber}
                onChange={(e) => onRmaNumberChange(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
              />
            </div>

            {/* Courier Charges */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Courier Charges (₹)
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={courierChargesInput === "0" ? "" : courierChargesInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const raw = e.target.value;
                  onCourierChargesInputChange(raw === "" ? "" : raw.replace(/^0+(?=\d)/, ''));
                }}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
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
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Customer Site / Installation Address
            </Label>
            <Input
              placeholder="Enter complete onsite location..."
              value={onsiteAddress}
              onChange={(e) => onOnsiteAddressChange(e.target.value)}
              className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
            />
          </div>
        </div>
      )}
    </>
  );
}
