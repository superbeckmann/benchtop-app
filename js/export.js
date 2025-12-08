// export.js
// Handles PDF and Image export for the benchtop canvas + report

// Make sure jsPDF and html2canvas are loaded in your HTML before this script:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

export const ExportTools = (() => {
  async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const element = document.getElementById('exportArea'); // ✅ wrapper with canvas + report
    if (!element) {
      console.error('Export area not found');
      return;
    }

    try {
      // Capture the container (canvas + report)
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');

      // ✅ Landscape orientation
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Scale image proportionally
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight) {
        // Shrink to fit page height if too tall
        const ratio = pageHeight / imgHeight;
        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;
        pdf.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save('benchtop.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  }

  async function downloadImage() {
    const element = document.getElementById('exportArea'); // ✅ wrapper with canvas + report
    if (!element) {
      console.error('Export area not found');
      return;
    }

    try {
      const canvas = await html2canvas(element);
      const link = document.createElement('a');
      link.download = 'benchtop.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Image export failed:', err);
    }
  }

  return {
    downloadPDF,
    downloadImage
  };
})();

// Expose globally for inline onclick
window.ExportTools = ExportTools;
