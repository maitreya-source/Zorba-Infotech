import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { batchCreateCustomers } from "@/lib/firestore";
import { parseCsvLine } from "@/lib/utils";

export interface ParsedContact {
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  address?: string;
  status: "valid" | "missing_name" | "missing_phone";
}

export function useCustomerCsvImport(onImportSuccess?: () => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleDownloadSample = useCallback(() => {
    const sampleCSV =
      "Name,Phone,Email,CompanyName,Address\n" +
      "Customer Full Name,+91 9826000000,customer@domain.com,Firm / Business Name,Tagore Marg Neemuch MP";
    const blob = new Blob([sampleCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "zorba_contacts_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const parseCSVText = useCallback((text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      toast.error("CSV file is empty or missing headers");
      return;
    }

    const headers = parseCsvLine(lines[0]).map((h) =>
      h.trim().replace(/^["']|["']$/g, "").toLowerCase()
    );
    const contacts: ParsedContact[] = [];

    const nameIdx = headers.findIndex((h) => h.includes("name") && !h.includes("company"));
    const phoneIdx = headers.findIndex(
      (h) => h.includes("phone") || h.includes("mobile") || h.includes("contact")
    );
    const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
    const companyIdx = headers.findIndex(
      (h) => h.includes("company") || h.includes("business") || h.includes("org")
    );
    const addressIdx = headers.findIndex(
      (h) => h.includes("address") || h.includes("location") || h.includes("street")
    );

    for (let i = 1; i < lines.length; i++) {
      const cleanValues = parseCsvLine(lines[i]).map((v) =>
        v.trim().replace(/^["']|["']$/g, "")
      );

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
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (content) parseCSVText(content);
      };
      reader.readAsText(file);
    },
    [parseCSVText]
  );

  const validCount = parsedContacts.filter((c) => c.status === "valid").length;

  const resetImport = useCallback(() => {
    setFileName(null);
    setParsedContacts([]);
    setImportedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleStartImport = useCallback(async () => {
    const validList = parsedContacts.filter((c) => c.status === "valid");
    if (validList.length === 0) {
      toast.error("No valid contacts found to import");
      return;
    }

    setImporting(true);
    try {
      const result = await batchCreateCustomers(
        validList.map((c) => ({
          name: c.name,
          phone: c.phone,
          email: c.email,
          companyName: c.companyName,
          address: c.address,
        })),
        (processed) => {
          setImportedCount(processed);
        }
      );

      if (result.duplicateCount > 0) {
        toast.success(
          `Batch import complete: ${result.importedCount} contacts added (${result.duplicateCount} duplicates skipped).`
        );
      } else {
        toast.success(`Successfully imported ${result.importedCount} contacts into database!`);
      }

      onImportSuccess?.();
      resetImport();
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to complete CSV import");
    } finally {
      setImporting(false);
    }
  }, [parsedContacts, onImportSuccess, resetImport]);

  return {
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
    resetImport,
  };
}
