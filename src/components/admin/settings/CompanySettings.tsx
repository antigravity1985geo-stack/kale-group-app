import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Settings, Save, Loader2, ToggleLeft, ToggleRight, AlertTriangle, Percent, Info } from 'lucide-react';

interface Setting {
  key: string;
  value: any;
  description: string;
}

export default function CompanySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('company_settings').select('*');
    if (data) {
      const map: Record<string, Setting> = {};
      data.forEach(s => { map[s.key] = s; });
      setSettings(map);
    }
    setIsLoading(false);
  };

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateSetting = async (key: string, value: any) => {
    setIsSaving(key);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({ value, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
      setSettings(prev => ({ ...prev, [key]: { ...prev[key], value } }));
      showToast('პარამეტრი შენახულია ✓', 'ok');
    } catch (err: any) {
      showToast('შეცდომა: ' + err.message, 'err');
    } finally {
      setIsSaving(null);
    }
  };

  const vatRegistered = settings['vat_registered']?.value === true || settings['vat_registered']?.value === 'true';
  const installmentRate = Number(settings['installment_surcharge_rate']?.value) || 5;

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-400" /></div>;

  return (
    <div className="max-w-2xl">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-900 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-gold-400" />
        </div>
        <div>
          <h2 className="text-2xl font-serif text-slate-800">კომპანიის პარამეტრები</h2>
          <p className="text-sm text-slate-500">გლობალური კონფიგურაცია—ყველა მოდულზე მოქმედებს</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* VAT Toggle */}
        <div className={`bg-white border rounded-2xl p-6 shadow-sm transition-all ${vatRegistered ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800">დღგ-ს გადამხდელი</h3>
                {vatRegistered && (
                  <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                    ჩართულია
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{settings['vat_registered']?.description || 'კომპანია დღგ-ს გადამხდელია თუ არა'}</p>

              {vatRegistered && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-amber-100 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <p>დღგ ჩართულია. ყველა ახალი ინვოისი და ჟურნალის გატარება <strong>18% დღგ-ს</strong> გამოყოფს ავტომატურად.</p>
                </div>
              )}
              {!vatRegistered && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <p>დღგ გამორთულია. გახდებით გადამხდელი? ჩართეთ ღილაკი — ყველა შემდგომი ტრანზაქცია 18% დღგ-ს გამოყოფს.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => updateSetting('vat_registered', !vatRegistered)}
              disabled={isSaving === 'vat_registered'}
              className="flex-shrink-0 transition-all border-none bg-transparent cursor-pointer disabled:opacity-50"
            >
              {isSaving === 'vat_registered' ? (
                <Loader2 className="animate-spin text-slate-400" size={40} />
              ) : vatRegistered ? (
                <ToggleRight size={52} className="text-amber-500 hover:text-amber-600 transition-colors" />
              ) : (
                <ToggleLeft size={52} className="text-slate-300 hover:text-slate-400 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Installment surcharge */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Percent size={18} className="text-blue-500" />
            <h3 className="font-semibold text-slate-800">განვადების საკომისიო</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {settings['installment_surcharge_rate']?.description || 'განვადებით ყიდვისას ემატება ამ % კლიენტის ჯამს'}
          </p>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                defaultValue={installmentRate}
                onBlur={e => updateSetting('installment_surcharge_rate', e.target.value)}
                className="w-24 px-4 py-3 text-slate-800 text-lg font-bold bg-transparent outline-none text-center"
              />
              <span className="px-3 py-3 bg-slate-100 text-slate-600 font-bold text-lg border-l border-slate-200">%</span>
            </div>
            <div className="text-sm text-slate-500">
              მაგ: ₾1,000-ის განვადებაზე კლიენტი გადაიხდის{' '}
              <strong className="text-slate-800">₾{(1000 * (1 + installmentRate / 100)).toLocaleString('ka-GE')}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
