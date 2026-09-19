import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCustomerCsvImport } from "@/hooks/useCustomerCsvImport";

interface ImportCustomersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export default function ImportCustomersModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportCustomersModalProps) {
  const {
    fileInputRef,
    fileName,
    setFileName,
    parsedContacts,
    setParsedContacts,
    importing,
    importedCount,
    setImportedCount,
    validCount,
    handleDownloadSample,
    handleFileChange,
    handleStartImport,
  } = useCustomerCsvImport(() => {
    if (onImportComplete) onImportComplete();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center justify-between font-display text-base">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              Import Customers from CSV File
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              className="gap-1.5 text-xs h-8 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
            >
              <Download className="h-3.5 w-3.5" /> Sample CSV Template
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all space-y-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
              <Upload className="h-5 w-5" />
            </div>
            <p className="font-bold text-foreground text-xs">
              {fileName ? `Selected: ${fileName}` : "Click to Upload or Drag & Drop CSV File"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Format: <code>Name (LastName FirstName), Phone, Email, CompanyName, Address</code>
            </p>
          </div>

          {/* Preview Table */}
          {parsedContacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-foreground font-bold">
                  Parsed Contacts Preview ({validCount} Valid / {parsedContacts.length} Total)
                </span>
                {importing && (
                  <span className="text-primary font-bold">
                    Importing... {importedCount}/{validCount}
                  </span>
                )}
              </div>

              <div className="rounded-xl border max-h-48 overflow-y-auto divide-y text-xs">
                {parsedContacts.map((c, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between gap-2 bg-card hover:bg-muted/20">
                    <div className="flex items-center gap-2">
                      {c.status === "valid" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-foreground">{c.name || "Missing Name"}</span>
                        {c.companyName && <span className="text-muted-foreground ml-1 font-medium">({c.companyName})</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
                      <span>📞 {c.phone || "No phone"}</span>
                      {c.email && <span>✉️ {c.email}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartImport}
              disabled={importing || validCount === 0}
              size="sm"
              className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {importing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Importing ({importedCount}/{validCount})
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Import {validCount} Contacts
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
