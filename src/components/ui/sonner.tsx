import { createPortal } from "react-dom";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const toasterNode = (
    <Sonner
      theme="light"
      richColors
      position="top-center"
      className="toaster group !z-[2147483647] pointer-events-auto"
      style={{ zIndex: 2147483647 }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !z-[2147483647] pointer-events-auto group-[.toaster]:!bg-white dark:group-[.toaster]:!bg-slate-900 group-[.toaster]:!text-slate-950 dark:group-[.toaster]:!text-white group-[.toaster]:border-2 group-[.toaster]:border-slate-200 dark:group-[.toaster]:border-slate-700 group-[.toaster]:!shadow-2xl group-[.toaster]:!opacity-100 font-bold",
          error:
            "!bg-red-600 !text-white !border-red-700 !shadow-2xl !opacity-100 [&_[data-description]]:!text-red-50",
          success:
            "!bg-emerald-600 !text-white !border-emerald-700 !shadow-2xl !opacity-100 [&_[data-description]]:!text-emerald-50",
          warning:
            "!bg-amber-500 !text-slate-950 !border-amber-600 !shadow-2xl !opacity-100",
          description: "group-[.toast]:text-slate-600 dark:group-[.toast]:text-slate-300 font-medium",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(toasterNode, document.body);
  }

  return toasterNode;
};

export { Toaster, toast };

