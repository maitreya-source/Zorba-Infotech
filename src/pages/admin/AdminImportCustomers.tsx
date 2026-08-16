import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Users,
  RefreshCw,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createCustomer } from "@/lib/firestore";

interface ParsedContact {
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  address?: string;
  status: "valid" | "missing_name" | "missing_phone";
}

export default function AdminImportCustomers() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Download Sample CSV Template
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

    const nameIdx = headers.findIndex((h) => h.includes("name") && !h.includes("company"));
    const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("contact"));
    const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
    const companyIdx = headers.findIndex((h) => h.includes("company") || h.includes("business") || h.includes("org"));
    const addressIdx = headers.findIndex((h) => h.includes("address") || h.includes("location") || h.includes("street"));

    for (let i = 1; i < lines.length; i++) {
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
    let duplicateCount = 0;
    try {
      for (const item of validList) {
        try {
          await createCustomer({
            name: item.name,
            phone: item.phone,
            email: item.email,
            companyName: item.companyName,
            address: item.address,
          });
          successCount++;
          setImportedCount(successCount);
        } catch (itemErr: any) {
          if (itemErr?.message?.includes("already exists")) {
            duplicateCount++;
          } else {
            console.warn("Error importing row:", itemErr);
          }
        }
      }
      if (duplicateCount > 0) {
        toast.success(`Imported ${successCount} contacts (${duplicateCount} existing duplicate phone numbers skipped).`);
      } else {
        toast.success(`Successfully imported ${successCount} contacts into database!`);
      }
      navigate("/admin/customers");
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete CSV import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto text-xs">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Admin</span>
          <span>/</span>
          <Link to="/admin/customers" className="hover:text-slate-900 transition-colors">
            Customers
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-900 dark:text-white">
            Bulk CSV Import
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/customers">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs hover:bg-slate-50 text-slate-700 dark:text-slate-300 gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Customers
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Bulk CSV Contact Importer
            </h1>
            <p className="text-xs text-slate-300">
              Upload customer contacts from Excel / CSV files for instant auto-complete in service tickets
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
            className="h-9 text-xs rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold gap-1.5 shrink-0"
          >
            <Download className="h-4 w-4 text-emerald-400" /> Download Sample CSV
          </Button>
        </div>
      </div>

      {/* Upload Drop Zone Card */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 rounded-2xl p-8 text-center cursor-pointer bg-card hover:bg-muted/30 transition-all space-y-3 shadow-xs"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">
            {fileName ? `File Selected: ${fileName}` : "Click or Drag & Drop CSV Contact File Here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Expected Header Row: <code>Name (LastName FirstName), Phone, Email, CompanyName, Address</code>
          </p>
        </div>
      </div>

      {/* Parsed Contacts Preview List */}
      {parsedContacts.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-bold text-sm text-foreground">
              Parsed Contacts Preview ({validCount} Valid / {parsedContacts.length} Total Rows)
            </span>
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
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Start Import ({validCount} Contacts)
                </>
              )}
            </Button>
          </div>

          <div className="rounded-xl border divide-y max-h-96 overflow-y-auto">
            {parsedContacts.map((c, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between gap-3 hover:bg-muted/20">
                <div className="flex items-center gap-2">
                  {c.status === "valid" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-foreground text-xs">{c.name || "Missing Name"}</span>
                    {c.companyName && (
                      <span className="text-muted-foreground ml-1.5 font-medium text-[11px]">
                        ({c.companyName})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-muted-foreground font-mono text-[11px]">
                  <span>📞 {c.phone || "Missing Phone"}</span>
                  {c.email && <span>✉️ {c.email}</span>}
                  {c.address && <span className="truncate max-w-xs">📍 {c.address}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
