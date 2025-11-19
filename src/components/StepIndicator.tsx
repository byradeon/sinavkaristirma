
import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { id: 1, name: 'PDF Yükle' },
    { id: 2, name: 'Yapay Zeka İşlemi' },
    { id: 3, name: 'Önizleme & Karıştır' },
    { id: 4, name: 'İndir' },
  ];

  return (
    <nav aria-label="Progress" className="w-full max-w-2xl mx-auto mb-8">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className={`h-0.5 w-full ${stepIdx !== steps.length - 1 ? 'bg-gray-200 dark:bg-slate-700' : 'hidden'}`} />
            </div>
            <a href="#" className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-indigo-900 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 transition-colors">
              {step.id < currentStep ? (
                <span className="h-8 w-8 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center border-2 border-indigo-600 dark:border-indigo-500">
                  <Check className="h-5 w-5 text-white" />
                </span>
              ) : step.id === currentStep ? (
                 <span className="h-8 w-8 rounded-full border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-800 flex items-center justify-center relative z-10">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                 </span>
              ) : (
                <span className="h-8 w-8 rounded-full border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center relative z-10">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                </span>
              )}
              <span className="absolute -bottom-8 w-32 text-center text-xs font-medium text-gray-500 dark:text-slate-400 -ml-12">
                {step.name}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};
