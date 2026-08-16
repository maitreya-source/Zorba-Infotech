import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin } from "lucide-react";
import CustomerTypeahead from "@/components/admin/CustomerTypeahead";
import { formatIndianPhoneNumber } from "@/lib/utils";
import type { Customer } from "@/lib/types";

interface ServiceCallCustomerCardProps {
  selectedCustomerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  onCustomerNameChange: (val: string) => void;
  onSelectCustomer: (cust: Customer) => void;
  onOpenNewCustomerModal: () => void;
  onOpenEditCustomerModal: () => void;
}

export default function ServiceCallCustomerCard({
  selectedCustomerId,
  customerName,
  customerPhone,
  customerEmail,
  customerAddress,
  onCustomerNameChange,
  onSelectCustomer,
  onOpenNewCustomerModal,
  onOpenEditCustomerModal,
}: ServiceCallCustomerCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
            1
          </span>
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Customer & Contact Details
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {selectedCustomerId && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onOpenEditCustomerModal}
              className="h-8 text-xs font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/50"
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Unified Customer Name & Search */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Customer Name / Search <span className="text-red-500 font-bold">*</span>
          </Label>
        </div>
        <CustomerTypeahead
          selectedCustomerId={selectedCustomerId}
          value={customerName}
          onChange={onCustomerNameChange}
          onSelectCustomer={onSelectCustomer}
          onAddNewCustomer={onOpenNewCustomerModal}
          placeholder="Type name or search existing customer..."
        />
      </div>

      {/* Populated Read-Only Customer Info Display */}
      {customerPhone || customerAddress || customerEmail || selectedCustomerId ? (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Phone */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-blue-500" />
                Phone:
              </span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {customerPhone ? formatIndianPhoneNumber(customerPhone) : <span className="text-slate-400 font-normal italic">Not provided</span>}
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-blue-500" />
                Email:
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {customerEmail || <span className="text-slate-400 font-normal italic">Not provided</span>}
              </span>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
            <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0 flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              Address:
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {customerAddress || <span className="text-slate-400 font-normal italic">No address on file</span>}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-3 bg-slate-50/40 dark:bg-slate-950/40 text-center">
          <p className="text-xs text-slate-400">
            Select a customer above to view contact details, or click{" "}
            <button
              type="button"
              onClick={onOpenNewCustomerModal}
              className="text-blue-600 dark:text-blue-400 font-semibold underline cursor-pointer"
            >
              New Customer
            </button>{" "}
            to create a profile.
          </p>
        </div>
      )}
    </div>
  );
}
