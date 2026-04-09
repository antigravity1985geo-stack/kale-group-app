import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Loader2, Plus, Trash2, Save, Package, AlertTriangle } from 'lucide-react';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorder_point: number;
  unit_cost: number;
  notes?: string;
}

const UNITS = ['ცალი', 'მ²', 'კგ', 'მ', 'ლ', 'შ.', 'ტ.'];

export default function RawMaterialsManager() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'ცალი', quantity: 0, reorder_point: 5, unit_cost: 0, notes: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  useEffect(() => { fetchMaterials(); }, []);

  const fetchMaterials = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('raw_materials').select('*').order('name');
    setMaterials(data || []);
    setIsLoading(false);
  };

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('სახელი სავალდებულოა', 'err');
    try {
      if (editingId) {
        const { error } = await supabase.from('raw_materials').update(form).eq('id', editingId);
        if (error) throw error;
        showToast('ნედლეული განახლდა ✓', 'ok');
        setEditingId(null);
      } else {
        const { error } = await supabase.from('raw_materials').insert({ ...form, created_at: new Date().toISOString() });
        if (error) throw error;
        showToast('ნედლეული დაემატა ✓', 'ok');
        setIsAdding(false);
      }
      setForm({ name: '', unit: 'ცალი', quantity: 0, reorder_point: 5, unit_cost: 0, notes: '' });
      fetchMaterials();
    } catch (err: any) {
      showToast('შეცდომა: ' + err.message, 'err');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ წაშლა?')) return;
    const { error } = await supabase.from('raw_materials').delete().eq('id', id);
    if (error) return showToast('შეცდომა: ' + error.message, 'err');
    showToast('წაიშალა ✓', 'ok');
    fetchMaterials();
  };

  const handleEdit = (mat: RawMaterial) => {
    setEditingId(mat.id);
    setForm({ name: mat.name, unit: mat.unit, quantity: mat.quantity, reorder_point: mat.reorder_point, unit_cost: mat.unit_cost, notes: mat.notes || '' });
    setIsAdding(true);
  };

  const FormBlock = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Package size={18} /> {editingId ? 'ნედლეულის რედაქტირება' : 'ახალი ნედლეული'}
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">სახელი *</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="მაგ: შპონი, ლამინატი, შურუპი M4..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:border-amber-500 outline-none" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">ზომის ერთეული</label>
          <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm outline-none">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">საწყისი რაოდ.</label>
          <input type="number" min="0" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">შეკვეთის ზღვარი</label>
          <input type="number" min="0" step="0.01" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">ერთ. ღირ. (₾)</label>
          <input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">შენიშვნა</label>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm outline-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-brand-900 text-gold-400 rounded-xl text-sm font-bold transition hover:bg-brand-950 border-none cursor-pointer">
          <Save size={16} /> შენახვა
        </button>
        <button onClick={() => { setIsAdding(false); setEditingId(null); setForm({ name: '', unit: 'ცალი', quantity: 0, reorder_point: 5, unit_cost: 0, notes: '' }); }} className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-50 transition border cursor-pointer bg-transparent">
          გაუქმება
        </button>
      </div>
    </div>
  );

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-400" /></div>;

  return (
    <div>
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2"><Package size={20} /> ნედლეულის მარაგი</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2.5 bg-brand-900 text-gold-400 rounded-xl text-sm font-bold hover:bg-brand-950 transition border-none cursor-pointer">
            <Plus size={16} /> ნედლეულის დამატება
          </button>
        )}
      </div>

      {isAdding && <FormBlock />}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">სახეობები</p>
          <p className="text-2xl font-bold text-slate-800">{materials.length}</p>
        </div>
        <div className={`rounded-xl p-4 border shadow-sm ${materials.filter(m => m.quantity <= m.reorder_point).length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            {materials.filter(m => m.quantity <= m.reorder_point).length > 0 && <AlertTriangle size={12} className="text-red-500" />}
            Low Stock
          </p>
          <p className={`text-2xl font-bold ${materials.filter(m => m.quantity <= m.reorder_point).length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {materials.filter(m => m.quantity <= m.reorder_point).length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">სულ ღირ.</p>
          <p className="text-2xl font-bold text-teal-600">
            ₾{materials.reduce((s, m) => s + m.quantity * m.unit_cost, 0).toLocaleString('ka-GE', { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest">
              <th className="text-left py-3 px-5">დასახელება</th>
              <th className="text-right py-3 px-5">ნაშთი</th>
              <th className="text-right py-3 px-5">ზღვარი</th>
              <th className="text-right py-3 px-5">ერთ. ფასი</th>
              <th className="text-right py-3 px-5">სულ ღირ.</th>
              <th className="text-center py-3 px-5">სტატ.</th>
              <th className="py-3 px-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materials.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-slate-400">ნედლეული არ დამატებულა. დაწყება ზემოთ ღილაკით.</td></tr>
            ) : materials.map(mat => {
              const isLow = mat.quantity <= mat.reorder_point;
              return (
                <tr key={mat.id} className={`hover:bg-slate-50 transition-colors ${isLow ? 'bg-red-50/50' : ''}`}>
                  <td className="py-3 px-5">
                    <p className="font-semibold text-slate-800">{mat.name}</p>
                    {mat.notes && <p className="text-xs text-slate-400">{mat.notes}</p>}
                  </td>
                  <td className={`py-3 px-5 text-right font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                    {mat.quantity} <span className="text-xs font-normal text-slate-400">{mat.unit}</span>
                  </td>
                  <td className="py-3 px-5 text-right text-slate-500">{mat.reorder_point} {mat.unit}</td>
                  <td className="py-3 px-5 text-right text-slate-600">₾{mat.unit_cost.toLocaleString('ka-GE', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-5 text-right font-semibold text-teal-600">₾{(mat.quantity * mat.unit_cost).toLocaleString('ka-GE', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-5 text-center">
                    {isLow
                      ? <span className="flex items-center justify-center gap-1 text-xs text-red-500"><AlertTriangle size={12} /> low</span>
                      : <span className="text-xs text-emerald-500">✓ OK</span>
                    }
                  </td>
                  <td className="py-3 px-5 text-right space-x-2">
                    <button onClick={() => handleEdit(mat)} className="inline-flex p-2 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-500 hover:text-white transition cursor-pointer border-none">
                      <Save size={14} />
                    </button>
                    <button onClick={() => handleDelete(mat.id)} className="inline-flex p-2 text-red-400 bg-red-50 rounded-lg hover:bg-red-500 hover:text-white transition cursor-pointer border-none">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
