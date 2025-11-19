
export interface RawOption {
  text: string;
}

export interface QuestionImage {
  base64: string;
  width: number;
  height: number;
}

export interface RawQuestion {
  number: string | number;
  text: string;
  options: string[]; // The raw array from AI, where index 0 is 'A' (Correct)
  image?: QuestionImage; // Optional extracted image
}

export interface ProcessedOption {
  id: string;
  label: string; // A, B, C, D, E
  text: string;
  isCorrect: boolean;
}

export interface ProcessedQuestion {
  id: string;
  originalNumber: string | number;
  text: string;
  options: ProcessedOption[];
  image?: QuestionImage;
}

export interface ExtractionStatus {
  page: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  FILE_SELECTED = 'FILE_SELECTED',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW',
  GENERATING_DOC = 'GENERATING_DOC',
  TAKE_EXAM = 'TAKE_EXAM', // New state for taking the exam
  EXAM_RESULTS = 'EXAM_RESULTS', // New state for viewing results
}
