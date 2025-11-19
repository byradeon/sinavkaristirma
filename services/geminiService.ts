import { GoogleGenAI, Type } from "@google/genai";
import { RawQuestion, QuestionImage } from '../types';

// Initialize the Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash"; // High speed, good vision, perfect for this volume

// Helper to crop image based on bounding box
const cropImageFromPage = async (
  base64FullPage: string, 
  box: number[]
): Promise<QuestionImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Box is [ymin, xmin, ymax, xmax] normalized 0-1000
        const [ymin, xmin, ymax, xmax] = box;
        const w = img.width;
        const h = img.height;

        // ASYMMETRIC PADDING LOGIC
        
        // HORIZONTAL (X): Keep generous padding (8% or min 40px) to capture side borders/frames.
        const padX = Math.max(w * 0.08, 40);

        // VERTICAL TOP (padTop): Tiny padding (0.5% or min 4px).
        const padTop = Math.max(h * 0.005, 4);

        // VERTICAL BOTTOM (padBottom): ZERO TOLERANCE.
        // Since we removed masking, we cannot allow ANY extra space at the bottom 
        // because it risks including the question text or options. 
        // Better to cut a pixel of the image than to reveal the answer key.
        const padBottom = 0;

        // Calculate pixel coordinates with padding, clamped to image dimensions
        // START POINTS (Top-Left)
        const cropX = Math.max(0, (xmin / 1000) * w - padX);
        const cropY = Math.max(0, (ymin / 1000) * h - padTop);
        
        // DIMENSIONS (Width/Height)
        // Original unpadded width/height
        const originalBoxW = ((xmax - xmin) / 1000) * w;
        const originalBoxH = ((ymax - ymin) / 1000) * h;

        let cropW = originalBoxW + (padX * 2);
        let cropH = originalBoxH + padTop + padBottom;

        // Clamp width/height so we don't go outside image
        if (cropX + cropW > w) cropW = w - cropX;
        if (cropY + cropH > h) cropH = h - cropY;

        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Fill white background first
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, cropW, cropH);
        
        // Draw the cropped image
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; // High quality
        resolve({
          base64: croppedBase64,
          width: cropW,
          height: cropH
        });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = `data:image/jpeg;base64,${base64FullPage}`;
  });
};

// Helper to post-process text for better formatting of premises (I., II., III.)
const formatExtractedText = (text: string): string => {
  if (!text) return "";
  
  let formatted = text;

  // Regex to find Roman numerals (I, II, III, IV, V, VI, VII) followed by a dot.
  // It looks for these patterns either at the start or preceded by a space/punctuation.
  // It replaces them with a Newline + Roman Numeral.
  
  // Also support Arabic numerals (1., 2.) appearing in question stem as premises, 
  // BUT we must be careful not to break dates or decimals.
  // We require a space or start of line before, and a space or uppercase letter after.
  
  // Pattern: (\s|^|[?!]) -> Preceded by space, start, or punctuation (? or !)
  // (I|II|III|IV|V|VI|VII|\d+) -> Roman numerals OR Arabic digits
  // \. -> Literal dot
  // (?=\s|[A-Z]) -> Lookahead: Must be followed by space or Uppercase letter (prevents 1.5mg or 01.01.2023)
  
  const premiseRegex = /(\s|^|[?!])(I|II|III|IV|V|VI|VII|\d+)\.(?=\s|[A-Z])/g;
  
  formatted = formatted.replace(premiseRegex, (match, p1, p2) => {
    // p1 is the separator (space, start, or ?). We want to keep punctuation if it exists.
    const prefix = p1 === '?' || p1 === '!' ? p1 : ''; 
    // Return: Prefix + Newline + Number + Dot + Space
    return `${prefix}\n${p2}. `;
  });

  // Cleanup: if we accidentally created double newlines or weird spaces
  formatted = formatted.replace(/\n\s+/g, '\n');
  formatted = formatted.replace(/\n\s*\n/g, '\n');
  
  // Trim leading newline if it was added at the very start
  formatted = formatted.trim();

  return formatted;
};

export const extractQuestionsFromImage = async (base64Image: string, includeImages: boolean): Promise<RawQuestion[]> => {
  try {
    // Define specific instructions based on user preference
    const imageInstruction = includeImages 
      ? `7. IMAGE EXTRACTION STRATEGY: 
         - PRIMARY GOAL: Identify the 'pure_graphic_bbox' (Bounding Box) of the X-Ray, Diagram, or Chart.
         - TEXT EXCLUSION: The bounding box MUST NOT include the question text, figure captions (e.g., "Resimde görülen..."), or the option letters (A), B)).
         - BOUNDARY: Stop exactly at the bottom pixel of the graphic. Do not include whitespace between the graphic and the text below it.`
      : `7. IMAGE DETECTION: Do not extract any bounding boxes or images. Ignore diagrams.`;

    const schemaProperties: any = {
      number: { type: Type.STRING, description: "The extracted question number (e.g., '1', '2')" },
      text: { type: Type.STRING, description: "The main text of the question" },
      options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of answer choices. Index 0 is assumed to be the original Option A."
      }
    };

    if (includeImages) {
      // Renamed property to 'pure_graphic_bbox' to semantically force the model 
      // to think about the graphic only, not the 'figure block' which implies caption.
      schemaProperties.pure_graphic_bbox = {
        type: Type.ARRAY,
        items: { type: Type.NUMBER },
        description: "Bounding box [ymin, xmin, ymax, xmax] (0-1000) of the PURE IMAGE. Do not include captions or text."
      };
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: `You are an expert OCR and exam digitization system. 
            Analyze the image provided which is a page from an exam.
            
            RULES:
            1. Extract all multiple choice questions.
            2. The input format assumes the CORRECT ANSWER IS ALWAYS THE FIRST OPTION (Option A).
            3. Ignore headers, footers, page numbers, and random noise.
            4. Extract the question number, the question text (stem), and the list of options.
            5. Ensure the 'options' array contains the option text only (remove labels like 'A)', 'B.', etc., from the start of the text).
            6. The first item in the 'options' array MUST be the text corresponding to option 'A' (the correct answer).
            8. PREMISE FORMATTING: If a question contains Roman numeral premises (I., II., III.) or numbered lists (1., 2.), ensure they are included in the text.
            ${imageInstruction}
            
            Return the data in JSON format.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: schemaProperties,
            required: ["number", "text", "options"],
          },
        },
      },
    });

    if (response.text) {
      const rawData = JSON.parse(response.text) as (RawQuestion & { pure_graphic_bbox?: number[] })[];
      
      // Post-process: Crop images if bbox exists AND user wanted images
      const processedData: RawQuestion[] = [];
      
      for (const item of rawData) {
        let questionImage: QuestionImage | undefined = undefined;
        
        if (includeImages && item.pure_graphic_bbox && item.pure_graphic_bbox.length === 4) {
          try {
             questionImage = await cropImageFromPage(
               base64Image, 
               item.pure_graphic_bbox
             );
          } catch (e) {
            console.warn("Failed to crop image for question", item.number, e);
          }
        }

        // Apply text formatting for premises
        const formattedText = formatExtractedText(item.text);

        processedData.push({
          number: item.number,
          text: formattedText,
          options: item.options,
          image: questionImage
        });
      }
      
      return processedData;
    }
    return [];
  } catch (error) {
    console.error("Error extracting questions with Gemini:", error);
    throw error;
  }
};