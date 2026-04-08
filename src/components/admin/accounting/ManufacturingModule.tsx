import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Plus, TestTube, Save, List, Package } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function ManufacturingModule() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newRecipe, setNewRecipe] = useState({ title: '', finished_good_id: '', instructions: '' });
  const [ingredients, setIngredients] = useState<{raw_material_id: string, quantity_required: number}[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [recRes, prodRes] = await Promise.all([
        supabase.from('production_recipes').select('*, finished_good:finished_good_id(*), ingredients:recipe_ingredients(*, material:raw_material_id(*))'),
        supabase.from('products').select('*')
      ]);
      if (recRes.data) setRecipes(recRes.data);
      if (prodRes.data) setProducts(prodRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { raw_material_id: '', quantity_required: 1 }]);
  };

  const handleIngredientChange = (idx: number, field: string, val: any) => {
    const updated = [...ingredients];
    updated[idx] = { ...updated[idx], [field]: val };
    setIngredients(updated);
  };

  const handleSaveRecipe = async () => {
    try {
      const { data: recData, error: recErr } = await supabase.from('production_recipes')
        .insert([{
           finished_good_id: newRecipe.finished_good_id,
           title: newRecipe.title,
           instructions: newRecipe.instructions,
           created_by: user?.id
        }])
        .select('*')
        .single();
      
      if (recErr) throw recErr;

      const ings = ingredients.filter(i => i.raw_material_id && i.quantity_required > 0).map(i => ({
        recipe_id: recData.id,
        raw_material_id: i.raw_material_id,
        quantity_required: i.quantity_required
      }));

      if (ings.length > 0) {
        const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ings);
        if (ingErr) throw ingErr;
      }
      
      setIsAdding(false);
      setNewRecipe({ title: '', finished_good_id: '', instructions: '' });
      setIngredients([]);
      fetchData();
    } catch(err: any) {
      alert('შეცდომა რეცეპტის შენახვისას: ' + err.message);
    }
  };

  const handleStartProduction = async (recipe: any) => {
    const qtyStr = prompt(`რამდენი ერთეული "${recipe.finished_good?.name}"-ის წარმოება გსურთ?`);
    if (!qtyStr) return;
    
    const quantity = parseInt(qtyStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
       alert("არასწორი რაოდენობა");
       return;
    }

    if (!confirm(`ნამდვილად გსურთ ${quantity} ცალი "${recipe.finished_good?.name}"-ს წარმოება? შესაბამისი ნედლეული ჩამოიწერება საწყობიდან.`)) return;

    try {
        const { error } = await supabase.rpc('process_manufacturing', {
           p_recipe_id: recipe.id,
           p_quantity: quantity,
           p_user_id: user?.id,
           p_notes: `წარმოება მოითხოვა ადმინისტრატორმა`
        });

        if (error) throw error;

        alert('წარმოება წარმატებით დასრულდა! მზა პროდუქტი აისახა მარაგებში, ხოლო ნედლეული ჩამოიწერა.');
    } catch (err: any) {
        alert('შეცდომა წარმოების პროცესში: (დარწმუნდით რომ მასალების ნაშთი საკმარისია საწყობში) \n' + err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-400" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif text-white">წარმოება და რეცეპტები</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 bg-amber-600 rounded-xl text-xs font-bold uppercase transition flex items-center gap-2 hover:bg-amber-500 text-white cursor-pointer border-none outline-none">
          {isAdding ? <List size={16} /> : <Plus size={16} />}
          {isAdding ? 'რეცეპტების სია' : 'ახალი რეცეპტი'}
        </button>
      </div>

      {isAdding ? (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs uppercase text-stone-400 mb-2">რეცეპტის სახელი (მაგ: სტანდარტული კარების აწყობა)</label>
              <input type="text" value={newRecipe.title} onChange={e => setNewRecipe({...newRecipe, title: e.target.value})} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs uppercase text-stone-400 mb-2">რომელი მზა პროდუქტი იქმნება?</label>
              <select value={newRecipe.finished_good_id} onChange={e => setNewRecipe({...newRecipe, finished_good_id: e.target.value})} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:border-amber-500 outline-none">
                <option value="">-- აირჩიეთ მზა პროდუქტი --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.category} - {p.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-amber-500 mb-2 flex items-center gap-2"><TestTube size={16}/> რა მასალები იხარჯება 1 ერთეულზე?</h3>
            <p className="text-xs text-stone-400 mb-4">დაამატეთ ინგრედიენტები/ნედლეული, რომელიც ესაჭიროება ამ პროდუქტის 1 ცალის დამზადებას.</p>
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select value={ing.raw_material_id} onChange={e => handleIngredientChange(idx, 'raw_material_id', e.target.value)} className="flex-1 bg-stone-950 border border-stone-800 rounded-xl p-2 text-white outline-none">
                  <option value="">-- აირჩიეთ მისაღები ნედლეული --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.category} - {p.name}</option>)}
                </select>
                <input type="number" step="0.01" value={ing.quantity_required} onChange={e => handleIngredientChange(idx, 'quantity_required', parseFloat(e.target.value))} className="w-32 bg-stone-950 border border-stone-800 rounded-xl p-2 text-white outline-none" placeholder="რაოდენობა" />
              </div>
            ))}
            <button onClick={handleAddIngredient} className="text-xs text-amber-500 mt-2 flex items-center hover:text-amber-400 cursor-pointer bg-transparent border-none outline-none">+ მასალის დამატება</button>
          </div>

          <div className="mb-6">
             <label className="block text-xs uppercase text-stone-400 mb-2">ინსტრუქცია</label>
             <textarea value={newRecipe.instructions} onChange={e => setNewRecipe({...newRecipe, instructions: e.target.value})} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:border-amber-500 outline-none h-24" />
          </div>

          <button onClick={handleSaveRecipe} className="px-6 py-3 bg-brand-600 rounded-xl text-white font-bold tracking-widest text-xs uppercase flex items-center gap-2 hover:bg-brand-500 cursor-pointer border-none outline-none">
            <Save size={16}/> რეცეპტის შენახვა
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(r => (
            <div key={r.id} className="bg-stone-900 border border-stone-800 rounded-xl p-6">
               <h3 className="text-lg font-bold text-white mb-1">{r.title}</h3>
               <p className="text-xs text-amber-500 mb-4">მზა პროდუქტი: {r.finished_good?.name}</p>
               
               <div className="space-y-2 mb-6">
                 <p className="text-[10px] text-stone-400 uppercase tracking-widest">დასახარჯი მასალები (1 ცალზე):</p>
                 {r.ingredients?.map((i: any) => (
                   <div key={i.id} className="flex justify-between text-sm text-stone-300 bg-stone-950 p-2 rounded-lg">
                      <span>{i.material?.name}</span>
                      <span className="font-mono text-stone-500">x{i.quantity_required}</span>
                   </div>
                 ))}
               </div>

               <button onClick={() => handleStartProduction(r)} className="w-full py-3 bg-stone-800 text-stone-300 rounded-lg text-xs uppercase tracking-widest font-bold flex justify-center items-center gap-2 hover:bg-emerald-600 hover:text-white transition cursor-pointer border-none outline-none">
                  <Package size={16} /> წარმოების დაწყება
               </button>
            </div>
          ))}
          {recipes.length === 0 && <div className="col-span-full py-12 text-center text-stone-500">რეცეპტები არ მოიძებნა. დაამატეთ "ახალი რეცეპტი".</div>}
        </div>
      )}
    </div>
  );
}
