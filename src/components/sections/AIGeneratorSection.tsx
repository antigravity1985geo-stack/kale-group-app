import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Upload, X, RefreshCw, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AIGeneratorSection() {
  const { t } = useTranslation();
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [uploadedRoomImage, setUploadedRoomImage] = useState<{data: string, mimeType: string, url: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const mimeType = base64String.split(';')[0].split(':')[1];
      const data = base64String.split(',')[1];
      setUploadedRoomImage({ data, mimeType, url: base64String });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setGenError('');
    
    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiPrompt, uploadedRoomImage })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('ai.errorGen'));
      }

      setGeneratedImage(data.generatedImage);
    } catch (err: any) {
      console.error(err);
      setGenError(err.message || t('ai.errorGeneral'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-furniture-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="ai-generator" className="py-28 relative overflow-hidden" style={{background:'linear-gradient(135deg, #1a1714 0%, #2e2a25 50%, #1a1714 100%)'}}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-[80px] pointer-events-none" style={{background:'radial-gradient(ellipse, #c9a227 0%, transparent 70%)'}} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-6 animate-pulse-gold" style={{background:'rgba(201,162,39,0.15)', border:'1px solid rgba(201,162,39,0.4)'}}>
            <Sparkles className="w-7 h-7" style={{color:'#ddb84a'}} />
          </div>
          <p className="text-xs tracking-[0.3em] uppercase font-medium mb-3" style={{color:'#c9a227'}}>{t('ai.badge')}</p>
          <h2 className="text-3xl md:text-5xl font-serif text-white mb-5 leading-tight">{t('ai.title')} <span className="italic font-light text-shimmer">{t('ai.titleHighlight')}</span></h2>
          <p className="text-white/60 max-w-xl mx-auto leading-relaxed">{t('ai.description')}</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-stretch gap-12">
          <div className="lg:w-1/2 space-y-8">
            <div className="bg-white/5 p-8 rounded-2xl border border-white/10">
              <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-4">{t('ai.step1')}</label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="cursor-pointer px-8 py-5 bg-white/5 border border-dashed border-white/20 text-white rounded-xl hover:bg-white/10 transition-all flex flex-col items-center gap-2 group">
                  <Upload className="w-6 h-6 text-gold-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">{t('ai.upload')}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
                {uploadedRoomImage && (
                  <div className="w-32 h-32 relative rounded-xl overflow-hidden border-2 border-gold-400/50">
                    <img src={uploadedRoomImage.url} alt="Room" className="w-full h-full object-cover" />
                    <button onClick={() => setUploadedRoomImage(null)} className="absolute top-2 right-2 bg-red-500 p-1 rounded-full"><X size={12} className="text-white" /></button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 p-8 rounded-2xl border border-white/10">
              <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-4">{t('ai.step2')}</label>
              <textarea rows={4} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} className="w-full bg-white/5 text-white p-5 rounded-xl border border-white/10 focus:border-gold-400/50 outline-none transition-all placeholder:text-white/10" placeholder={t('ai.promptPlaceholder')} />
            </div>

            <button onClick={handleGenerateImage} disabled={isGenerating || !aiPrompt} className="w-full py-6 bg-gold-400 text-brand-950 font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-gold-300 transition-all shadow-[0_10px_30px_rgba(201,162,39,0.3)] flex items-center justify-center gap-3 disabled:opacity-50">
              {isGenerating ? <><RefreshCw className="animate-spin" /> {t('ai.btnGenerate')}</> : <><Sparkles size={18} /> {t('ai.btnCreate')}</>}
            </button>
            {genError && <p className="text-red-400 text-xs text-center">{genError}</p>}
          </div>

          <div className="lg:w-1/2 rounded-2xl overflow-hidden bg-brand-950 border border-white/10 glow-gold flex items-center justify-center relative min-h-[500px]">
            {generatedImage ? (
              <><img src={generatedImage} alt="AI" className="w-full h-full object-cover animate-fade-in" />
              <div className="absolute top-6 right-6 flex gap-3">
                <button onClick={handleDownloadImage} className="bg-brand-950/80 backdrop-blur-md p-3 rounded-full text-white hover:text-gold-400"><Download size={20}/></button>
                <button onClick={handleGenerateImage} className="bg-brand-950/80 backdrop-blur-md p-3 rounded-full text-white hover:text-gold-400"><RefreshCw size={20}/></button>
              </div></>
            ) : (
              <div className="text-center opacity-20">
                <Sparkles size={80} className="mx-auto mb-4" />
                <p className="text-xl font-serif">{t('ai.resultPlaceholder')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
