import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Plus, TestTube, Save, List, Package, Factory, AlertTriangle, Copy, Truck, X, Edit3, Trash2, Building2, Phone, Mail, Globe, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import RawMaterialsManager from './RawMaterialsManager';

type ModuleTab = 'recipes' | 'raw-materials' | 'suppliers';

interface Supplier {
  id: string;
  name: string;
  tin?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  payment_terms?: number;
  currency?: string;
  is_active?: boolean;
  notes?: string;
}

const EMPTY_SUPPLIER: Omit<Supplier, 'id'> = {
  name: '', tin: '', contact_person: '', email: '',
  phone: '', address: '', country: 'GE',
  payment_terms: 30, currency: 'GEL', is_active: true, notes: ''
};

export default function ManufacturingModule() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ModuleTab>('recipes');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [newRecipe, setNewRecipe] = useState({ title: '', finished_good_id: '', instructions: '' });
  const [ingredients, setIngredients] = useState<
    { raw_material_ref_id: string; quantity_required: number }[]
  >([]);
  const [isProducing, setIsProducing] = useState<string | null>(null);

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppLoading, setSuppLoading] = useState(false);
  const [showSuppForm, setShowSuppForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [suppForm, setSuppForm] = useState<Omit<Supplier, 'id'>>(EMPTY_SUPPLIER);
  const [suppSaving, setSuppSaving] = useState(false);
  const [suppToast, setSuppToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (tab === 'recipes') { fetchData(); }
    if (tab === 'suppliers') { fetchSuppliers(); }
  }, [tab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [recRes, prodRes, matRes] = await Promise.all([
        supabase.from('production_recipes').select(`
          *,
          finished_good:finished_good_id(*),
          ingredients:recipe_ingredients(
            *,
            raw_mat:raw_material_ref_id(*)
          )
        `),
        supabase.from('products').select('id, name, category'),
        supabase.from('raw_materials').select('*').order('name'),
      ]);
      if (recRes.data) setRecipes(recRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (matRes.data) setRawMaterials(matRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    setSuppLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setSuppliers(data || []);
    setSuppLoading(false);
  };

  const showSuppToast = (msg: string, type: 'ok' | 'err') => {
    setSuppToast({ msg, type });
    setTimeout(() => setSuppToast(null), 3500);
  };

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSuppForm(EMPTY_SUPPLIER);
    setShowSuppForm(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSuppForm({
      name: s.name, tin: s.tin || '', contact_person: s.contact_person || '',
      email: s.email || '', phone: s.phone || '', address: s.address || '',
      country: s.country || 'GE', payment_terms: s.payment_terms || 30,
      currency: s.currency || 'GEL', is_active: s.is_active !== false, notes: s.notes || ''
    });
    setShowSuppForm(true);
  };

  const handleSaveSupplier = async () => {
    if (!suppForm.name.trim()) return showSuppToast('სახელი სავალდებულოა', 'err');
    setSuppSaving(true);
    try {
      if (editingSupplier) {
        const { error } = await supabase.from('suppliers').update(suppForm).eq('id', editingSupplier.id);
        if (error) throw error;
        showSuppToast('მომწოდებელი განახლდა ✓', 'ok');
      } else {
        const { error } = await supabase.from('suppliers').insert([suppForm]);
        if (error) throw error;
        showSuppToast('მომწოდებელი დაემატა ✓', 'ok');
      }
      setShowSuppForm(false);
      setEditingSupplier(null);
      setSuppForm(EMPTY_SUPPLIER);
      fetchSuppliers();
    } catch (err: any) {
      showSuppToast('შეცდომა: ' + err.message, 'err');
    } finally {
      setSuppSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ წაშლა?')) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) return showSuppToast('შეცდომა: ' + error.message, 'err');
    showSuppToast('წაიშალა ✓', 'ok');
    fetchSuppliers();
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { raw_material_ref_id: '', quantity_required: 1 }]);
  };

  const handleIngredientChange = (idx: number, field: string, val: any) => {
    const updated = [...ingredients];
    updated[idx] = { ...updated[idx], [field]: val };
    setIngredients(updated);
  };

  const handleRemoveIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleSaveRecipe = async () => {
    if (!newRecipe.title.trim() || !newRecipe.finished_good_id) {
      return alert('გთხოვთ შეავსოთ სარეცეპტო სახელი და მზა პროდუქტი.');
    }
    const selectedMatIds = ingredients.map(i => i.raw_material_ref_id).filter(id => id);
    if (new Set(selectedMatIds).size !== selectedMatIds.length) {
      return alert('შეცდომა: ერთი და იგივე ნედლეული რამდენჯერმე გაქვთ არჩეული. გთხოვთ გააერთიანოთ რაოდენობები.');
    }
    try {
      const { data: recData, error: recErr } = await supabase
        .from('production_recipes')
        .insert([{
          finished_good_id: newRecipe.finished_good_id,
          title: newRecipe.title,
          instructions: newRecipe.instructions,
          created_by: user?.id,
        }])
        .select('*')
        .single();
      if (recErr) throw recErr;
      const validIngs = ingredients
        .filter(i => i.raw_material_ref_id && i.quantity_required > 0)
        .map(i => ({
          recipe_id: recData.id,
          raw_material_ref_id: i.raw_material_ref_id,
          quantity_required: i.quantity_required,
          raw_material_id: i.raw_material_ref_id,
        }));
      if (validIngs.length > 0) {
        const { error: ingErr } = await supabase.from('recipe_ingredients').insert(validIngs);
        if (ingErr) throw ingErr;
      }
      setIsAdding(false);
      setNewRecipe({ title: '', finished_good_id: '', instructions: '' });
      setIngredients([]);
      fetchData();
    } catch (err: any) {
      alert('შეცდომა რეცეპტის შენახვისას: ' + err.message);
    }
  };

  const handleStartProduction = async (recipe: any) => {
    const qtyStr = prompt(
      `რამდენი ცალი "${recipe.finished_good?.name}"-ის წარმოება?\n\n⚠️ შესაბამისი ნედლეული ჩამოიწერება მარაგებიდან.`
    );
    if (!qtyStr) return;
    const quantity = parseInt(qtyStr, 10);
    if (isNaN(quantity) || quantity <= 0) return alert('არასწორი რაოდენობა');
    setIsProducing(recipe.id);
    try {
      const { data, error } = await supabase.rpc('process_manufacturing', {
        p_recipe_id: recipe.id,
        p_quantity: quantity,
        p_user_id: user?.id,
        p_notes: `ადმინ — ${quantity} ც. ${recipe.finished_good?.name}`,
      });
      if (error) throw error;
      if (data?.success === false) {
        alert('❌ ' + (data.error || 'წარმოება ვერ სრულდება'));
      } else {
        alert(`✅ წარმოება დასრულდა!\n${quantity} ც. "${recipe.finished_good?.name}" – მზა პროდუქტი მარაგებშია, ნედლეული ჩამოიწერა.`);
        fetchData();
      }
    } catch (err: any) {
      alert('შეცდომა: ' + err.message);
    } finally {
      setIsProducing(null);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ რეცეპტის წაშლა?')) return;
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
    await supabase.from('production_recipes').delete().eq('id', id);
    fetchData();
  };

  const handleDuplicateRecipe = (recipe: any) => {
    setNewRecipe({
      title: recipe.title + ' (ასლი)',
      finished_good_id: recipe.finished_good_id || '',
      instructions: recipe.instructions || ''
    });
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      setIngredients(recipe.ingredients.map((i: any) => ({
        raw_material_ref_id: i.raw_material_ref_id || i.raw_material_id || '',
        quantity_required: i.quantity_required || 1
      })));
    } else {
      setIngredients([]);
    }
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading && tab !== 'suppliers') return (
    <div className="flex justify-center p-12">
      <Loader2 className="animate-spin text-brand-400" />
    </div>
  );

  return (
    <div>
      {/* Toast */}
      {suppToast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl transition-all ${suppToast.type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {suppToast.msg}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif text-slate-800 flex items-center gap-2">
          <Factory size={24} /> წარმოება
        </h2>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {([
            ['recipes', '📋 რეცეპტები'],
            ['raw-materials', '🧱 ნედლეული'],
            ['suppliers', '🚚 მომწოდებლები'],
          ] as [ModuleTab, string][]).map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border-none cursor-pointer ${tab === t ? 'bg-white text-brand-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Raw Materials ── */}
      {tab === 'raw-materials' && <RawMaterialsManager />}

      {/* ── Suppliers Tab ── */}
      {tab === 'suppliers' && (
        <div>
          <div className="flex justify-between items-center mb-5">
            <p className="text-sm text-slate-500">{suppliers.length} მომწოდებელი სისტემაში</p>
            <button
              onClick={openAddSupplier}
              className="px-4 py-2.5 bg-brand-900 text-gold-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-brand-950 transition border-none cursor-pointer"
            >
              <Plus size={16} /> ახალი მომწოდებელი
            </button>
          </div>

          {/* Supplier Form Modal */}
          {showSuppForm && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">
                    {editingSupplier ? '✏️ მომწოდებლის რედაქტირება' : '➕ ახალი მომწოდებელი'}
                  </h3>
                  <button onClick={() => setShowSuppForm(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 border-none cursor-pointer bg-transparent">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">სახელი / კომპანია *</label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={suppForm.name} onChange={e => setSuppForm({ ...suppForm, name: e.target.value })}
                          placeholder="შპს მომწოდებელი / ფიზ. პირი"
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">საიდ. კოდი (TIN)</label>
                      <input type="text" value={suppForm.tin} onChange={e => setSuppForm({ ...suppForm, tin: e.target.value })}
                        placeholder="12345678"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">საკონტაქტო პირი</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={suppForm.contact_person} onChange={e => setSuppForm({ ...suppForm, contact_person: e.target.value })}
                          placeholder="გიორგი ბერიძე"
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">ტელეფონი</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="tel" value={suppForm.phone} onChange={e => setSuppForm({ ...suppForm, phone: e.target.value })}
                          placeholder="+995 5XX XXX XXX"
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">ელ. ფოსტა</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" value={suppForm.email} onChange={e => setSuppForm({ ...suppForm, email: e.target.value })}
                          placeholder="info@supplier.ge"
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">მისამართი</label>
                      <input type="text" value={suppForm.address} onChange={e => setSuppForm({ ...suppForm, address: e.target.value })}
                        placeholder="ქ. თბილისი, ..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">ქვეყანა</label>
                      <div className="relative">
                        <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select value={suppForm.country} onChange={e => setSuppForm({ ...suppForm, country: e.target.value })}
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm appearance-none">
                          <option value="GE">🇬🇪 საქართველო</option>
                          <option value="TR">🇹🇷 თურქეთი</option>
                          <option value="CN">🇨🇳 ჩინეთი</option>
                          <option value="DE">🇩🇪 გერმანია</option>
                          <option value="IT">🇮🇹 იტალია</option>
                          <option value="PL">🇵🇱 პოლონეთი</option>
                          <option value="UA">🇺🇦 უკრაინა</option>
                          <option value="RU">🇷🇺 რუსეთი</option>
                          <option value="OTHER">სხვა</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">გადახდის ვადა (დღე)</label>
                      <input type="number" min={0} value={suppForm.payment_terms} onChange={e => setSuppForm({ ...suppForm, payment_terms: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">ვალუტა</label>
                      <select value={suppForm.currency} onChange={e => setSuppForm({ ...suppForm, currency: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm">
                        <option value="GEL">₾ GEL</option>
                        <option value="USD">$ USD</option>
                        <option value="EUR">€ EUR</option>
                        <option value="TRY">₺ TRY</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">სტატუსი</label>
                      <select value={suppForm.is_active ? 'true' : 'false'} onChange={e => setSuppForm({ ...suppForm, is_active: e.target.value === 'true' })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm">
                        <option value="true">✅ აქტიური</option>
                        <option value="false">⛔ არააქტიური</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">შენიშვნა</label>
                      <textarea value={suppForm.notes} onChange={e => setSuppForm({ ...suppForm, notes: e.target.value })}
                        rows={2} placeholder="დამატებითი ინფო..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-gold-400 text-sm resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSaveSupplier} disabled={suppSaving}
                      className="flex items-center gap-2 px-6 py-3 bg-brand-900 text-gold-400 rounded-xl font-bold text-sm hover:bg-brand-950 transition border-none cursor-pointer disabled:opacity-60">
                      {suppSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {editingSupplier ? 'განახლება' : 'შენახვა'}
                    </button>
                    <button onClick={() => setShowSuppForm(false)}
                      className="px-5 py-3 border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-100 transition cursor-pointer bg-transparent">
                      გაუქმება
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suppliers List */}
          {suppLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-400" /></div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Truck size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 font-semibold mb-1">მომწოდებლები არ არის დამატებული</p>
              <p className="text-slate-400 text-sm mb-4">დაამატეთ პირველი მომწოდებელი, რათა შესყიდვის ფორმა ამუშავდეს</p>
              <button onClick={openAddSupplier}
                className="px-5 py-2.5 bg-brand-900 text-gold-400 rounded-xl text-sm font-bold hover:bg-brand-950 transition border-none cursor-pointer">
                + დამატება
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map(s => (
                <div key={s.id} className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${s.is_active === false ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{s.name}</h3>
                      {s.tin && <p className="text-xs text-slate-400 mt-0.5">სას. კოდი: {s.tin}</p>}
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${s.is_active !== false ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                      {s.is_active !== false ? 'აქტ.' : 'არააქტ.'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                    {s.contact_person && <p className="flex items-center gap-2"><User size={13} className="text-slate-400" />{s.contact_person}</p>}
                    {s.phone && <p className="flex items-center gap-2"><Phone size={13} className="text-slate-400" />{s.phone}</p>}
                    {s.email && <p className="flex items-center gap-2"><Mail size={13} className="text-slate-400" />{s.email}</p>}
                    {s.country && <p className="flex items-center gap-2"><Globe size={13} className="text-slate-400" />{s.country} · {s.currency} · {s.payment_terms} დღე</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditSupplier(s)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 transition border-none cursor-pointer">
                      <Edit3 size={13} /> რედაქტ.
                    </button>
                    <button onClick={() => handleDeleteSupplier(s.id)}
                      className="px-3 py-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition border-none cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Recipes Tab ── */}
      {tab === 'recipes' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-4 py-2.5 bg-brand-900 text-gold-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-brand-950 transition border-none cursor-pointer"
            >
              {isAdding ? <List size={16} /> : <Plus size={16} />}
              {isAdding ? 'რეცეპტების სია' : 'ახალი რეცეპტი'}
            </button>
          </div>

          {isAdding ? (
            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs uppercase text-slate-500 mb-2">რეცეპტის სახელი *</label>
                  <input
                    type="text"
                    value={newRecipe.title}
                    onChange={e => setNewRecipe({ ...newRecipe, title: e.target.value })}
                    placeholder="მაგ: კარის სტანდ. კომპლექტი"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-amber-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-slate-500 mb-2">მზა პროდუქტი *</label>
                  <select
                    value={newRecipe.finished_good_id}
                    onChange={e => setNewRecipe({ ...newRecipe, finished_good_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-amber-500 outline-none text-sm"
                  >
                    <option value="">-- პროდუქტი --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.category} — {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
                  <TestTube size={16} /> ნედლეული 1 ერთეულზე
                </h3>
                {rawMaterials.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 mb-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <p>ნედლეული ჯერ არ დამატებულა. ჯერ გადადით <strong>"ნედლეული"</strong> ტაბზე.</p>
                  </div>
                )}
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <select
                      value={ing.raw_material_ref_id}
                      onChange={e => handleIngredientChange(idx, 'raw_material_ref_id', e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none text-sm"
                    >
                      <option value="">-- ნედლეული --</option>
                      {rawMaterials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.package_unit ? `[${m.unit}]` : `(${m.unit})`} — ნაშთი: {m.quantity} {m.unit}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number" step="0.01" min="0.01"
                      value={ing.quantity_required}
                      onChange={e => handleIngredientChange(idx, 'quantity_required', parseFloat(e.target.value))}
                      className="w-28 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none text-sm"
                      placeholder="რაოდ."
                    />
                    <div className="w-8 text-xs text-slate-500 flex items-center">
                      {rawMaterials.find(rm => rm.id === ing.raw_material_ref_id)?.unit || ''}
                    </div>
                    <button onClick={() => handleRemoveIngredient(idx)}
                      className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition border-none cursor-pointer">
                      ✕
                    </button>
                  </div>
                ))}
                <button onClick={handleAddIngredient}
                  className="text-sm text-amber-600 mt-2 flex items-center gap-1 hover:text-amber-500 cursor-pointer bg-transparent border-none">
                  <Plus size={14} /> ნედლეულის დამატება
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-xs uppercase text-slate-500 mb-2">ინსტრუქცია (სურვ.)</label>
                <textarea
                  value={newRecipe.instructions}
                  onChange={e => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-amber-500 outline-none h-20 text-sm resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={handleSaveRecipe}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-900 text-gold-400 rounded-xl font-bold text-sm hover:bg-brand-950 transition border-none cursor-pointer">
                  <Save size={16} /> შენახვა
                </button>
                <button onClick={() => { setIsAdding(false); setIngredients([]); }}
                  className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-100 transition cursor-pointer bg-transparent">
                  გაუქმება
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400">
                <Factory size={40} className="mx-auto mb-3 opacity-30" />
                <p>რეცეპტები არ დამატებულა</p>
              </div>
            )}
            {recipes.map(r => {
              const hasRawMats = r.ingredients?.some((i: any) => i.raw_mat);
              return (
                <div key={r.id} className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
                  <h3 className="text-base font-bold text-slate-800 mb-1">{r.title}</h3>
                  <p className="text-xs text-amber-600 mb-3">🟡 {r.finished_good?.name}</p>
                  {!hasRawMats && (
                    <div className="flex items-center gap-2 text-xs text-orange-500 bg-orange-50 border border-orange-200 rounded-lg p-2 mb-3">
                      <AlertTriangle size={12} />
                      ნედლეული მიბმული არ არის
                    </div>
                  )}
                  <div className="space-y-1.5 mb-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">ინგრედიენტები (1 ც-ზე):</p>
                    {r.ingredients?.length === 0 && <p className="text-xs text-slate-400 italic">— ჩამატებული არ არის</p>}
                    {r.ingredients?.map((i: any) => (
                      <div key={i.id} className="flex justify-between text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <span>{i.raw_mat?.name || '?'}</span>
                        <span className="font-mono text-slate-400">× {i.quantity_required} {i.raw_mat?.unit || ''}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartProduction(r)}
                      disabled={isProducing === r.id || !hasRawMats}
                      className="flex-1 py-2.5 bg-brand-900 text-gold-400 rounded-xl text-xs uppercase tracking-widest font-bold flex justify-center items-center gap-2 hover:bg-brand-950 transition border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProducing === r.id ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                      წარმოება
                    </button>
                    <button onClick={() => handleDuplicateRecipe(r)} title="დუბლირება"
                      className="px-3 py-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition border-none cursor-pointer flex items-center justify-center">
                      <Copy size={16} />
                    </button>
                    <button onClick={() => handleDeleteRecipe(r.id)}
                      className="px-3 py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition border-none cursor-pointer text-xs flex items-center justify-center"
                      title="წაშლა">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
