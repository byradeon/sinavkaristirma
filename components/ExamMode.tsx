
import React, { useState } from 'react';
import { ProcessedQuestion } from '../types';
import { CheckCircle2, X, ArrowLeft, Lightbulb } from 'lucide-react';

interface ExamModeProps {
  questions: ProcessedQuestion[];
  onFinish: (userAnswers: Record<string, string>) => void;
  onCancel: () => void;
}

export const ExamMode: React.FC<ExamModeProps> = ({ questions, onFinish, onCancel }) => {
  // Store answers as { questionId: optionId }
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  // Store visible hints as { questionId: boolean }
  const [visibleHints, setVisibleHints] = useState<Record<string, boolean>>({});

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const toggleHint = (questionId: string) => {
    setVisibleHints(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const answeredCount = Object.keys(userAnswers).length;
  const totalCount = questions.length;
  const progressPercentage = Math.round((answeredCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 transition-colors duration-300">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
               onClick={onCancel}
               className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
               title="Çıkış"
             >
               <ArrowLeft className="h-6 w-6" />
             </button>
             <div>
               <h1 className="text-lg font-bold text-slate-800 dark:text-white">Sınav Modu</h1>
               <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                 <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500" 
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
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-500 text-white font-bold rounded-lg shadow-md transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="h-5 w-5" />
            Sınavı Bitir
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {questions.map((q, idx) => {
          const correctOption = q.options.find(o => o.isCorrect);
          const isHintVisible = visibleHints[q.id];

          return (
            <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 scroll-mt-24 transition-colors relative" id={`q-${q.id}`}>
              <div className="flex items-start gap-4 mb-6">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-full text-sm border border-slate-200 dark:border-slate-600">
                  {idx + 1}
                </span>
                <div className="flex-1 pr-8">
                  <div className="text-lg text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                    {q.text}
                  </div>
                  {q.image && (
                    <div className="mt-4 mb-2">
                      <img 
                        src={`data:image/jpeg;base64,${q.image.base64}`} 
                        alt="Soru Görseli"
                        className="max-w-full h-auto rounded-lg border border-slate-100 dark:border-slate-700 max-h-80 object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Hint Button */}
                <div className="absolute top-6 right-6 flex flex-col items-end">
                  <button
                    onClick={() => toggleHint(q.id)}
                    className={`p-2 rounded-full transition-all duration-200 ${
                      isHintVisible 
                        ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/50 dark:text-amber-400 ring-2 ring-amber-200 dark:ring-amber-800' 
                        : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500 dark:bg-slate-700/50 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-amber-400'
                    }`}
                    title="Cevabı Göster"
                  >
                    <Lightbulb className={`h-5 w-5 ${isHintVisible ? 'fill-current' : ''}`} />
                  </button>
                  
                  {/* Hint Popover */}
                  {isHintVisible && correctOption && (
                    <div className="mt-2 bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-lg text-sm font-bold shadow-lg animate-in fade-in slide-in-from-top-2 z-10 whitespace-nowrap">
                      Doğru Cevap: {correctOption.label}
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
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500 shadow-sm' 
                          : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }
                      `}
                    >
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border transition-colors
                        ${isSelected
                          ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 group-hover:border-indigo-300 dark:group-hover:border-indigo-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                        }
                      `}>
                        {opt.label}
                      </span>
                      <span className={`text-base ${isSelected ? 'text-indigo-900 dark:text-indigo-200 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
