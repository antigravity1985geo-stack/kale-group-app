import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Loader2, Plus, Trash2, Save, Package, AlertTriangle, Truck, ShoppingCart, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorder_point: number;
  unit_cost: number;
  notes?: string;
  package_unit?: string;
  units_per_package?: number;
}

const UNITS = ['ცალი', 'მ²', 'კგ', 'მ', 'ლ', 'შ.', 'ტ.'];

export default function RawMaterialsManager() {
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: '', unit: 'ცალი', quantity: 0, reorder_point: 5, unit_cost: 0, notes: '',
    package_unit: 'ფილა', units_per_package: 0, has_package: false 
  });
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Purchase registration state
  const [showPurchase, setShowPurchase] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '', raw_material_id: '', quantity: 0, unit_cost: 0,
    payment_method: 'bank_transfer' as string, notes: '',
    use_packages: false, package_count: 0
  });
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => { fetchMaterials(); fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name').eq('is_active', true).order('name');
    setSuppliers(data || []);
  };

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
    if (form.has_package && (!form.package_unit || form.units_per_package <= 0)) return showToast('მიუთითეთ შეფუთვის დეტალები სწორად', 'err');

    try {
      const payload = {
        name: form.name, unit: form.unit, quantity: form.quantity, reorder_point: form.reorder_point, unit_cost: form.unit_cost, notes: form.notes,
        package_unit: form.has_package ? form.package_unit : null,
        units_per_package: form.has_package ? form.units_per_package : null
      };

      if (editingId) {
        const { error } = await supabase.from('raw_materials').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('ნედლეული განახლდა ✓', 'ok');
        setEditingId(null);
      } else {
        const { error } = await supabase.from('raw_materials').insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        showToast('ნედლეული დაემატა ✓', 'ok');
        setIsAdding(false);
      }
      setForm({ name: '', unit: 'ცალი', quantity: 0, reorder_point: 5, unit_cost: 0, notes: '', package_unit: 'ფილა', units_per_package: 0, has_package: false });
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
    setForm({ 
      name: mat.name, unit: mat.unit, quantity: mat.quantity, reorder_point: mat.reorder_point, unit_cost: mat.unit_cost, notes: mat.notes || '',
      package_unit: mat.package_unit || 'ფილა', units_per_package: mat.units_per_package || 0,
      has_package: !!mat.package_unit
    });
    setIsAdding(true);
  };

  const handlePurchase = async () => {
    if (!purchaseForm.supplier_id) return showToast('აირჩიეთ მომწოდებელი', 'err');
    if (!purchaseForm.raw_material_id) return showToast('აირჩიეთ ნედლეული', 'err');
    if (purchaseForm.quantity <= 0) return showToast('მიუთითეთ რაოდენობა', 'err');
    if (purchaseForm.unit_cost <= 0) return showToast('მიუთითეთ ფასი', 'err');

    setPurchaseLoading(true);
    try {
      const mat = materials.find(m => m.id === purchaseForm.raw_material_id);
      const { data, error } = await supabase.rpc('process_goods_receipt', {
        p_supplier_id: purchaseForm.supplier_id,
        p_items: [{
          raw_material_id: purchaseForm.raw_material_id,
          product_name: mat?.name || '',
          quantity: purchaseForm.quantity,
          unit_cost: purchaseForm.unit_cost
        }],
        p_payment_method: purchaseForm.payment_method,
        p_notes: purchaseForm.notes
      });
      if (error) throw error;
      showToast(`შესყიდვა დარეგისტრირდა ✓ (${data.grn_number}) — ბუღალტერიაში გატარდა`, 'ok');
      setPurchaseForm({ supplier_id: '', raw_material_id: '', quantity: 0, unit_cost: 0, payment_method: 'bank_transfer', notes: '', use_packages: false, package_count: 0 });
      setShowPurchase(false);
      fetchMaterials();
    } catch (err: any) {
      showToast('შეცდომა: ' + err.message, 'err');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const downloadTemplate = () => {
    const wsData = [
      { დასახელება: 'MDF 16მმ თეთრი', ერთეული: 'მ²', რაოდენობა: 0, მინ_ზღვარი: 5, ერთ_ფასი: 25.5, მეტრიკა_შეფუთვაში: 'ფილა', შეფუთვაში: 5.79, შენიშვნა: '' }
    ];
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ნედლეული");
    XLSX.writeFile(wb, "nedleuli_shabloni.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) return showToast('ფაილი ცარიელია', 'err');
        
        const materialsToInsert = data.map((row: any) => ({
          name: row['დასახელება'],
          unit: row['ერთეული'] || 'ცალი',
          quantity: Number(row['რაოდენობა'] || 0),
          reorder_point: Number(row['მინ_ზღვარი'] || 5),
          unit_cost: Number(row['ერთ_ფასი'] || 0),
          package_unit: row['მეტრიკა_შეფუთვაში'] || null,
          units_per_package: Number(row['შეფუთვაში'] || 0),
          notes: row['შენიშვნა'] || ''
        })).filter(m => m.name);

        if (materialsToInsert.length === 0) return showToast('ვერ მოიძებნა ვალიდური მონაცემები', 'err');

        const { error } = await supabase.from('raw_materials').insert(materialsToInsert);
        if (error) throw error;
        
        showToast(`აიტვირთა ${materialsToInsert.length} ნედლეული ✓`, 'ok');
        fetchMaterials();
      } catch (err: any) {
        showToast('შეცდომა ატვირთვისას: ' + err.message, 'err');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const renderFormBlock = () => (
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
        
        <div className="col-span-2 bg-slate-100/50 p-4 rounded-xl border border-slate-200 mt-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 cursor-pointer">
            <input type="checkbox" checked={form.has_package} onChange={e => setForm({...form, has_package: e.target.checked})} className="w-4 h-4 text-brand-600 rounded" />
            აქვს შეფუთვის ერთეული? (ორმაგი აღრიცხვა, მაგ: ფილა → მ²)
          </label>
          
          {form.has_package && (
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">შეფუთვის დასახელება</label>
                <input value={form.package_unit} onChange={e => setForm({...form, package_unit: e.target.value})} placeholder="მაგ: ფილა, რულონი..." className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-sm focus:border-amber-500 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">1 {form.package_unit || 'შეკვრა'} = ? {form.unit}</label>
                <input type="number" min="0.01" step="0.01" value={form.units_per_package} onChange={e => setForm({...form, units_per_package: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-amber-600 mb-1 block font-bold">შემოტანა შეფუთვით</label>
                <input 
                  type="number" 
                  placeholder={`რამდენი ${form.package_unit || 'შეკვრა'}-ა?`}
                  onChange={e => {
                    const packages = parseFloat(e.target.value) || 0;
                    setForm({...form, quantity: packages * form.units_per_package});
                  }} 
                  className="w-full bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-900 text-sm outline-none focus:border-amber-500" 
                />
                <p className="text-[10px] text-amber-600 mt-1 leading-tight">ავტომატურად გადათვლის<br/>"საწყის რაოდენობას"</p>
              </div>
              <div>
                <label className="text-xs text-amber-600 mb-1 block font-bold">1 {form.package_unit || 'შეკვრის'} ფასი (₾)</label>
                <input 
                  type="number" 
                  placeholder="მაგ: 220 ₾"
                  onChange={e => {
                    const packPrice = parseFloat(e.target.value) || 0;
                    if (form.units_per_package > 0) {
                      setForm(prev => ({ ...prev, unit_cost: Number((packPrice / prev.units_per_package).toFixed(3)) }));
                    }
                  }} 
                  className="w-full bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-900 text-sm outline-none focus:border-amber-500" 
                />
                <p className="text-[10px] text-amber-600 mt-1 leading-tight">ავტომატურად გადათვლის<br/>"ერთ. ღირ (₾)"</p>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-2">
          <label className="text-xs text-slate-500 mb-1 block">შენიშვნა</label>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm outline-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-brand-900 text-gold-400 rounded-xl text-sm font-bold transition hover:bg-brand-950 border-none cursor-pointer">
          <Save size={16} /> შენახვა
        </button>
        <button onClick={() => { setIsAdding(false); setEditingId(null); setForm({ name: '', unit: 'ცალი', quantity: 0, reorder_point: 5, unit_cost: 0, notes: '', package_unit: 'ფილა', units_per_package: 0, has_package: false }); }} className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-50 transition border cursor-pointer bg-transparent">
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
        <div className="flex gap-2">
          {!isAdding && !showPurchase && (
            <>
              <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition border-none cursor-pointer">
                <Download size={16} /> შაბლონი
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition border-none cursor-pointer">
                <Upload size={16} /> ექსელით ატვირთვა
              </button>
              <input type="file" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => setShowPurchase(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition border-none cursor-pointer">
                <ShoppingCart size={16} /> შესყიდვის რეგისტრაცია
              </button>
              <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2.5 bg-brand-900 text-gold-400 rounded-xl text-sm font-bold hover:bg-brand-950 transition border-none cursor-pointer">
                <Plus size={16} /> ნედლეულის დამატება
              </button>
            </>
          )}
        </div>
      </div>

      {/* Purchase Registration Form */}
      {showPurchase && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="font-semibold text-emerald-800 mb-4 flex items-center gap-2">
            <Truck size={18} /> შესყიდვის რეგისტრაცია (ბუღალტერიაში გატარებით)
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-emerald-700 mb-1 block font-semibold">მომწოდებელი *</label>
              <select value={purchaseForm.supplier_id} onChange={e => setPurchaseForm({...purchaseForm, supplier_id: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-slate-800 text-sm outline-none focus:border-emerald-500">
                <option value="">-- აირჩიეთ მომწოდებელი --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-emerald-700 mb-1 block font-semibold">ნედლეული *</label>
              <select value={purchaseForm.raw_material_id} onChange={e => {
                const mat = materials.find(m => m.id === e.target.value);
                setPurchaseForm({...purchaseForm, raw_material_id: e.target.value, use_packages: !!(mat?.package_unit)});
              }} className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-slate-800 text-sm outline-none focus:border-emerald-500">
                <option value="">-- აირჩიეთ ნედლეული --</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit}) — ნაშთი: {m.quantity}</option>)}
              </select>
            </div>
            {(() => {
              const selectedMat = materials.find(m => m.id === purchaseForm.raw_material_id);
              const hasPkg = selectedMat?.package_unit && selectedMat?.units_per_package;
              return (
                <>
                  <div>
                    <label className="text-xs text-emerald-700 mb-1 block font-semibold">
                      რაოდენობა {hasPkg ? `(${selectedMat!.unit})` : ''} *
                    </label>
                    <input type="number" min="0.01" step="0.01" value={purchaseForm.quantity} onChange={e => setPurchaseForm({...purchaseForm, quantity: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-slate-800 text-sm outline-none" />
                    {hasPkg && (
                      <p className="text-[11px] text-emerald-600 mt-1">≈ {(purchaseForm.quantity / selectedMat!.units_per_package!).toFixed(2)} {selectedMat!.package_unit}</p>
                    )}
                  </div>
                  {hasPkg && (
                    <div>
                      <label className="text-xs text-amber-600 mb-1 block font-bold">ან შეიყვანეთ {selectedMat!.package_unit}-ებით</label>
                      <input type="number" min="0" step="1" placeholder={`რამდენი ${selectedMat!.package_unit}?`} onChange={e => {
                        const pkgs = parseFloat(e.target.value) || 0;
                        setPurchaseForm({...purchaseForm, quantity: pkgs * selectedMat!.units_per_package!});
                      }} className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-sm outline-none focus:border-amber-500" />
                    </div>
                  )}
                </>
              );
            })()}
            <div>
              <label className="text-xs text-emerald-700 mb-1 block font-semibold">ერთეულის ფასი (₾) *</label>
              <input type="number" min="0" step="0.01" value={purchaseForm.unit_cost} onChange={e => setPurchaseForm({...purchaseForm, unit_cost: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-slate-800 text-sm outline-none" />
              {purchaseForm.quantity > 0 && purchaseForm.unit_cost > 0 && (
                <p className="text-[11px] text-emerald-600 mt-1 font-semibold">ჯამი: ₾{(purchaseForm.quantity * purchaseForm.unit_cost).toLocaleString('ka-GE', {minimumFractionDigits: 2})}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-emerald-700 mb-1 block font-semibold">გადახდის მეთოდი</label>
              <select value={purchaseForm.payment_method} onChange={e => setPurchaseForm({...purchaseForm, payment_method: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-slate-800 text-sm outline-none">
                <option value="bank_transfer">საბანკო გადარიცხვა</option>
                <option value="cash">ნაღდი ფული</option>
                <option value="credit">ნისიაზე (მომწოდებლის ვალი)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-emerald-700 mb-1 block">შენიშვნა</label>
              <input value={purchaseForm.notes} onChange={e => setPurchaseForm({...purchaseForm, notes: e.target.value})} placeholder="მაგ: ინვოისი #123" className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-slate-800 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePurchase} disabled={purchaseLoading} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold transition hover:bg-emerald-700 border-none cursor-pointer disabled:opacity-50">
              {purchaseLoading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />} რეგისტრაცია და გატარება
            </button>
            <button onClick={() => setShowPurchase(false)} className="px-5 py-2.5 border border-emerald-200 text-emerald-700 rounded-xl text-sm hover:bg-emerald-100 transition cursor-pointer bg-transparent">
              გაუქმება
            </button>
          </div>
        </div>
      )}

      {isAdding && renderFormBlock()}

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
                    {mat.package_unit && mat.units_per_package ? (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">1 {mat.package_unit} = {mat.units_per_package} {mat.unit}</p>
                    ) : null}
                    {mat.notes && <p className="text-xs text-slate-400 mt-0.5">{mat.notes}</p>}
                  </td>
                  <td className={`py-3 px-5 text-right font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                    {mat.quantity} <span className="text-xs font-normal text-slate-400">{mat.unit}</span>
                    {mat.package_unit && mat.units_per_package ? (
                      <div className="text-xs font-normal text-slate-500 mt-1 bg-white inline-block px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                        ≈ {Number((mat.quantity / mat.units_per_package).toFixed(2))} {mat.package_unit}
                      </div>
                    ) : null}
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
