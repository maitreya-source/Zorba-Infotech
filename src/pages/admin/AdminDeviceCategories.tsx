import { useEffect, useState } from "react";
import { FolderPlus, Trash2, Folder, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getDeviceCategories, deleteDeviceCategory } from "@/lib/firestore";
import type { DeviceCategory } from "@/lib/types";
import CreateDeviceCategoryModal from "@/components/admin/CreateDeviceCategoryModal";

export default function AdminDeviceCategories() {
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDeviceCategories();
      setCategories(data);
    } catch (err: any) {
      console.error("Firebase error in AdminDeviceCategories:", err);
      setError(err?.message || "Failed to connect to Firebase to load device categories.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDeviceCategory(deleteId);
      toast.success("Device category deleted");
      setDeleteId(null);
      loadData();
    } catch {
      toast.error("Failed to delete device category");
    }
  };

  const filtered = categories.filter(
    (c) =>
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Folder className="h-6 w-6 text-primary" /> Device Categories
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure categories for auto-fill in service call entry forms
          </p>
        </div>

        <Button onClick={() => setShowCreateModal(true)} className="gap-2 shadow-sm">
          <FolderPlus className="h-4 w-4" /> Add Device Category
        </Button>
      </div>

      <div className="max-w-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-destructive/5 border-destructive/20 py-16 text-center px-4">
          <p className="font-bold text-destructive text-base">Firebase Connection Error</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">{error}</p>
          <Button onClick={() => loadData()} className="mt-4 gap-2" variant="outline">
            Retry Connection
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center">
          <Folder className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="font-semibold text-base">No Device Categories Found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border bg-card p-4 flex justify-between items-start hover:shadow-sm transition-all"
            >
              <div>
                <h3 className="font-bold text-sm font-display text-foreground">{cat.name}</h3>
                {cat.description && (
                  <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteId(cat.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <CreateDeviceCategoryModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={loadData}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? Service calls using it will retain their text.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
