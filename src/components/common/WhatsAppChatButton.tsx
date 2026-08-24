import { MessageSquare } from "lucide-react";
import { formatIndianPhoneNumber } from "@/lib/utils";

interface WhatsAppChatButtonProps {
  phone?: string;
  message?: string;
  label?: string;
  variant?: "badge" | "button" | "icon";
  className?: string;
}

/**
 * Standardized WhatsApp direct chat launcher button / badge.
 */
export default function WhatsAppChatButton({
  phone,
  message,
  label = "WhatsApp",
  variant = "badge",
  className = "",
}: WhatsAppChatButtonProps) {
  if (!phone) return null;

  const normalizedPhone = formatIndianPhoneNumber(phone);
  const waUrl = `https://wa.me/${normalizedPhone}${
    message ? `?text=${encodeURIComponent(message)}` : ""
  }`;

  if (variant === "icon") {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center justify-center h-7 w-7 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors ${className}`}
        title={`Chat on WhatsApp (${phone})`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </a>
    );
  }

  if (variant === "button") {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors ${className}`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md transition-colors ${className}`}
    >
      <MessageSquare className="h-3 w-3" />
      <span>{label}</span>
    </a>
  );
}
