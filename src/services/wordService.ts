import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx';
import { ProcessedQuestion } from '../types';

export const generateExamDocument = async (questions: ProcessedQuestion[]): Promise<Blob> => {
  
  const docChildren = [];

  // Title
  docChildren.push(
    new Paragraph({
      text: "Sınav Soruları",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Questions
  questions.forEach((q, index) => {
    
    // Handle multiline text (e.g. for premises I., II., III.)
    // We split by newline and create TextRuns. 
    // The first one follows the number, subsequent ones have a break.
    const textParts = q.text.split('\n');
    const textRuns: TextRun[] = [];
    
    // First part (inline with Number)
    textRuns.push(
      new TextRun({
        text: textParts[0],
        size: 24, // 12pt
      })
    );

    // Subsequent parts (premises) with line breaks
    for (let i = 1; i < textParts.length; i++) {
      textRuns.push(
        new TextRun({
          text: textParts[i],
          size: 24, // 12pt
          break: 1, // Adds a line break (Shift+Enter behavior)
        })
      );
    }

    // Question Number and Text Paragraph
    // CRITICAL FIX: keepNext: true ensures the text stays with the image/options
    // keepLines: true ensures the paragraph itself doesn't break across pages
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${q.originalNumber}. `,
            bold: true,
            size: 24, // 12pt
          }),
          ...textRuns
        ],
        spacing: { before: 400, after: 200 },
        keepNext: true, 
        keepLines: true,
      })
    );

    // Add Image if present
    if (q.image) {
      // Constants for layout limits
      const MAX_WIDTH = 500; 
      const MAX_HEIGHT = 500;

      let finalWidth = q.image.width;
      let finalHeight = q.image.height;

      // 1. Scale down by width if needed
      if (finalWidth > MAX_WIDTH) {
        const ratio = MAX_WIDTH / finalWidth;
        finalWidth = MAX_WIDTH;
        finalHeight = finalHeight * ratio;
      }

      // 2. Scale down by height if needed (checking against new height)
      if (finalHeight > MAX_HEIGHT) {
        const ratio = MAX_HEIGHT / finalHeight;
        finalHeight = MAX_HEIGHT;
        finalWidth = finalWidth * ratio;
      }

      // Convert base64 string to Uint8Array for docx
      const binaryString = atob(q.image.base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      docChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: bytes,
              transformation: {
                width: finalWidth,
                height: finalHeight,
              },
              type: "jpg", // We extract as jpeg
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200, before: 100 },
          keepNext: true, // Image must stay with options
        })
      );
    }

    // Options (each on a new line)
    q.options.forEach((opt, optIndex) => {
      // Check if this is the last option of the question
      const isLastOption = optIndex === q.options.length - 1;

      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${opt.label}) `,
              bold: true,
              size: 22, // 11pt
            }),
            new TextRun({
              text: opt.text,
              size: 22, // 11pt
            }),
          ],
          indent: { left: 720 }, // Indent options
          spacing: { after: 100 },
          keepLines: true,
          // If it's NOT the last option, keep it with the next line.
          // If it IS the last option, we allow a page break after it.
          keepNext: !isLastOption, 
        })
      );
    });
  });

  // Answer Key (New Page)
  docChildren.push(
    new Paragraph({
      children: [new TextRun("")],
      pageBreakBefore: true,
    })
  );

  docChildren.push(
    new Paragraph({
      text: "Cevap Anahtarı",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Format Answer Key in columns or list
  questions.forEach((q) => {
    const correctOpt = q.options.find(o => o.isCorrect);
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${q.originalNumber}. ${correctOpt?.label}`,
            bold: true,
            size: 24,
          }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
};