import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { ProcessedQuestion } from '../types';

export const generateExamPDF = async (questions: ProcessedQuestion[]): Promise<Blob> => {
  // Create a temporary container for the PDF content
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  // A4 width in pt (595.28) minus margins. 
  // We set a fixed width to ensure text wraps exactly as it will on the PDF.
  container.style.width = '550pt'; 
  container.style.padding = '20pt';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = 'Arial, sans-serif'; // Standard safe font
  container.style.color = '#000000';
  
  document.body.appendChild(container);

  // Helper to escape HTML
  const escapeHtml = (unsafe: string) => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  };

  // Helper to process text with newlines
  const formatText = (text: string) => {
    return escapeHtml(text).replace(/\n/g, '<br/>');
  };

  // --- BUILD HTML CONTENT ---
  let htmlContent = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 24px; margin: 0; font-weight: bold;">Sınav Soruları</h1>
    </div>
  `;

  questions.forEach((q) => {
    let imageHtml = '';
    if (q.image) {
      // Constrain image size
      imageHtml = `
        <div style="display: flex; justify-content: center; margin: 15px 0;">
          <img src="data:image/jpeg;base64,${q.image.base64}" style="max-width: 300px; max-height: 250px; height: auto; width: auto;" />
        </div>
      `;
    }

    const optionsHtml = q.options.map(opt => `
      <div style="margin-bottom: 8px; page-break-inside: avoid; display: flex;">
        <span style="font-weight: bold; min-width: 25px;">${opt.label})</span>
        <span>${formatText(opt.text)}</span>
      </div>
    `).join('');

    htmlContent += `
      <div style="margin-bottom: 25px; page-break-inside: avoid;">
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold; font-size: 16px;">${q.originalNumber}. </span>
          <span style="font-size: 15px;">${formatText(q.text)}</span>
        </div>
        ${imageHtml}
        <div style="margin-left: 15px; margin-top: 10px;">
          ${optionsHtml}
        </div>
      </div>
    `;
  });

  // Page break for Answer Key
  htmlContent += `<div style="page-break-before: always;"></div>`;
  
  // Answer Key Section
  htmlContent += `
    <div style="text-align: center; margin-bottom: 30px; margin-top: 20px;">
      <h1 style="font-size: 20px; font-weight: bold;">Cevap Anahtarı</h1>
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
  `;

  questions.forEach((q) => {
    const correctOpt = q.options.find(o => o.isCorrect);
    htmlContent += `
      <div style="width: 60px; margin-bottom: 10px; font-size: 14px;">
        <b>${q.originalNumber}.</b> ${correctOpt?.label}
      </div>
    `;
  });

  htmlContent += `</div>`;

  container.innerHTML = htmlContent;

  // --- GENERATE PDF FROM HTML ---
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4'
  });

  return new Promise<Blob>((resolve, reject) => {
    try {
      // We assume html2canvas is available globally via the import map or passed directly
      // Note: jsPDF's .html() method relies on html2canvas
      doc.html(container, {
        callback: (doc) => {
          const blob = doc.output('blob');
          document.body.removeChild(container); // Cleanup
          resolve(blob);
        },
        x: 20, // Margins
        y: 20,
        width: 555, // Target width inside PDF (content width)
        windowWidth: 800, // Virtual window width to render CSS correctly
        autoPaging: 'text', // Better for avoiding cutting text in half
        html2canvas: {
          scale: 0.8, // Adjust scale to fit content better
          useCORS: true, // Helps with images if needed
          logging: false
        }
      });
    } catch (e) {
      document.body.removeChild(container);
      reject(e);
    }
  });
};