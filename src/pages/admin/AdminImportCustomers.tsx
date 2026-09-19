import { Link, useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerCsvImport } from "@/hooks/useCustomerCsvImport";

export default function AdminImportCustomers() {
  const navigate = useNavigate();
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
  } = useCustomerCsvImport(() => navigate("/admin/customers"));

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
