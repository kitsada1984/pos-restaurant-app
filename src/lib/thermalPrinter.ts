/**
 * Thermal Printer Helper for POS Receipts and Kitchen Tickets
 * Solves the duplicate printing bug and blank trailing pages by isolating
 * the printable element in a clean hidden iframe with zero parent layout interference.
 */

interface PrintThermalOptions {
  copies?: number;
  width?: '80mm' | '58mm';
}

export async function printThermalElement(
  elementId: string,
  options: PrintThermalOptions = {}
): Promise<boolean> {
  const { copies = 1, width = '80mm' } = options;

  if (typeof window === 'undefined') {
    return false;
  }

  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    console.warn(`[printThermalElement] Element #${elementId} not found, fallback to window.print()`);
    window.print();
    return false;
  }

  // Remove any previous print iframe to avoid DOM clutter
  const existingIframe = document.getElementById('thermal-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = width;
  iframe.style.height = '100px';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    console.warn('[printThermalElement] Unable to access iframe document, fallback to window.print()');
    window.print();
    return false;
  }

  // Extract all existing stylesheet and style tags from current document so Tailwind rules apply
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((tag) => tag.outerHTML)
    .join('\n');

  // Build the receipt HTML blocks based on the requested number of copies
  const receiptHtml = sourceElement.outerHTML;
  let bodyContent = '';

  for (let i = 0; i < copies; i++) {
    const isLast = i === copies - 1;
    bodyContent += `
      <div class="thermal-slip-instance ${!isLast ? 'slip-page-break' : ''}">
        ${receiptHtml}
      </div>
    `;
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Thermal Print</title>
        ${headStyles}
        <style>
          @page {
            size: ${width} auto;
            margin: 0mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${width} !important;
            max-width: ${width} !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          .thermal-slip-instance {
            width: ${width} !important;
            max-width: ${width} !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .slip-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          #${elementId} {
            position: static !important;
            width: 100% !important;
            max-width: ${width} !important;
            margin: 0 auto !important;
            padding: 2.5mm 3mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `);
  iframeDoc.close();

  return new Promise((resolve) => {
    // Give browser time to parse CSS and SVG barcodes/QR codes
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch (err) {
        console.error('[printThermalElement] Iframe print exception, fallback to window.print()', err);
        window.print();
        resolve(false);
      } finally {
        // Cleanup iframe after print dialog resolves or closes
        setTimeout(() => {
          if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 3000);
      }
    }, 250);
  });
}
