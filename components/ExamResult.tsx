
import React from 'react';
import { ProcessedQuestion } from '../types';
import { Check, X, RefreshCw, ArrowLeft } from 'lucide-react';

interface ExamResultProps {
  questions: ProcessedQuestion[];
  userAnswers: Record<string, string>;
  onRetry: () => void;
  onBackToMenu: () => void;
}

export const ExamResult: React.FC<ExamResultProps> = ({ questions, userAnswers, onRetry, onBackToMenu }) => {
  let correctCount = 0;
  let wrongCount = 0;
  let emptyCount = 0;

  questions.forEach(q => {
    const userAnswerId = userAnswers[q.id];
    if (!userAnswerId) {
      emptyCount++;
      return;
    }
    const correctOption = q.options.find(o => o.isCorrect);
    if (correctOption && correctOption.id === userAnswerId) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const total = questions.length;
  const score = Math.round((correctCount / total) * 100);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <button 
                onClick={onBackToMenu}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
                <ArrowLeft className="h-5 w-5" />
                Ana Menüye Dön
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sınav Sonucu</h1>
            <button 
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/70 rounded-lg font-medium transition-colors"
            >
                <RefreshCw className="h-4 w-4" />
                Tekrar Çöz
            </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Score Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 mb-10 text-center transition-colors">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-indigo-100 dark:border-indigo-900/30 mb-4">
                <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{score}</div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Puanınız</h2>
            
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{correctCount}</div>
                    <div className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wider">Doğru</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">{wrongCount}</div>
                    <div className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">Yanlış</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                    <div className="text-2xl font-bold text-slate-600 dark:text-slate-300 mb-1">{emptyCount}</div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Boş</div>
                </div>
            </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 ml-1">Soru Analizi</h3>

        {/* Questions Analysis */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const userAnswerId = userAnswers[q.id];
            const correctOption = q.options.find(o => o.isCorrect);
            const isCorrect = userAnswerId === correctOption?.id;
            const isSkipped = !userAnswerId;

            let statusBorder = 'border-slate-200 dark:border-slate-700';
            let statusBg = 'bg-white dark:bg-slate-800';
            
            if (!isSkipped) {
                statusBorder = isCorrect ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800';
                statusBg = isCorrect ? 'bg-green-50/30 dark:bg-green-900/10' : 'bg-red-50/30 dark:bg-red-900/10';
            }

            return (
              <div key={q.id} className={`p-6 rounded-2xl shadow-sm border ${statusBorder} ${statusBg} transition-colors`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm border
                    ${isSkipped ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600' : 
                      isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}
                  `}>
                    {isCorrect ? <Check className="h-5 w-5" /> : isSkipped ? '-' : <X className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                     <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Soru {idx + 1}</span>
                     <div className="text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">{q.text}</div>
                     {q.image && (
                        <div className="mt-3">
                            <img src={`data:image/jpeg;base64,${q.image.base64}`} className="max-h-64 rounded-lg border border-slate-200 dark:border-slate-600" alt="" />
                        </div>
                     )}
                  </div>
                </div>

                <div className="space-y-2 pl-12">
                    {q.options.map(opt => {
                        const isSelected = userAnswerId === opt.id;
                        const isThisCorrect = opt.isCorrect;
                        
                        let optionStyle = "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"; // Default
                        let icon = null;

                        if (isThisCorrect) {
                            optionStyle = "border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 font-medium ring-1 ring-green-500 dark:ring-green-500";
                            icon = <Check className="h-4 w-4 ml-auto text-green-600 dark:text-green-400" />;
                        } else if (isSelected && !isThisCorrect) {
                            optionStyle = "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 font-medium ring-1 ring-red-500 dark:ring-red-500";
                            icon = <X className="h-4 w-4 ml-auto text-red-600 dark:text-red-400" />;
                        } else if (isSelected && isThisCorrect) {
                             // Handled by first if, but explicitly logically redundant
                        } else {
                            optionStyle = "opacity-60 border-slate-100 dark:border-slate-700";
                        }

                        return (
                            <div key={opt.id} className={`flex items-center p-3 rounded-lg border ${optionStyle}`}>
                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 text-xs font-bold mr-3">
                                    {opt.label}
                                </span>
                                <span>{opt.text}</span>
                                {icon}
                            </div>
                        )
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
