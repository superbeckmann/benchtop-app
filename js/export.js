






export const ExportTools = (() => {
  async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const element = document.getElementById('exportArea'); 
    if (!element) {
      console.error('Export area not found');
      return;
    }

    try {
      
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');

      
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight) {
        
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
    const element = document.getElementById('exportArea'); 
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


window.ExportTools = ExportTools;
