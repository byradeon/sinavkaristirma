
import React from 'react';
import { ProcessedQuestion } from '../types';

interface QuestionCardProps {
  question: ProcessedQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 transition-all hover:shadow-md dark:hover:shadow-slate-900/50">
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold rounded-full text-sm">
          {question.originalNumber}
        </span>
        <div className="flex-1">
          {/* Added whitespace-pre-wrap to support newlines for premises */}
          <h3 className="text-slate-800 dark:text-slate-200 font-medium text-lg leading-relaxed whitespace-pre-wrap">
            {question.text}
          </h3>
          
          {/* Display Extracted Image if exists */}
          {question.image && (
            <div className="mt-3 mb-3">
              <img 
                src={`data:image/jpeg;base64,${question.image.base64}`} 
                alt={`Soru ${question.originalNumber} Görseli`}
                className="max-w-full h-auto rounded-lg border border-slate-100 dark:border-slate-700 max-h-64 object-contain"
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-2 pl-11">
        {question.options.map((option) => (
          <div 
            key={option.id} 
            className={`flex items-center p-2 rounded-lg text-sm border ${
              option.isCorrect 
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                : 'bg-slate-50 border-transparent dark:bg-slate-700/50 dark:border-transparent'
            }`}
          >
            <span className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 text-xs font-bold ${
              option.isCorrect 
                ? 'bg-green-600 text-white' 
                : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
            }`}>
              {option.label}
            </span>
            <span className={option.isCorrect ? 'text-green-800 dark:text-green-400 font-medium' : 'text-slate-600 dark:text-slate-300'}>
              {option.text}
            </span>
             {option.isCorrect && (
                <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-semibold px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                  Orijinal Doğru Cevap
                </span>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};
