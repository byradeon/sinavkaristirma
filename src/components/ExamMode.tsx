
import React, { useState } from 'react';
import { ProcessedQuestion } from '../types';
import { CheckCircle2, X, ArrowLeft } from 'lucide-react';

interface ExamModeProps {
  questions: ProcessedQuestion[];
  onFinish: (userAnswers: Record<string, string>) => void;
  onCancel: () => void;
}

export const ExamMode: React.FC<ExamModeProps> = ({ questions, onFinish, onCancel }) => {
  // Store answers as { questionId: optionId }
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const answeredCount = Object.keys(userAnswers).length;
  const totalCount = questions.length;
  const progressPercentage = Math.round((answeredCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
               onClick={onCancel}
               className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
               title="Çıkış"
             >
               <ArrowLeft className="h-6 w-6" />
             </button>
             <div>
               <h1 className="text-lg font-bold text-slate-800">Sınav Modu</h1>
               <div className="flex items-center gap-2 text-sm text-slate-500">
                 <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-indigo-600 transition-all duration-500" 
                     style={{ width: `${progressPercentage}%` }}
                   />
                 </div>
                 <span>{answeredCount} / {totalCount} Cevaplandı</span>
               </div>
             </div>
          </div>

          <button
            onClick={() => onFinish(userAnswers)}
            disabled={answeredCount === 0}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-lg shadow-md transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="h-5 w-5" />
            Sınavı Bitir
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 scroll-mt-24" id={`q-${q.id}`}>
            <div className="flex items-start gap-4 mb-6">
              <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-600 font-bold rounded-full text-sm border border-slate-200">
                {idx + 1}
              </span>
              <div className="flex-1">
                <div className="text-lg text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                  {q.text}
                </div>
                {q.image && (
                  <div className="mt-4 mb-2">
                    <img 
                      src={`data:image/jpeg;base64,${q.image.base64}`} 
                      alt="Soru Görseli"
                      className="max-w-full h-auto rounded-lg border border-slate-100 max-h-80 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 pl-12">
              {q.options.map((opt) => {
                const isSelected = userAnswers[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionSelect(q.id, opt.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 group
                      ${isSelected 
                        ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                        : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'
                      }
                    `}
                  >
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border transition-colors
                      ${isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-500 group-hover:border-indigo-300 group-hover:text-indigo-600'
                      }
                    `}>
                      {opt.label}
                    </span>
                    <span className={`text-base ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
