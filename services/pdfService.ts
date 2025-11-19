import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to a reliable CDN that supports ES modules.
// We use esm.sh to match the import in index.html and ensure version compatibility (v4.8.69).
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

export const getPdfPageCount = async (file: File): Promise<number> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
};

export const getSinglePdfPage = async (file: File, pageNumber: number): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Validate page number
  const pageNum = Math.max(1, Math.min(pageNumber, pdf.numPages));
  
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.0 }); // Standard scale for preview is enough
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) return "";

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  // Convert to base64 string
  const base64 = canvas.toDataURL('image/jpeg', 0.8);
  return base64.split(',')[1];
};

export const convertPdfToImages = async (file: File, startPage: number = 1, endPage: number): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  // Validate range
  const start = Math.max(1, startPage);
  const end = Math.min(pdf.numPages, endPage || pdf.numPages);

  for (let i = start; i <= end; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // Scale up for better OCR quality
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert to base64 string (JPEG for smaller size than PNG)
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    // Remove the prefix to just get the base64 data
    const cleanBase64 = base64.split(',')[1];
    images.push(cleanBase64);
  }

  return images;
};