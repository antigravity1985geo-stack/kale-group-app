import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Plus, TestTube, Save, List, Package, Factory, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import RawMaterialsManager from './RawMaterialsManager';

type ModuleTab = 'recipes' | 'raw-materials';

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

  useEffect(() => {
    fetchData();
  }, []);

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
          // Keep legacy column if it exists
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

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="animate-spin text-brand-400" />
    </div>
  );

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif text-slate-800 flex items-center gap-2">
          <Factory size={24} /> წარმოება
        </h2>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {([
            ['recipes', '📋 რეცეპტები'],
            ['raw-materials', '🧱 ნედლეული'],
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

      {tab === 'raw-materials' && <RawMaterialsManager />}

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

              {/* Ingredients */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
                  <TestTube size={16} /> ნედლეული 1 ერთეულზე
                </h3>

                {rawMaterials.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 mb-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <p>ნედლეული ჯერ არ დამატებულა. ჯერ გადადით <strong>"ნედლეული"</strong> ტაბზე და დაამატეთ (შპონი, ლამინატი, შურუპი და ა.შ.).</p>
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
                        <option key={m.id} value={m.id}>{m.name} ({m.unit}) — ნაშთი: {m.quantity}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={ing.quantity_required}
                      onChange={e => handleIngredientChange(idx, 'quantity_required', parseFloat(e.target.value))}
                      className="w-28 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none text-sm"
                      placeholder="ოდ."
                    />
                    <button
                      onClick={() => handleRemoveIngredient(idx)}
                      className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition border-none cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  onClick={handleAddIngredient}
                  className="text-sm text-amber-600 mt-2 flex items-center gap-1 hover:text-amber-500 cursor-pointer bg-transparent border-none"
                >
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
                <button
                  onClick={handleSaveRecipe}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-900 text-gold-400 rounded-xl font-bold text-sm hover:bg-brand-950 transition border-none cursor-pointer"
                >
                  <Save size={16} /> შენახვა
                </button>
                <button
                  onClick={() => { setIsAdding(false); setIngredients([]); }}
                  className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-100 transition cursor-pointer bg-transparent"
                >
                  გაუქმება
                </button>
              </div>
            </div>
          ) : null}

          {/* Recipes Grid */}
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
                      ნედლეული მიბმული არ არის — წარმოება ნაშთს ვერ ჩამოაკლებს
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
                      {isProducing === r.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Package size={14} />
                      )}
                      წარმოება
                    </button>
                    <button
                      onClick={() => handleDeleteRecipe(r.id)}
                      className="px-3 py-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition border-none cursor-pointer text-xs"
                    >
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
