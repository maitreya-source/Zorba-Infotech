import { useState } from "react";
import { toast } from "sonner";
import { UserCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createStaffMember } from "@/lib/firestore";
import { toTitleCase, formatIndianPhoneNumber } from "@/lib/utils";
import type { StaffMember } from "@/lib/types";

interface CreateStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (staff: StaffMember) => void;
}

export default function CreateStaffModal({
  open,
  onOpenChange,
  onCreated,
}: CreateStaffModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Staff member name is required");
      return;
    }

    setSaving(true);
    try {
      const newStaff = await createStaffMember({
        name: toTitleCase(name),
        role: role.trim() ? toTitleCase(role) : "Backoffice Operations",
        phone: phone.trim() ? formatIndianPhoneNumber(phone) : undefined,
        active: true,
      });

      toast.success(`Staff member "${newStaff.name}" added successfully`);
      if (onCreated) onCreated(newStaff);
      onOpenChange(false);
      setName("");
      setRole("");
      setPhone("");
    } catch (err: any) {
      console.error("Error creating staff member:", err);
      toast.error(err?.message || "Failed to create staff member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
            <UserCheck className="h-5 w-5 text-[#2563EB]" />
            Add Back Office Staff Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Staff Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Sharma Rajesh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1.5 h-10 text-xs rounded-xl"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Role / Responsibility
            </Label>
            <Input
              placeholder="e.g. Service Intake & Dispatch / Frontdesk Coordinator"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1.5 h-10 text-xs rounded-xl"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Contact / Mobile Number
            </Label>
            <Input
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 h-10 text-xs rounded-xl font-mono"
            />
          </div>

          <DialogFooter className="border-t pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="h-9 text-xs rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
            >
              {saving ? "Saving..." : "Add Staff Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
