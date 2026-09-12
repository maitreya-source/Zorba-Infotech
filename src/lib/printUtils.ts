/**
 * Zero-Memory-Crash Print Utility for Zorba Infotech
 * 
 * Instead of invoking window.print() on the primary application tab (which forces Chromium
 * to snapshot and layout the entire React DOM tree, catalog caches, and background components,
 * causing tab crashes and memory exhaustion), this utility isolates the printable content
 * inside an invisible detached iframe or clean standalone window.
 */

export function printIsolatedElement(elementId: string, title = "Print Document"): void {
  // 1. Release active focus so Radix/ARIA focus locks don't fight the print dialog
  if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  // 2. Fallback / Test Environment Handling (e.g. jsdom in Vitest)
  if (typeof window !== "undefined" && (window.navigator?.userAgent?.includes("jsdom") || !document.getElementById)) {
    window.print();
    return;
  }

  const printArea = document.getElementById(elementId);
  if (!printArea) {
    window.print();
    return;
  }

  try {
    const iframeId = `__zorba_print_frame_${elementId}__`;
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (iframe) {
      iframe.remove();
    }

    iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc || !iframe.contentWindow) {
      window.print();
      return;
    }

    // Collect all computed stylesheets (Tailwind, fonts, custom rules)
    const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((tag) => tag.outerHTML)
      .join("\n");

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page {
              size: portrait;
              margin: 4mm 6mm;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 4px !important;
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden { display: none !important; }
            .print\\:border-black { border-color: #000000 !important; }
            .print\\:bg-white { background-color: #ffffff !important; }
            .print\\:bg-black { background-color: #000000 !important; color: #ffffff !important; }
          </style>
          ${styles}
        </head>
        <body>
          <div style="width: 100%; max-width: 210mm; margin: 0 auto;">
            ${printArea.outerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    const frameWindow = iframe.contentWindow;
    setTimeout(() => {
      try {
        if (frameWindow && typeof frameWindow.print === "function") {
          frameWindow.focus();
          frameWindow.print();
        } else {
          window.print();
        }
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          try {
            iframe?.remove();
          } catch {}
        }, 5000);
      }
    }, 150);
  } catch {
    window.print();
  }
}

export function openStandalonePrintWindow(elementId: string, title = "Print Document"): void {
  if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  const printArea = document.getElementById(elementId);
  if (!printArea) {
    window.print();
    return;
  }

  const printWindow = window.open("", "_blank", "width=850,height=950");
  if (!printWindow) {
    // Popup blocked by browser, seamlessly fall back to isolated iframe print
    printIsolatedElement(elementId, title);
    return;
  }

  const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((tag) => tag.outerHTML)
    .join("\n");

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { size: portrait; margin: 4mm 6mm; }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0;
            padding: 10px;
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
        </style>
        ${styles}
      </head>
      <body>
        <div style="max-width: 210mm; margin: 0 auto;">
          ${printArea.outerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
