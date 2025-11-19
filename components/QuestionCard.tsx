import React from 'react';
import { ProcessedQuestion } from '../types';

interface QuestionCardProps {
  question: ProcessedQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-4 transition-all hover:shadow-md">
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 font-bold rounded-full text-sm">
          {question.originalNumber}
        </span>
        <div className="flex-1">
          {/* Added whitespace-pre-wrap to support newlines for premises */}
          <h3 className="text-slate-800 font-medium text-lg leading-relaxed whitespace-pre-wrap">
            {question.text}
          </h3>
          
          {/* Display Extracted Image if exists */}
          {question.image && (
            <div className="mt-3 mb-3">
              <img 
                src={`data:image/jpeg;base64,${question.image.base64}`} 
                alt={`Soru ${question.originalNumber} Görseli`}
                className="max-w-full h-auto rounded-lg border border-slate-100 max-h-64 object-contain"
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-2 pl-11">
        {question.options.map((option) => (
          <div 
            key={option.id} 
            className={`flex items-center p-2 rounded-lg text-sm border ${option.isCorrect ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-transparent'}`}
          >
            <span className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 text-xs font-bold ${option.isCorrect ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {option.label}
            </span>
            <span className={option.isCorrect ? 'text-green-800 font-medium' : 'text-slate-600'}>
              {option.text}
            </span>
             {option.isCorrect && (
                <span className="ml-auto text-xs text-green-600 font-semibold px-2 py-0.5 bg-green-100 rounded-full">
                  Orijinal Doğru Cevap
                </span>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};