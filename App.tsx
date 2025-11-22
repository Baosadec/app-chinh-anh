import React, { useState, useRef } from 'react';
import { UploadedFile, AppStatus, GeneratedImage } from './types';
import { generateStylizedImage, removeBackground } from './services/geminiService';
import Spinner from './components/Spinner';
import Button from './components/Button';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [uploadedImage, setUploadedImage] = useState<UploadedFile | null>(null);
  
  // Inputs
  const [prompt, setPrompt] = useState<string>("Vintage, sepia-toned, aged look.");
  const [influence, setInfluence] = useState<number>(50);
  const [characterDescription, setCharacterDescription] = useState<string>("");
  const [sceneAction, setSceneAction] = useState<string>("");
  const [quality, setQuality] = useState<'standard' | 'high'>('standard');
  
  // Outputs
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        setErrorMessage("Please upload a valid image file (JPG or PNG).");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("File size should be less than 5MB.");
        return;
      }

      setStatus(AppStatus.UPLOADING);
      setErrorMessage(null);

      try {
        const base64 = await fileToBase64(file);
        setUploadedImage({
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          mimeType: file.type,
        });
        setStatus(AppStatus.IDLE);
      } catch (err) {
        setErrorMessage("Failed to process image. Please try again.");
        setStatus(AppStatus.ERROR);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleBackgroundRemoval = async () => {
    if (!uploadedImage) return;
    
    setStatus(AppStatus.REMOVING_BACKGROUND);
    setErrorMessage(null);

    try {
      const bgResult = await removeBackground(uploadedImage.base64, uploadedImage.mimeType);
      
      if (bgResult.imageUrl) {
        const parts = bgResult.imageUrl.split(',');
        const meta = parts[0];
        const base64Data = parts[1];
        const mime = meta.split(':')[1].split(';')[0];

        setUploadedImage({
          previewUrl: bgResult.imageUrl,
          base64: base64Data,
          mimeType: mime,
        });
        setStatus(AppStatus.IDLE);
      }
    } catch (error: any) {
      setStatus(AppStatus.ERROR);
      setErrorMessage(error.message || "Failed to remove background.");
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage) {
        setErrorMessage("Please upload an image first.");
        return;
    }

    setStatus(AppStatus.GENERATING);
    setErrorMessage(null);

    try {
      const genResult = await generateStylizedImage(
        uploadedImage.base64,
        uploadedImage.mimeType,
        prompt,
        influence,
        characterDescription,
        sceneAction,
        quality
      );

      if (genResult.imageUrl) {
        const newImage: GeneratedImage = {
            id: Date.now().toString(),
            imageUrl: genResult.imageUrl,
            timestamp: Date.now(),
            promptUsed: prompt
        };
        // Keep only last 4 images
        setGeneratedImages(prev => [newImage, ...prev].slice(0, 4));
        setStatus(AppStatus.SUCCESS);
      }
    } catch (error: any) {
      setStatus(AppStatus.ERROR);
      setErrorMessage(error.message || "An error occurred during generation.");
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const isProcessing = status === AppStatus.GENERATING || status === AppStatus.REMOVING_BACKGROUND || status === AppStatus.UPLOADING;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
            Gemini Style Remix
          </h1>
          <p className="text-slate-600 mt-2">Reimagine photos with vintage aesthetics using Gemini.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: All Inputs (Span 4) */}
          <div className="lg:col-span-4 space-y-6">

            {/* 1. Upload Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">Source Image</h2>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/png, image/jpeg, image/jpg"
              />

              {!uploadedImage ? (
                <div 
                  onClick={!isProcessing ? triggerFileInput : undefined}
                  className={`border-2 border-dashed border-slate-300 rounded-xl h-48 flex flex-col items-center justify-center transition-all ${!isProcessing ? 'cursor-pointer hover:border-indigo-500 hover:bg-indigo-50' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-slate-600">Upload Image</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={uploadedImage.previewUrl} alt="Source" className="w-full h-full object-contain" />
                    <button 
                      onClick={triggerFileInput}
                      disabled={isProcessing}
                      className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow hover:text-indigo-600 disabled:opacity-0"
                      title="Change Image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                      </svg>
                    </button>
                  </div>
                  <Button 
                    onClick={handleBackgroundRemoval}
                    variant="secondary"
                    isLoading={status === AppStatus.REMOVING_BACKGROUND}
                    disabled={isProcessing}
                    className="text-xs py-2"
                  >
                    Remove Background
                  </Button>
                </div>
              )}
            </div>

            {/* 2. Configuration Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-5">
               <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Configuration</h2>

               {/* Influence */}
               <div>
                 <div className="flex justify-between items-center mb-2">
                   <label className="text-sm font-medium text-slate-700">Reference Influence</label>
                   <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{influence}%</span>
                 </div>
                 <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={influence}
                    onChange={(e) => setInfluence(parseInt(e.target.value))}
                    disabled={isProcessing}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                 />
                 <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                   <span>Creative</span>
                   <span>Precise</span>
                 </div>
               </div>

               {/* Character Description */}
               <div>
                 <label className="text-sm font-medium text-slate-700 mb-1.5 block">Character Description</label>
                 <input
                   type="text"
                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                   placeholder="e.g. Young woman with glasses..."
                   value={characterDescription}
                   onChange={(e) => setCharacterDescription(e.target.value)}
                   disabled={isProcessing}
                 />
               </div>

               {/* Scene & Action */}
               <div>
                 <label className="text-sm font-medium text-slate-700 mb-1.5 block">Scene & Action</label>
                 <textarea
                   rows={2}
                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                   placeholder="e.g. Reading a book in a cozy cafe..."
                   value={sceneAction}
                   onChange={(e) => setSceneAction(e.target.value)}
                   disabled={isProcessing}
                 />
               </div>

               {/* Style/Prompt */}
               <div>
                 <label className="text-sm font-medium text-slate-700 mb-1.5 block">Style & Atmosphere</label>
                 <textarea
                   rows={2}
                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                   placeholder="Describe the art style..."
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                   disabled={isProcessing}
                 />
                 <div className="mt-2 flex flex-wrap gap-2">
                   <button onClick={() => setPrompt("Vintage, sepia-toned, aged look.")} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100 hover:bg-amber-100">Vintage</button>
                   <button onClick={() => setPrompt("Cyberpunk, neon lights, high contrast.")} className="text-[10px] bg-fuchsia-50 text-fuchsia-700 px-2 py-1 rounded border border-fuchsia-100 hover:bg-fuchsia-100">Cyberpunk</button>
                   <button onClick={() => setPrompt("Soft watercolor, dreamy, pastel.")} className="text-[10px] bg-sky-50 text-sky-700 px-2 py-1 rounded border border-sky-100 hover:bg-sky-100">Watercolor</button>
                 </div>
               </div>

               {/* Output Quality */}
               <div>
                 <label className="text-sm font-medium text-slate-700 mb-1.5 block">Output Quality</label>
                 <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as 'standard' | 'high')}
                    disabled={isProcessing}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 >
                   <option value="standard">Standard (720p) - Fast</option>
                   <option value="high">High (2K-4K) - Requires Paid/Pro Key</option>
                 </select>
               </div>
               
               {/* Error Message */}
               {errorMessage && (
                 <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <div className="text-xs text-red-600">
                        <p className="font-bold">Error</p>
                        <p>{errorMessage}</p>
                        </div>
                    </div>
                 </div>
               )}

               {/* Generate Button */}
               <Button 
                 onClick={handleGenerate} 
                 isLoading={status === AppStatus.GENERATING}
                 disabled={!uploadedImage || isProcessing}
                 className="w-full py-4 text-lg shadow-lg shadow-indigo-200"
               >
                 Generate Artwork
               </Button>

            </div>
          </div>

          {/* RIGHT COLUMN: Results Grid (Span 8) */}
          <div className="lg:col-span-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[600px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">Gallery Results</h2>
                <span className="text-sm text-slate-400">{generatedImages.length > 0 ? `${generatedImages.length} images` : 'No images yet'}</span>
              </div>
              
              {status === AppStatus.GENERATING ? (
                <div className="h-96 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                   <Spinner />
                   <p className="text-slate-400 mt-4 text-sm">Creating your masterpiece...</p>
                </div>
              ) : generatedImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedImages.map((img, index) => (
                    <div key={img.id} className={`relative group rounded-2xl overflow-hidden shadow-md border border-slate-100 bg-slate-50 transition-all duration-500 ${index === 0 ? 'md:col-span-2 md:aspect-video aspect-square' : 'aspect-square'}`}>
                      <img 
                        src={img.imageUrl} 
                        alt={`Generated ${index}`} 
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                        <p className="text-white/90 text-sm line-clamp-2 mb-4 font-light">{img.promptUsed}</p>
                        <a 
                          href={img.imageUrl} 
                          download={`gemini-remix-${img.id}.png`}
                          className="bg-white text-slate-900 py-2 px-4 rounded-lg font-medium text-sm self-start hover:bg-indigo-50 transition-colors flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download High-Res
                        </a>
                      </div>
                      {/* New Badge for latest */}
                      {index === 0 && (
                        <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                          NEW
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-200 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                  <h3 className="text-slate-400 font-medium text-lg">Your Gallery is Empty</h3>
                  <p className="text-slate-400 text-sm mt-1 max-w-xs">Upload an image and configure the settings on the left to start generating artwork.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;