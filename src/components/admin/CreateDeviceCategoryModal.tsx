import { useState } from "react";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";
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
import { createDeviceCategory } from "@/lib/firestore";
import type { DeviceCategory } from "@/lib/types";

interface CreateDeviceCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (category: DeviceCategory) => void;
}

export default function CreateDeviceCategoryModal({
  open,
  onOpenChange,
  onCreated,
}: CreateDeviceCategoryModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      const cat = await createDeviceCategory(name.trim(), description.trim());
      toast.success("Device Category added");
      onCreated?.(cat);
      onOpenChange(false);
      setName("");
      setDescription("");
    } catch {
      toast.error("Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <FolderPlus className="h-5 w-5 text-primary" />
            Add Device Category
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="cat-name">Category Name *</Label>
            <Input
              id="cat-name"
              placeholder="e.g. Printer, Laptop, Toner, CCTV, Router"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cat-desc">Description (Optional)</Label>
            <Input
              id="cat-desc"
              placeholder="Short notes or item types"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel (Esc)
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
