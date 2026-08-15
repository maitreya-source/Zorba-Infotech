import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateStaffMember } from "@/lib/firestore";
import { toTitleCase, formatIndianPhoneNumber } from "@/lib/utils";
import type { StaffMember } from "@/lib/types";

interface EditStaffModalProps {
  staff: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export default function EditStaffModal({
  staff,
  open,
  onOpenChange,
  onUpdated,
}: EditStaffModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (staff) {
      setName(staff.name || "");
      setRole(staff.role || "");
      setPhone(staff.phone || "");
      setActive(staff.active !== false);
    }
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    if (!name.trim()) {
      toast.error("Staff name is required");
      return;
    }

    setSaving(true);
    try {
      await updateStaffMember(staff.id, {
        name: toTitleCase(name),
        role: role.trim() ? toTitleCase(role) : undefined,
        phone: phone.trim() ? formatIndianPhoneNumber(phone) : undefined,
        active,
      });

      toast.success("Staff profile updated");
      if (onUpdated) onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating staff member:", err);
      toast.error(err?.message || "Failed to update staff member");
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
            Edit Back Office Staff Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Staff Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 h-10 text-xs rounded-xl font-mono"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Status</Label>
              <p className="text-[11px] text-slate-500">Enable or disable for ticket assignments</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
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
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
