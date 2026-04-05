import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ReloadPrompt() {
  const { t } = useTranslation();
  
  // Custom texts for PWA since we might not have it in i18n
  const texts = {
    offlineTitle: 'Offline Ready',
    updateTitle: 'Update Available',
    offlineDesc: 'App works offline now.',
    updateDesc: 'New content is available, click reload to update.',
    reloadBtn: 'RELOAD',
    closeBtn: 'CLOSE'
  };

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-brand-900 border border-gold-400/30 shadow-2xl rounded-2xl p-5 max-w-sm text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-3xl" />
        
        <div className="flex items-start justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            {offlineReady ? <CheckCircle2 className="text-green-400" size={20} /> : <RefreshCw className="text-gold-400" size={20} />}
            <h3 className="font-serif text-lg text-white">
              {offlineReady ? texts.offlineTitle : texts.updateTitle}
            </h3>
          </div>
          <button onClick={close} className="text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <p className="text-sm text-white/70 mb-5 leading-relaxed relative z-10">
          {offlineReady ? texts.offlineDesc : texts.updateDesc}
        </p>

        <div className="flex gap-3 relative z-10">
          {needRefresh && (
            <button 
              onClick={() => updateServiceWorker(true)}
              className="flex-1 bg-gold-400 text-brand-900 font-bold tracking-widest uppercase text-xs py-2.5 rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <RefreshCw size={14} /> {texts.reloadBtn}
            </button>
          )}
          <button 
            onClick={close}
            className="flex-1 bg-white/5 border border-white/10 text-white font-bold tracking-widest uppercase text-xs py-2.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            {texts.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
