import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCustomer } from "@/lib/firestore";
import type { Customer } from "@/lib/types";

interface ImportCustomersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ParsedContact {
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  address?: string;
  status: "valid" | "missing_name" | "missing_phone";
}

export default function ImportCustomersModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportCustomersModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Download Sample CSV
  const handleDownloadSample = () => {
    const sampleCSV = `Name,Phone,Email,CompanyName,Address\nSharma Rajesh,+91 9823011111,rajesh@sharma.com,Acme Traders,Shop 12 Station Road Pune\nPatel Amit,+91 9823022222,amit.patel@gmail.com,Patel Enterprises,Plot 45 Industrial Area Gurugram\nVerma Sunita,+91 9823033333,,Verma Solutions,MG Road Commercial Hub`;
    const blob = new Blob([sampleCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "zorba_contacts_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Robust Native CSV Parser
  const parseCSVText = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      toast.error("CSV file is empty or missing headers");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
    const contacts: ParsedContact[] = [];

    // Header Mappings
    const nameIdx = headers.findIndex((h) => h.includes("name") && !h.includes("company"));
    const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("contact"));
    const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
    const companyIdx = headers.findIndex((h) => h.includes("company") || h.includes("business") || h.includes("org"));
    const addressIdx = headers.findIndex((h) => h.includes("address") || h.includes("location") || h.includes("street"));

    for (let i = 1; i < lines.length; i++) {
      // Split by comma ignoring commas inside quotes
      const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
      const cleanValues = values.map((v) => v.trim().replace(/^["']|["']$/g, ""));

      const nameVal = nameIdx !== -1 ? cleanValues[nameIdx] || "" : cleanValues[0] || "";
      const phoneVal = phoneIdx !== -1 ? cleanValues[phoneIdx] || "" : cleanValues[1] || "";
      const emailVal = emailIdx !== -1 ? cleanValues[emailIdx] || "" : "";
      const companyVal = companyIdx !== -1 ? cleanValues[companyIdx] || "" : "";
      const addressVal = addressIdx !== -1 ? cleanValues[addressIdx] || "" : "";

      let status: "valid" | "missing_name" | "missing_phone" = "valid";
      if (!nameVal) status = "missing_name";
      else if (!phoneVal) status = "missing_phone";

      contacts.push({
        name: nameVal,
        phone: phoneVal.startsWith("+") ? phoneVal : phoneVal ? `+91 ${phoneVal}` : "",
        email: emailVal || undefined,
        companyName: companyVal || undefined,
        address: addressVal || undefined,
        status,
      });
    }

    setParsedContacts(contacts);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) parseCSVText(content);
    };
    reader.readAsText(file);
  };

  const validCount = parsedContacts.filter((c) => c.status === "valid").length;

  const handleStartImport = async () => {
    const validList = parsedContacts.filter((c) => c.status === "valid");
    if (validList.length === 0) {
      toast.error("No valid contacts found to import");
      return;
    }

    setImporting(true);
    let successCount = 0;
    try {
      for (const item of validList) {
        await createCustomer({
          name: item.name,
          phone: item.phone,
          email: item.email,
          companyName: item.companyName,
          address: item.address,
        });
        successCount++;
        setImportedCount(successCount);
      }
      toast.success(`Successfully imported ${successCount} customer contacts!`);
      if (onImportComplete) onImportComplete();
      onOpenChange(false);
      // Reset
      setFileName(null);
      setParsedContacts([]);
      setImportedCount(0);
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete CSV import");
    } finally {
      setImporting(false);
    }
  };

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
