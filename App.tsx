import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Shuffle, Download, Loader2, AlertCircle, Image as ImageIcon, ArrowRight, File, CheckCircle2, ChevronDown } from 'lucide-react';
import { convertPdfToImages, getPdfPageCount, getSinglePdfPage } from './services/pdfService';
import { extractQuestionsFromImage } from './services/geminiService';
import { generateExamDocument } from './services/wordService';
import { StepIndicator } from './components/StepIndicator';
import { QuestionCard } from './components/QuestionCard';
import { AppState, RawQuestion, ProcessedQuestion, ProcessedOption } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [processedQuestions, setProcessedQuestions] = useState<ProcessedQuestion[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [includeImages, setIncludeImages] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState<{ start: number; end: number; total: number }>({ start: 1, end: 1, total: 0 });
  const [previews, setPreviews] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [loadingPreview, setLoadingPreview] = useState<{ start: boolean; end: boolean }>({ start: false, end: false });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Convert Raw to Processed with Shuffling
  const processRawQuestions = (rawQuestions: RawQuestion[]): ProcessedQuestion[] => {
    return rawQuestions.map((raw, qIndex) => {
      const originalOptions = raw.options.map((optText, index) => ({
        id: `q${qIndex}-opt${index}`,
        text: optText,
        isCorrect: index === 0, // The promise: Index 0 is originally 'A' (Correct)
        label: '', // Will be assigned after shuffle
      }));

      const shuffledOptions = shuffleArray(originalOptions).map((opt, idx) => ({
        ...opt,
        label: String.fromCharCode(65 + idx), // Assign A, B, C... based on new position
      }));

      return {
        id: `q-${qIndex}`,
        originalNumber: raw.number,
        text: raw.text,
        options: shuffledOptions,
        image: raw.image, // Carry over the cropped image
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Lütfen geçerli bir PDF dosyası yükleyin.');
      return;
    }

    setError(null);
    
    try {
      // Get page count first
      const count = await getPdfPageCount(file);
      setSelectedFile(file);
      setPageRange({ start: 1, end: count, total: count });
      
      // Load initial previews (First and Last page)
      setLoadingPreview({ start: true, end: true });
      
      // Use Promise.all to fetch efficiently
      const [startImg, endImg] = await Promise.all([
        getSinglePdfPage(file, 1),
        getSinglePdfPage(file, count)
      ]);

      setPreviews({ start: startImg, end: endImg });
      setLoadingPreview({ start: false, end: false });

      setAppState(AppState.FILE_SELECTED);
    } catch (e) {
      console.error(e);
      setError("PDF dosyası okunamadı. Lütfen başka bir dosya deneyin.");
      setLoadingPreview({ start: false, end: false });
    }
  };

  const handlePageChange = async (type: 'start' | 'end', value: number) => {
    setPageRange(prev => ({ ...prev, [type]: value }));
    
    if (selectedFile) {
      setLoadingPreview(prev => ({ ...prev, [type]: true }));
      try {
        const img = await getSinglePdfPage(selectedFile, value);
        setPreviews(prev => ({ ...prev, [type]: img }));
      } catch (e) {
        console.error("Preview load failed", e);
      } finally {
        setLoadingPreview(prev => ({ ...prev, [type]: false }));
      }
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) return;

    // Validation
    if (pageRange.start < 1 || pageRange.end > pageRange.total || pageRange.start > pageRange.end) {
      setError("Geçersiz sayfa aralığı seçildi.");
      return;
    }

    setAppState(AppState.PROCESSING);
    setProcessedQuestions([]);
    setError(null);

    try {
      // 1. PDF to Images (Selected Range)
      setProgress({ current: 0, total: 100 }); 
      
      const images = await convertPdfToImages(selectedFile, pageRange.start, pageRange.end);
      
      setProgress({ current: 0, total: images.length });

      const allRawQuestions: RawQuestion[] = [];

      // 2. Process each page with Gemini
      for (let i = 0; i < images.length; i++) {
        try {
          const pageQuestions = await extractQuestionsFromImage(images[i], includeImages);
          allRawQuestions.push(...pageQuestions);
        } catch (e) {
          console.error(`Sayfa ${i + 1} işlenirken hata oluştu`, e);
        }
        setProgress({ current: i + 1, total: images.length });
      }

      if (allRawQuestions.length === 0) {
        throw new Error("Soru bulunamadı. PDF bulanık olabilir veya format tanınmıyor.");
      }

      // 3. Shuffle and Format
      const processed = processRawQuestions(allRawQuestions);
      setProcessedQuestions(processed);
      setAppState(AppState.REVIEW);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'İşlem sırasında beklenmeyen bir hata oluştu.');
      setAppState(AppState.IDLE);
    }
  };

  const handleDocxDownload = async () => {
    if (processedQuestions.length === 0) return;

    setAppState(AppState.GENERATING_DOC);
    try {
      const blob = await generateExamDocument(processedQuestions);
      downloadBlob(blob, 'docx');
      
      // Reset to review state
      setAppState(AppState.REVIEW);
    } catch (e) {
      setError('Word belgesi oluşturulamadı.');
      setAppState(AppState.REVIEW);
    }
  };

  const downloadBlob = (blob: Blob, extension: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sinav_Karisik_${new Date().toISOString().slice(0,10)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleReshuffle = () => {
      const reshuffled = processedQuestions.map(q => {
           // Get pure options without labels
           const currentOptions = q.options.map(o => ({...o, label: ''}));
           const newShuffled = shuffleArray(currentOptions).map((opt, idx) => ({
               ...(opt as ProcessedOption),
               label: String.fromCharCode(65 + idx)
           }));
           return { ...q, options: newShuffled };
      });
      setProcessedQuestions(reshuffled);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shuffle className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sınav Şık Karıştırma Aracı</h1>
          </div>
          <div className="text-sm text-slate-500">
            Gemini 2.5 Flash ile güçlendirilmiştir
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        
        <div className="mb-10">
            <StepIndicator currentStep={
                appState === AppState.IDLE ? 1 :
                appState === AppState.FILE_SELECTED ? 1 :
                appState === AppState.PROCESSING ? 2 :
                appState === AppState.GENERATING_DOC ? 4 : 3
            } />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* IDLE STATE - Upload */}
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl shadow-sm border border-dashed border-slate-300">
            <div className="bg-indigo-50 p-4 rounded-full mb-4">
              <Upload className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Sınav PDF'ini Yükle</h2>
            <p className="text-slate-500 text-center max-w-md mb-8">
              Soruların bulunduğu PDF dosyasını yükleyin. Sistem, kaynak dosyadaki ilk şıkkın (A) her zaman doğru cevap olduğunu varsayar.
            </p>
            
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <FileText className="h-5 w-5" />
              PDF Dosyası Seç
            </button>
          </div>
        )}

        {/* FILE SELECTED STATE - Configure */}
        {appState === AppState.FILE_SELECTED && selectedFile && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-indigo-50 px-8 py-6 border-b border-indigo-100 flex items-center gap-4">
              <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                <File className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-indigo-900">{selectedFile.name}</h2>
                <p className="text-indigo-600 text-sm">{pageRange.total} Sayfa Algılandı</p>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Page Range Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  İşlenecek Sayfa Aralığını Seçin
                </label>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Start Page Column */}
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase z-10 pointer-events-none">Başlangıç</span>
                      <select 
                        value={pageRange.start}
                        onChange={(e) => handlePageChange('start', parseInt(e.target.value))}
                        className="w-full pl-24 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white appearance-none cursor-pointer text-slate-700 font-medium transition-shadow"
                      >
                        {Array.from({ length: pageRange.total }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>Sayfa {num}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                    
                    {/* Start Preview Image */}
                    <div className="w-full h-48 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative flex items-center justify-center">
                      {loadingPreview.start ? (
                        <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                      ) : previews.start ? (
                        <img 
                          src={`data:image/jpeg;base64,${previews.start}`} 
                          alt="Başlangıç Sayfası Önizleme" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">Önizleme yok</span>
                      )}
                      <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded">Sayfa {pageRange.start}</div>
                    </div>
                  </div>

                  {/* End Page Column */}
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase z-10 pointer-events-none">Bitiş</span>
                      <select 
                        value={pageRange.end}
                        onChange={(e) => handlePageChange('end', parseInt(e.target.value))}
                        className="w-full pl-16 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white appearance-none cursor-pointer text-slate-700 font-medium transition-shadow"
                      >
                         {Array.from({ length: pageRange.total }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>Sayfa {num}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>

                     {/* End Preview Image */}
                     <div className="w-full h-48 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative flex items-center justify-center">
                      {loadingPreview.end ? (
                        <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                      ) : previews.end ? (
                        <img 
                          src={`data:image/jpeg;base64,${previews.end}`} 
                          alt="Bitiş Sayfası Önizleme" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">Önizleme yok</span>
                      )}
                      <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded">Sayfa {pageRange.end}</div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2 text-center">
                  {pageRange.end >= pageRange.start ? `Toplam ${pageRange.end - pageRange.start + 1} sayfa işlenecek.` : 'Geçersiz aralık: Başlangıç sayfası bitiş sayfasından büyük olamaz.'}
                </p>
              </div>

              {/* Include Images Toggle */}
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${includeImages ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                       <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">Görselleri Dahil Et</span>
                      <span className="text-xs text-slate-500">Diyagramları, tabloları ve şekilleri ayıkla</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIncludeImages(!includeImages)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${includeImages ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    role="switch"
                    aria-checked={includeImages}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${includeImages ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
                
                {/* Disclaimer Note */}
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Görsel ayıklama işlemi şu an beta aşamasındadır. Görseller hatalı olarak ayıklanabilir. Kendiniz kontrol etmeye özen gösterin ve her görsele güvenmeyin.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setAppState(AppState.IDLE);
                    setSelectedFile(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleStartProcessing}
                  className="flex-[2] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  İşlemi Başlat
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROCESSING STATE */}
        {appState === AppState.PROCESSING && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
                <div className="h-24 w-24 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-indigo-700 font-bold">{Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%</span>
                </div>
            </div>
            <h3 className="text-xl font-medium text-slate-900 mt-6">Sınav Sayfaları Analiz Ediliyor...</h3>
            <p className="text-slate-500 mt-2 text-center">
               Sayfa {progress.current} / {progress.total} <br/>
               {includeImages ? 'Yapay zeka ile sorular ayıklanıyor ve diyagramlar kırpılıyor.' : 'Sadece metinler ayıklanıyor.'}
            </p>
          </div>
        )}

        {/* REVIEW & DOWNLOAD STATE */}
        {(appState === AppState.REVIEW || appState === AppState.GENERATING_DOC) && (
          <div className="space-y-6">
            
            <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-20 z-20">
              <div>
                <h2 className="text-2xl font-bold">Dışa Aktarmaya Hazır!</h2>
                <p className="text-indigo-200 text-sm mt-1">
                  {processedQuestions.length} soru ayıklandı ve karıştırıldı.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                    onClick={handleReshuffle}
                    className="px-4 py-2 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors border border-indigo-700"
                >
                    Tekrar Karıştır
                </button>
                
                {/* DOCX Download */}
                <button
                  onClick={handleDocxDownload}
                  disabled={appState === AppState.GENERATING_DOC}
                  className="px-6 py-2 bg-white text-indigo-900 hover:bg-indigo-50 rounded-lg font-bold transition-colors shadow-lg flex items-center gap-2 disabled:opacity-70"
                >
                  {appState === AppState.GENERATING_DOC ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Word İndir
                </button>
              </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700 ml-1">Önizleme</h3>
                {processedQuestions.map((q) => (
                    <QuestionCard key={q.id} question={q} />
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;