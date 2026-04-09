import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, Package, LogOut, RefreshCw, ShoppingCart, Loader2, Edit3, Image as ImageIcon, Search, Eye, Download, TrendingUp, Users, UserPlus, Calculator, Tag, Percent, LayoutGrid, Book, Store, Settings } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './context/AuthContext';
import { generateOrderReceipt } from './utils/pdfGenerator';
import DashboardMetrics from './components/admin/DashboardMetrics';
import InviteConsultantModal from './components/admin/InviteConsultantModal';
import ConsultantsList from './components/admin/ConsultantsList';
import AccountingDashboard from './components/admin/accounting/AccountingDashboard';
import JournalEntries from './components/admin/accounting/JournalEntries';
import InvoicesList from './components/admin/accounting/InvoicesList';
import InventoryModule from './components/admin/accounting/InventoryModule';
import VatModule from './components/admin/accounting/VatModule';
import HrPayroll from './components/admin/accounting/HrPayroll';
import FinancialReports from './components/admin/accounting/FinancialReports';
import AdminGuide from './components/admin/AdminGuide';
import ManufacturingModule from './components/admin/accounting/ManufacturingModule';
import ReturnsModule from './components/admin/accounting/ReturnsModule';
import POSModule from './components/admin/pos/POSModule';
import CompanySettings from './components/admin/settings/CompanySettings';
import type { Product, Category } from './types/product';

type AccountingSubTab = 'acc-dashboard' | 'journal' | 'invoices' | 'inventory' | 'vat' | 'hr' | 'reports' | 'manufacturing' | 'returns';

export default function AdminPanel() {
  const { user, profile, isAdmin, isConsultant, isAccountant, isAuthorized, isLoading: authLoading, signIn, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'promotions' | 'categories' | 'orders' | 'pos' | 'team' | 'accounting' | 'settings' | 'guide'>('dashboard');
  const [accSubTab, setAccSubTab] = useState<AccountingSubTab>('acc-dashboard');

  // Permission helpers
  const canAddProducts = isAdmin || isConsultant;
  const canEditProducts = isAdmin || isConsultant;
  const canDeleteProducts = isAdmin;
  const canDeleteOrders = isAdmin;
  const canManageTeam = isAdmin;
  const canViewAccounting = isAdmin || isAccountant;
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', category: '', price: 0, images: [], colors: [], description: '', material: '', warranty: '', delivery: '', manufacturing: '', in_stock: true, is_on_sale: false, discount_percentage: 0, sale_price: 0, sale_start_date: '', sale_end_date: ''
  });
  
  // Inline Category State
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState<Partial<Category>>({ name: '', image: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUploadingCategory, setIsUploadingCategory] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'category') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'product') setIsUploading(true);
    else setIsUploadingCategory(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      
      if (type === 'product') {
        const currentImages = newProduct.images || [];
        setNewProduct({ ...newProduct, images: [...currentImages, data.publicUrl] });
      } else {
        setNewCategory({ ...newCategory, image: data.publicUrl });
      }
    } catch (error: any) {
      alert('ატვირთვის შეცდომა: ' + error.message);
    } finally {
      if (type === 'product') setIsUploading(false);
      else setIsUploadingCategory(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (!newProduct.images) return;
    const filteredImages = newProduct.images.filter((_, idx) => idx !== indexToRemove);
    setNewProduct({ ...newProduct, images: filteredImages });
  };

  useEffect(() => {
    if (isAuthorized && !authLoading) {
      fetchData();
    }
  }, [isAuthorized, authLoading]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes, orderRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase.from('orders').select('*').order('created_at', { ascending: false })
      ]);
      if (prodRes.data) setProducts(prodRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (orderRes.data) setOrders(orderRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await signIn(authForm.email, authForm.password);
      if (error) throw error;
    } catch (err: any) {
      alert('შესვლა ვერ მოხერხდა: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  // ── Products CRUD ──
  const openAddModal = () => {
    setEditingProduct(null);
    setNewProduct({ name: '', category: '', price: 0, images: [], colors: [], description: '', material: '', warranty: '', delivery: '', manufacturing: '' });
    setIsProductModalOpen(true);
    setShowCategoryForm(false);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({ ...product, colors: product.colors || [], in_stock: product.in_stock ?? true });
    setIsProductModalOpen(true);
    setShowCategoryForm(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProduct.category) {
      alert('გთხოვთ აირჩიოთ კატეგორია ან დაამატოთ ახალი.');
      return;
    }

    const imageArray = (newProduct.images && newProduct.images.length > 0) 
      ? newProduct.images 
      : ['https://via.placeholder.com/800x600?text=No+Image'];

    const payload = {
      name: newProduct.name,
      category: newProduct.category,
      price: newProduct.price,
      description: newProduct.description || null,
      material: newProduct.material || null,
      warranty: newProduct.warranty || null,
      delivery: newProduct.delivery || null,
      manufacturing: newProduct.manufacturing || null,
      in_stock: newProduct.in_stock ?? true,
      is_on_sale: newProduct.is_on_sale ?? false,
      discount_percentage: newProduct.discount_percentage || 0,
      sale_price: newProduct.sale_price || null,
      sale_start_date: newProduct.sale_start_date || null,
      sale_end_date: newProduct.sale_end_date || null,
      images: imageArray,
      colors: newProduct.colors || [],
    };

    if (editingProduct) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
      if (error) {
        alert('შეცდომა განახლებისას: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('products').insert([payload]);
      if (error) {
        alert('შეცდომა დამატებისას: ' + error.message);
        return;
      }
    }
    
    await fetchData();
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ პროდუქტის წაშლა?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('შეცდომა: ' + error.message);
      return;
    }
    await fetchData();
  };

  const handleStopSale = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ აქციის შეწყვეტა?')) return;
    const { error } = await supabase.from('products').update({ is_on_sale: false }).eq('id', id);
    if (error) {
      alert('შეცდომა: ' + error.message);
      return;
    }
    await fetchData();
  };

  const handleSaveInlineCategory = async () => {
    if (!newCategory.name || !newCategory.image) {
      alert('გთხოვთ მიუთითოთ კატეგორიის სახელი და ატვირთოთ სურათი.');
      return;
    }
    const { error } = await supabase.from('categories').insert([{
      name: newCategory.name,
      image: newCategory.image,
    }]);
    if (error) {
      alert('შეცდომა კატეგორიის დამატებისას: ' + error.message);
      return;
    }
    
    setNewProduct({ ...newProduct, category: newCategory.name! });
    setNewCategory({ name: '', image: '' });
    setShowCategoryForm(false);
    await fetchData();
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name || !newCategory.image) {
      alert('გთხოვთ მიუთითოთ კატეგორიის სახელი და ატვირთოთ სურათი.');
      return;
    }

    try {
      if (editingCategory) {
        // Update category
        const { error: catError } = await supabase.from('categories').update({
          name: newCategory.name,
          image: newCategory.image
        }).eq('id', editingCategory.id);
        
        if (catError) throw catError;

        // If name changed, update all products in this category
        if (editingCategory.name !== newCategory.name) {
          const { error: prodError } = await supabase.from('products')
            .update({ category: newCategory.name })
            .eq('category', editingCategory.name);
          if (prodError) console.error('Error updating products category:', prodError);
        }
      } else {
        // Insert category
        const { error: catError } = await supabase.from('categories').insert([{
          name: newCategory.name,
          image: newCategory.image
        }]);
        if (catError) throw catError;
      }

      await fetchData();
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setNewCategory({ name: '', image: '' });
    } catch (err: any) {
      alert('შეცდომა კატეგორიის შენახვისას: ' + err.message);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    // Check if category has products
    const hasProducts = products.some(p => p.category === cat.name);
    if (hasProducts) {
      if (!confirm(`ამ კატეგორიაში არის პროდუქტები. კატეგორიის წაშლა გამოიწვევს პროდუქტების კატეგორიის გარეშე დარჩენას. ნამდვილად გსურთ წაშლა?`)) return;
    } else {
      if (!confirm('ნამდვილად გსურთ კატეგორიის წაშლა?')) return;
    }

    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) {
      alert('შეცდომა: ' + error.message);
      return;
    }
    await fetchData();
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      alert('შეცდომა სტატუსის შეცვლისას: ' + error.message);
    } else {
      // When order is delivered, automatically create accounting entry
      if (newStatus === 'delivered') {
        try {
          const { data: rpcResult, error: rpcError } = await supabase.rpc('process_order_sale', {
            p_order_id: orderId
          });
          if (rpcError) {
            console.error('Accounting entry error:', rpcError);
            alert('⚠️ შეკვეთა დასრულდა, მაგრამ ბუღალტრული გატარება ვერ მოხერხდა: ' + rpcError.message);
          } else if (rpcResult && !rpcResult.success) {
            alert('⚠️ ' + (rpcResult.error || 'ბუღალტრული გატარება ვერ მოხერხდა'));
          } else if (rpcResult && rpcResult.success) {
            console.log('✅ Accounting entry created:', rpcResult.entry_number);
          }
        } catch (err: any) {
          console.error('RPC call failed:', err);
        }
      }
      await fetchData();
    }
    setIsUpdatingStatus(false);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const openOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
    const { data, error } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    if (error) console.error('Error fetching order items:', error);
    else setOrderItems(data || []);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ შეკვეთის წაშლა?')) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) alert('შეცდომა: ' + error.message);
    else await fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'shipped': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'ახალი';
      case 'processing': return 'მუშავდება';
      case 'shipped': return 'გაგზავნილია';
      case 'delivered': return 'დასრულებული';
      case 'cancelled': return 'გაუქმებული';
      default: return status;
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredOrders = orders.filter(o => 
    o.customer_first_name.toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
    o.customer_last_name.toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
    o.customer_phone.includes(orderSearchQuery) ||
    o.id.toLowerCase().includes(orderSearchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-gold-400 mb-4" />
        <p className="text-brand-300 text-sm tracking-widest uppercase">იტვირთება...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-brand-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl">
          <h2 className="text-3xl font-serif text-brand-900 mb-6 text-center">შესვლა</h2>
          {user && !isAuthorized && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              ⚠️ თქვენ არ გაქვთ ადმინისტრატორის ან კონსულტანტის უფლება. გთხოვთ, მიმართეთ ადმინისტრატორს.
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-2">ელ. ფოსტა</label>
              <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 outline-none focus:border-gold-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-2">პაროლი</label>
              <input type="password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 outline-none focus:border-gold-400" />
            </div>
            <button type="submit" className="w-full py-4 mt-4 bg-brand-900 text-white rounded-xl uppercase tracking-widest font-bold text-xs hover:bg-gold-400 hover:text-brand-950 transition-all border-none">შესვლა</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <aside className="w-64 bg-brand-900 text-white flex flex-col shadow-2xl z-10 relative">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-serif font-bold tracking-tight text-white mb-1 glow-gold cursor-pointer" onClick={() => window.location.href='/'}>
            KALE<span className="text-gold-400 font-light">ADMIN</span>
          </h2>
          <p className="text-[10px] text-brand-300 tracking-widest uppercase relative top-[-4px]">
            {profile?.full_name || profile?.email || 'მართვის პანელი'}
          </p>
          <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${isAdmin ? 'bg-gold-400/20 text-gold-400' : isAccountant ? 'bg-emerald-400/20 text-emerald-300' : 'bg-blue-400/20 text-blue-300'}`}>
            {isAdmin ? 'ადმინისტრატორი' : isAccountant ? 'ბუღალტერი' : 'კონსულტანტი'}
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', icon: <TrendingUp size={18}/>, label: 'სტატისტიკა' },
            ...(!isAccountant ? [{ id: 'products', icon: <Package size={18}/>, label: 'პროდუქცია' }] : []),
            ...(!isAccountant ? [{ id: 'promotions', icon: <Tag size={18}/>, label: 'აქციები' }] : []),
            ...(!isAccountant ? [{ id: 'categories', icon: <LayoutGrid size={18}/>, label: 'კატეგორიები' }] : []),
            { id: 'orders', icon: <ShoppingCart size={18}/>, label: 'შეკვეთები' },
            ...(!isAccountant ? [{ id: 'pos', icon: <Store size={18}/>, label: 'შოურუმი (POS)' }] : []),
            ...(canViewAccounting ? [{ id: 'accounting', icon: <Calculator size={18}/>, label: 'ბუღალტერია' }] : []),
            ...(canManageTeam ? [{ id: 'team', icon: <Users size={18}/>, label: 'თანამშრომლები' }] : []),
            ...(isAdmin ? [{ id: 'settings', icon: <Settings size={18}/>, label: 'პარამეტრები' }] : [])
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 outline-none border-none cursor-pointer ${activeTab === tab.id ? 'bg-gold-400 text-brand-950 shadow-lg shadow-gold-400/20 translate-x-1' : 'text-brand-200 hover:bg-white/5 hover:text-white bg-transparent'}`}
            >
              {tab.icon}
              <span className="text-sm font-semibold tracking-wide">{tab.label}</span>
            </button>
          ))}
          
          <button
            onClick={() => setActiveTab('guide')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium ${
              activeTab === 'guide'
                ? 'bg-brand-900 shadow-xl shadow-brand-900/20 border border-brand-800 text-gold-400'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Book size={20} />
            <span>სახელმძღვანელო</span>
          </button>
        </nav>
        <div className="p-6 border-t border-white/10 text-xs">
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 p-3.5 rounded-xl bg-white/5 text-brand-200 hover:bg-red-500 hover:text-white transition-all outline-none border-none cursor-pointer">
            <LogOut size={16} />
            <span className="font-semibold tracking-wider">გასვლა</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 h-screen overflow-y-auto bg-gray-50/50 relative">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
          <div>
            <h1 className="text-3xl font-serif text-brand-900 mb-1">
              {activeTab === 'dashboard' && 'ჯამური სტატისტიკა'}
              {activeTab === 'products' && 'პროდუქციის მართვა'}
              {activeTab === 'promotions' && 'აქციების მართვა'}
              {activeTab === 'categories' && 'კატეგორიების მართვა'}
              {activeTab === 'orders' && 'შეკვეთების ისტორია'}
              {activeTab === 'pos' && 'შოურუმი — პირდაპირი გაყიდვა'}
              {activeTab === 'accounting' && 'ბუღალტერია'}
              {activeTab === 'team' && 'თანამშრომლების მართვა'}
              {activeTab === 'settings' && 'კომპანიის პარამეტრები'}
            </h1>
            <p className="text-sm text-brand-400">
              {activeTab === 'dashboard' && 'გაყიდვების დიაგრამები და შეკვეთების მეტრიკა'}
              {activeTab === 'products' && `${products.length} აქტიური პროდუქტი სისტემაში`}
              {activeTab === 'promotions' && `${products.filter(p => p.is_on_sale).length} აქტიური აქცია`}
              {activeTab === 'categories' && `${categories.length} ძირითადი კატეგორია`}
              {activeTab === 'orders' && 'მომხმარებელთა შეკვეთები და სტატუსები'}
              {activeTab === 'pos' && 'კონსულტანტის პირდაპირი გაყიდვა — ქეში, ბარათი, განვადება'}
              {activeTab === 'accounting' && 'ფინანსური ანალიტიკა და ბუღალტრული ჩანაწერები'}
              {activeTab === 'team' && 'ადმინისტრატორები, კონსულტანტები და ბუღალტრები'}
              {activeTab === 'settings' && 'დღგ, განვადება და სხვა გლობალური პარამეტრები'}
            </p>
          </div>
          
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={activeTab === 'products' ? "ძიება დასახელებით..." : "ძიება (სახელი, ტელეფონი)..."} 
                  value={activeTab === 'products' ? searchQuery : orderSearchQuery}
                  onChange={(e) => activeTab === 'products' ? setSearchQuery(e.target.value) : setOrderSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 focus:bg-white transition-all shadow-none"
                />
              </div>
            <button onClick={fetchData} className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-white hover:border-gold-400 text-brand-500 hover:text-gold-500 transition-all shadow-none outline-none cursor-pointer">
              <RefreshCw size={20}/>
            </button>
            {activeTab === 'products' && canAddProducts && (
              <button onClick={openAddModal} className="flex items-center px-6 py-3 bg-brand-900 text-gold-400 rounded-xl hover:bg-brand-950 transition-all font-bold tracking-wider text-xs uppercase shadow-lg shadow-brand-900/20 outline-none border-none cursor-pointer">
                <Plus size={16} className="mr-2" /> დამატება
              </button>
            )}
            {activeTab === 'categories' && canAddProducts && (
              <button onClick={() => { setEditingCategory(null); setNewCategory({name:'', image:''}); setIsCategoryModalOpen(true); }} className="flex items-center px-6 py-3 bg-brand-900 text-gold-400 rounded-xl hover:bg-brand-950 transition-all font-bold tracking-wider text-xs uppercase shadow-lg shadow-brand-900/20 outline-none border-none cursor-pointer">
                <Plus size={16} className="mr-2" /> დამატება
              </button>
            )}
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 animate-spin text-gold-400 mb-4" />
            <p className="text-brand-400 text-sm tracking-widest uppercase font-semibold">იტვირთება მონაცემები...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardMetrics orders={orders} products={products} />
            )}

            {activeTab === 'pos' && (
              <POSModule />
            )}

            {activeTab === 'settings' && isAdmin && (
              <CompanySettings />
            )}

            {activeTab === 'products' && (
              <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] text-brand-400 uppercase tracking-widest">
                        <th className="px-6 py-5 font-bold">იმიჯი</th>
                        <th className="px-6 py-5 font-bold">დასახელება / კატეგორია</th>
                        <th className="px-6 py-5 font-bold">დეტალები</th>
                        <th className="px-6 py-5 font-bold">ფასი</th>
                        <th className="px-6 py-5 font-bold text-right">მოქმედება</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-brand-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative group-hover:shadow-md transition-all">
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-brand-900 text-base mb-1">{p.name}</p>
                            <span className="inline-block px-3 py-1 bg-gray-100 text-brand-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-brand-400 space-y-1">
                            {p.material && <p><span className="font-semibold text-brand-300">მასალა:</span> {p.material}</p>}
                            {p.warranty && <p><span className="font-semibold text-brand-300">გარანტია:</span> {p.warranty}</p>}
                          </td>
                           <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <p className="font-bold text-lg text-brand-900">₾{Number(p.price).toLocaleString()}</p>
                              {p.is_on_sale && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter w-fit">
                                  <Percent size={8}/> SALE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {canEditProducts && (
                              <button onClick={() => openEditModal(p)} className="inline-flex p-2.5 text-blue-500 bg-blue-50 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-none outline-none border-none cursor-pointer">
                                <Edit3 size={18} />
                              </button>
                            )}
                            {canDeleteProducts && (
                              <button onClick={() => handleDeleteProduct(p.id)} className="inline-flex p-2.5 text-red-500 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-none outline-none border-none cursor-pointer">
                                <Trash2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <Package size={56} className="mb-4 opacity-20" />
                    <p className="text-xl font-serif text-brand-800">პროდუქტები ვერ მოიძებნა</p>
                    {searchQuery && <p className="text-sm mt-2 text-brand-400">სცადეთ სხვა საძიებო სიტყვა</p>}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'promotions' && (
              <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] text-brand-400 uppercase tracking-widest">
                        <th className="px-6 py-5 font-bold">იმიჯი</th>
                        <th className="px-6 py-5 font-bold">პროდუქტი</th>
                        <th className="px-6 py-5 font-bold">ფასდაკლება</th>
                        <th className="px-6 py-5 font-bold">აქციის ფასი</th>
                        <th className="px-6 py-5 font-bold">სრულდება</th>
                        <th className="px-6 py-5 font-bold text-right">მოქმედება</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {products.filter(p => p.is_on_sale).map((p) => (
                        <tr key={p.id} className="hover:bg-brand-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-brand-900 text-sm">{p.name}</p>
                            <p className="text-[10px] text-brand-400 uppercase font-bold tracking-wider">{p.category}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                              -{p.discount_percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs text-brand-300 line-through">₾{Number(p.price).toLocaleString()}</span>
                              <span className="font-bold text-brand-900 text-base">₾{Number(p.sale_price).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1 italic">
                                {p.sale_end_date ? new Date(p.sale_end_date).toLocaleDateString('ka-GE') : 'უვადო'}
                              </span>
                              <span className="text-[10px] text-brand-300">
                                {p.sale_end_date ? new Date(p.sale_end_date).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                             <button onClick={() => openEditModal(p)} className="inline-flex p-2 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-500 hover:text-white transition-all shadow-none outline-none border-none cursor-pointer" title="რედაქტირება">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleStopSale(p.id)} className="inline-flex p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-none outline-none border-none cursor-pointer" title="აქციის შეწყვეტა">
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {products.filter(p => p.is_on_sale).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <p className="text-xl font-serif text-brand-800 uppercase tracking-widest">აქტიური აქციები არ არის</p>
                    <p className="text-sm mt-2 text-brand-400">გადადით "პროდუქციაში" აქციის დასამატებლად</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categories.map((cat) => (
                  <div key={cat.id} className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden group hover:shadow-xl hover:shadow-brand-900/5 transition-all duration-500">
                    <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                      <img 
                        src={cat.image} 
                        alt={cat.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/800x600?text=Broken+Image';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-6 bg-transparent">
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingCategory(cat);
                              setNewCategory({ name: cat.name, image: cat.image });
                              setIsCategoryModalOpen(true);
                            }}
                            className="p-3 bg-white text-brand-900 rounded-xl hover:bg-gold-400 transition-colors shadow-lg border-none cursor-pointer outline-none"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-3 bg-white text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors shadow-lg border-none cursor-pointer outline-none"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-serif text-brand-900 font-bold mb-1">{cat.name}</h3>
                      <p className="text-xs text-brand-400 uppercase tracking-widest font-bold">
                        {products.filter(p => p.category === cat.name).length} პროდუქტი
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] text-brand-400 uppercase tracking-widest">
                        <th className="px-6 py-5 font-bold">შეკვეთა #</th>
                        <th className="px-6 py-5 font-bold">კლიენტი</th>
                        <th className="px-6 py-5 font-bold">თარიღი</th>
                        <th className="px-6 py-5 font-bold">სტატუსი</th>
                        <th className="px-6 py-5 font-bold">ჯამი</th>
                        <th className="px-6 py-5 font-bold text-right">მოქმედება</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-brand-50/30 transition-colors group">
                          <td className="px-6 py-4 font-mono text-xs text-brand-400">
                            #{o.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-brand-900 text-sm">{o.customer_first_name} {o.customer_last_name}</p>
                            <p className="text-[10px] text-brand-400">{o.customer_phone}</p>
                          </td>
                          <td className="px-6 py-4 text-xs text-brand-400">
                            {new Date(o.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(o.status)}`}>
                              {getStatusLabel(o.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-brand-900 text-sm">₾{Number(o.total_price).toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => openOrderDetails(o)} className="inline-flex p-2.5 text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-900 hover:text-white transition-all shadow-none outline-none border-none cursor-pointer">
                              <Eye size={18} />
                            </button>
                            {canDeleteOrders && (
                              <button onClick={() => handleDeleteOrder(o.id)} className="inline-flex p-2.5 text-red-500 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-none outline-none border-none cursor-pointer">
                                <Trash2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <ShoppingCart size={56} className="mb-4 opacity-20" />
                    <p className="text-xl font-serif text-brand-800">შეკვეთები ვერ მოიძებნა</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'accounting' && canViewAccounting && (
              <div className="space-y-0">
                {/* ── Accounting Sub-Navigation ── */}
                <div className="bg-slate-50 rounded-2xl mb-6 p-2 flex flex-wrap gap-1 border border-slate-200">
                  {([
                    { id: 'acc-dashboard', label: '📊 დეშბორდი' },
                    { id: 'journal',       label: '📒 ჟურნ.' },
                    { id: 'invoices',      label: '🧾 ინვოის.' },
                    { id: 'inventory',     label: '📦 მარაგი' },
                    { id: 'vat',           label: '🏛 დღგ' },
                    { id: 'hr',            label: '👥 HR/ხელფ.' },
                    { id: 'manufacturing', label: '🏭 წარმოება' },
                    { id: 'returns',       label: '🔁 დაბრუნ.' },
                    { id: 'reports',       label: '📈 ანგ.' },
                  ] as { id: AccountingSubTab; label: string }[]).map(s => (
                    <button
                      key={s.id}
                      onClick={() => setAccSubTab(s.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border-none outline-none cursor-pointer ${
                        accSubTab === s.id
                          ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-transparent'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                  {/* RS.ge badge */}
                  <div className="ml-auto flex items-center px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    RS.ge <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">STUB</span>
                  </div>
                </div>

                {/* ── Sub-Module Content ── */}
                <div className="bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 min-h-[500px]">
                  {accSubTab === 'acc-dashboard' && <AccountingDashboard />}
                  {accSubTab === 'journal'       && <JournalEntries />}
                  {accSubTab === 'invoices'      && <InvoicesList />}
                  {accSubTab === 'inventory'     && <InventoryModule />}
                  {accSubTab === 'vat'           && <VatModule />}
                  { accSubTab === 'hr'            && <HrPayroll /> }
                  { accSubTab === 'manufacturing' && <ManufacturingModule /> }
                  { accSubTab === 'returns'       && <ReturnsModule /> }
                  { accSubTab === 'reports'       && <FinancialReports /> }
                </div>
              </div>
            )}

            {activeTab === 'guide' && (
              <AdminGuide />
            )}

            {activeTab === 'team' && canManageTeam && (
              <ConsultantsList onInviteClick={() => setIsInviteModalOpen(true)} />
            )}
          </>
        )}
      </main>

      {/* Invite Consultant Modal */}
      <InviteConsultantModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSent={() => {}}
      />

      {/* Add / Edit Product Modal */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-brand-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl flex flex-col max-h-full"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[2rem] shrink-0">
                <h3 className="text-2xl font-serif text-brand-900">
                  {editingProduct ? 'პროდუქტის რედაქტირება' : 'ახალი პროდუქტის დამატება'}
                </h3>
                <button 
                  onClick={() => setIsProductModalOpen(false)} 
                  className="text-gray-400 hover:bg-gray-200 hover:text-brand-900 p-2.5 rounded-full transition-colors outline-none cursor-pointer bg-transparent border-none"
                >
                  <X size={20}/>
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                <form id="productForm" onSubmit={handleSaveProduct} className="space-y-8">
                  {/* Basic Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4 text-brand-900 border-b border-gray-100 pb-2">
                      <div className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-600 flex items-center justify-center text-xs font-bold">1</div>
                      <h4 className="font-bold text-sm tracking-widest uppercase">ძირითადი ინფორმაცია</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">დასახელება</label>
                        <input required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:bg-white focus:border-gold-400 focus:ring-4 focus:ring-gold-400/10 transition-all outline-none" placeholder="მაგ: დივანი კლასიკი" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">ფასი (₾)</label>
                        <input type="number" required min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:bg-white focus:border-gold-400 focus:ring-4 focus:ring-gold-400/10 transition-all outline-none" placeholder="0.00" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-brand-50/30 p-4 rounded-xl border border-brand-100/50">
                      <input 
                        type="checkbox" 
                        id="in_stock"
                        checked={newProduct.in_stock} 
                        onChange={e => setNewProduct({...newProduct, in_stock: e.target.checked})}
                        className="w-5 h-5 accent-brand-900 rounded cursor-pointer"
                      />
                      <label htmlFor="in_stock" className="text-sm font-bold text-brand-900 cursor-pointer uppercase tracking-widest">მარაგშია</label>
                    </div>

                    <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100/50">
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-xs font-bold text-brand-800 tracking-widest uppercase">კატეგორია</label>
                        <button 
                          type="button" 
                          onClick={() => setShowCategoryForm(!showCategoryForm)}
                          className="text-xs font-bold text-gold-600 hover:text-gold-500 uppercase tracking-wider flex items-center transition-colors outline-none border-none bg-transparent cursor-pointer"
                        >
                          {showCategoryForm ? 'გაუქმება ✕' : '+ ახალის შექმნა'}
                        </button>
                      </div>
                      
                      {!showCategoryForm ? (
                        <select 
                          required 
                          value={newProduct.category} 
                          onChange={e => setNewProduct({...newProduct, category: e.target.value})} 
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:border-gold-400 focus:ring-4 focus:ring-gold-400/10 transition-all outline-none cursor-pointer"
                        >
                          <option value="">აირჩიეთ კატეგორია</option>
                          {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      ) : (
                        <div className="bg-white p-5 rounded-xl border border-gold-200 shadow-inner mt-2 space-y-4">
                          <p className="text-xs text-brand-500 mb-2 font-medium">შეიყვანეთ ახალი კატეგორიის დეტალები:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                              placeholder="დასახელება" 
                              value={newCategory.name || ''} 
                              onChange={e => setNewCategory({...newCategory, name: e.target.value})} 
                              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-gold-400 outline-none" 
                            />
                            <div>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={e => handleImageUpload(e, 'category')} 
                                disabled={isUploadingCategory} 
                                className="w-full text-xs text-gray-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-brand-900 hover:file:bg-gray-200 transition-all border border-gray-200 rounded-lg cursor-pointer" 
                              />
                              {isUploadingCategory && <p className="text-xs text-brand-500 mt-1.5 flex items-center"><Loader2 size={12} className="animate-spin mr-1"/> იტვირთება...</p>}
                              {newCategory.image && !isUploadingCategory && <p className="text-xs text-green-600 mt-1.5 font-medium">✓ სურათი მზადაა</p>}
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={handleSaveInlineCategory}
                            disabled={!newCategory.name || !newCategory.image || isUploadingCategory}
                            className="px-6 py-2.5 bg-brand-900 text-gold-400 rounded-lg text-xs font-bold tracking-widest uppercase hover:bg-brand-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-none outline-none cursor-pointer"
                          >
                            დამატება და არჩევა
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4 text-brand-900 border-b border-gray-100 pb-2">
                      <div className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-600 flex items-center justify-center text-xs font-bold">2</div>
                      <h4 className="font-bold text-sm tracking-widest uppercase">დეტალები & მახასიათებლები</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">მასალა</label>
                        <input value={newProduct.material || ''} onChange={e => setNewProduct({...newProduct, material: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:bg-white focus:border-gold-400 transition-all outline-none" placeholder="მაგ: MDF / მუხა" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">გარანტია</label>
                        <input value={newProduct.warranty || ''} onChange={e => setNewProduct({...newProduct, warranty: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:bg-white focus:border-gold-400 transition-all outline-none" placeholder="მაგ: 5 წელი" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">აღწერა</label>
                      <textarea rows={4} value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:bg-white focus:border-gold-400 transition-all outline-none resize-none" placeholder="პროდუქტის ვრცელი აღწერა..." />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">ფერები (მძიმით გამოყოფილი)</label>
                      <input 
                        value={newProduct.colors?.join(', ') || ''} 
                        onChange={e => setNewProduct({...newProduct, colors: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:bg-white focus:border-gold-400 transition-all outline-none" 
                        placeholder="მაგ: შავი, თეთრი, ნაცრისფერი" 
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {newProduct.colors?.map((col, idx) => (
                          <span key={idx} className="px-2 py-1 bg-brand-100 text-brand-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">{col}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Promotions */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4 text-brand-900 border-b border-gray-100 pb-2">
                      <div className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-600 flex items-center justify-center text-xs font-bold">3</div>
                      <h4 className="font-bold text-sm tracking-widest uppercase">აქციები</h4>
                    </div>

                    <div className="flex items-center gap-3 bg-brand-50/30 p-4 rounded-xl border border-brand-100/50">
                      <input 
                        type="checkbox" 
                        id="is_on_sale"
                        checked={newProduct.is_on_sale} 
                        onChange={e => setNewProduct({...newProduct, is_on_sale: e.target.checked})}
                        className="w-5 h-5 accent-brand-900 rounded cursor-pointer"
                      />
                      <label htmlFor="is_on_sale" className="text-sm font-bold text-brand-900 cursor-pointer uppercase tracking-widest">პროდუქტი მონაწილეობს აქციაში</label>
                    </div>

                    {newProduct.is_on_sale && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-brand-50/50 border border-brand-100/50 rounded-2xl">
                        <div>
                          <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">ფასდაკლება (%)</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={newProduct.discount_percentage || ''} 
                            onChange={e => {
                              const pct = Number(e.target.value);
                              const oldPrice = Number(newProduct.price) || 0;
                              const newSalePrice = oldPrice - Math.round(oldPrice * (pct / 100));
                              setNewProduct({...newProduct, discount_percentage: pct, sale_price: newSalePrice > 0 ? newSalePrice : 0});
                            }} 
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:border-gold-400 transition-all outline-none" 
                            placeholder="მაგ: 20" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">აქციის ფასი (₾)</label>
                          <input 
                            type="number" 
                            min="0" 
                            value={newProduct.sale_price || ''} 
                            onChange={e => {
                              const sprice = Number(e.target.value);
                              const oldPrice = Number(newProduct.price) || 0;
                              let pct = 0;
                              if (oldPrice > 0 && sprice <= oldPrice) {
                                pct = Math.round(((oldPrice - sprice) / oldPrice) * 100);
                              }
                              setNewProduct({...newProduct, sale_price: sprice, discount_percentage: pct});
                            }} 
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:border-gold-400 transition-all outline-none" 
                            placeholder="მაგ: 1500" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">აქციის დაწყება</label>
                          <input 
                            type="datetime-local" 
                            value={newProduct.sale_start_date ? new Date(newProduct.sale_start_date).toISOString().slice(0,16) : ''} 
                            onChange={e => setNewProduct({...newProduct, sale_start_date: new Date(e.target.value).toISOString()})} 
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:border-gold-400 transition-all outline-none" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">აქციის დასრულება</label>
                          <input 
                            type="datetime-local" 
                            value={newProduct.sale_end_date ? new Date(newProduct.sale_end_date).toISOString().slice(0,16) : ''} 
                            onChange={e => setNewProduct({...newProduct, sale_end_date: new Date(e.target.value).toISOString()})} 
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:border-gold-400 transition-all outline-none" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Media */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4 text-brand-900 border-b border-gray-100 pb-2">
                      <div className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-600 flex items-center justify-center text-xs font-bold">4</div>
                      <h4 className="font-bold text-sm tracking-widest uppercase">მედია (სურათი)</h4>
                    </div>
                    
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 hover:border-gold-300 transition-colors relative group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => handleImageUpload(e, 'product')} 
                        disabled={isUploading} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gold-50 flex items-center justify-center text-gold-500 group-hover:scale-110 transition-transform">
                          <ImageIcon size={28} />
                        </div>
                        <div>
                          <p className="font-bold text-brand-900 mb-1">ატვირთეთ პროდუქტის სურათი</p>
                          <p className="text-xs text-gray-400">დააჭირეთ ან აირჩიეთ ფაილი</p>
                        </div>
                      </div>
                    </div>
                    
                    {isUploading && (
                      <div className="flex items-center justify-center p-4 bg-brand-50 rounded-xl text-brand-600 text-sm font-medium">
                        <Loader2 size={16} className="animate-spin mr-2"/> იტვირთება...
                      </div>
                    )}
                    
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      {newProduct.images?.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm group">
                          <img src={img} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            {idx === 0 && <span className="absolute top-2 left-2 bg-gold-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md">მთავარი</span>}
                            <button type="button" onClick={() => handleRemoveImage(idx)} className="w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg hover:scale-110 cursor-pointer border-none outline-none">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-3 rounded-b-[2rem] shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-200 transition-colors outline-none cursor-pointer border-none bg-transparent"
                >
                  გაუქმება
                </button>
                <button 
                  type="submit"
                  form="productForm"
                  disabled={isUploading || isUploadingCategory}
                  className="px-8 py-3 bg-brand-900 text-gold-400 rounded-xl uppercase tracking-widest font-bold text-sm hover:bg-brand-950 shadow-xl shadow-brand-900/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 outline-none border-none cursor-pointer"
                >
                  {editingProduct ? 'რედაქტირება' : 'ახალი პროდუქტი'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {isOrderModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-brand-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[2rem] shrink-0">
                <div>
                  <h3 className="text-2xl font-serif text-brand-900">
                    შეკვეთის დეტალები #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </h3>
                  <p className="text-xs text-brand-400 mt-1">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => setIsOrderModalOpen(false)} 
                  className="text-gray-400 hover:bg-gray-200 hover:text-brand-900 p-2.5 rounded-full transition-colors outline-none cursor-pointer bg-transparent border-none"
                >
                  <X size={20}/>
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Customer Info */}
                  <div className="space-y-6">
                    <section>
                      <h4 className="text-xs font-bold tracking-widest text-brand-400 uppercase mb-4">კლიენტის მონაცემები</h4>
                      <div className="bg-gray-50 p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-brand-100 text-brand-800 text-[10px] font-bold uppercase rounded-md tracking-wider">
                            {selectedOrder.customer_type === 'legal' ? 'იურიდიული პირი' : 'ფიზიკური პირი'}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-brand-900">{selectedOrder.customer_first_name} {selectedOrder.customer_last_name}</p>
                        <p className="text-sm text-brand-600">{selectedOrder.customer_phone}</p>
                        {selectedOrder.customer_email && <p className="text-sm text-brand-600">{selectedOrder.customer_email}</p>}
                        
                        {(selectedOrder.personal_id || selectedOrder.company_id) && (
                          <div className="pt-2">
                             <p className="text-[10px] text-brand-400 uppercase font-bold mb-0.5">
                               {selectedOrder.customer_type === 'legal' ? 'საიდ. კოდი:' : 'პირადი ნომერი:'}
                             </p>
                             <p className="text-sm font-medium text-brand-900">
                               {selectedOrder.customer_type === 'legal' ? selectedOrder.company_id : selectedOrder.personal_id}
                             </p>
                          </div>
                        )}

                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-[10px] text-brand-400 uppercase font-bold mb-1">მისამართი</p>
                          <p className="text-sm text-brand-800">{selectedOrder.customer_city}, {selectedOrder.customer_address}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-bold tracking-widest text-brand-400 uppercase mb-4">დამატებითი კომენტარი</h4>
                      <div className="bg-brand-50 p-5 rounded-2xl">
                        <p className="text-sm text-brand-800 italic">
                          {selectedOrder.customer_note || "კომენტარი არ არის"}
                        </p>
                      </div>
                    </section>
                  </div>

                  {/* Order Items */}
                  <div className="lg:col-span-2 space-y-6">
                    <section>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold tracking-widest text-brand-400 uppercase">პროდუქტები ({orderItems.length})</h4>
                        <button 
                          onClick={async () => await generateOrderReceipt(selectedOrder, orderItems)}
                          className="flex items-center gap-2 text-xs font-bold text-brand-900 border-b border-brand-900 pb-0.5 hover:text-gold-600 hover:border-gold-600 transition-colors bg-transparent border-none outline-none cursor-pointer"
                        >
                          <Download size={14} /> PDF ქვითარი
                        </button>
                      </div>
                      <div className="border border-gray-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-brand-400 uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="px-4 py-3">დასახელება</th>
                              <th className="px-4 py-3 text-center">რაოდ.</th>
                              <th className="px-4 py-3 text-right">ფასი</th>
                              <th className="px-4 py-3 text-right">ჯამი</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {orderItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3 font-medium text-brand-900">{item.product_name}</td>
                                <td className="px-4 py-3 text-center">{item.quantity}</td>
                                <td className="px-4 py-3 text-right">₾{item.price_at_purchase.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-bold">₾{(item.quantity * item.price_at_purchase).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-brand-50/50">
                            <tr>
                              <td colSpan={3} className="px-4 py-4 text-right font-bold text-brand-900">სულ გადასახდელი:</td>
                              <td className="px-4 py-4 text-right font-bold text-xl text-brand-900">₾{selectedOrder.total_price.toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </section>
                    
                    <section className="bg-white p-6 rounded-2xl border-2 border-brand-100">
                      <h4 className="text-xs font-bold tracking-widest text-brand-400 uppercase mb-4">შეკვეთის სტატუსი</h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'pending', label: 'ახალი' },
                          { id: 'processing', label: 'მუშავდება' },
                          { id: 'shipped', label: 'გაგზავნილია' },
                          { id: 'delivered', label: 'დასრულებული' },
                          { id: 'cancelled', label: 'გაუქმებული' }
                        ].map(s => (
                          <button 
                            key={s.id}
                            onClick={() => handleStatusUpdate(selectedOrder.id, s.id)}
                            disabled={isUpdatingStatus}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-none outline-none cursor-pointer ${selectedOrder.status === s.id ? 'bg-gold-400 text-brand-950 scale-105 shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
              <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
                <div>
                  <h3 className="text-2xl font-serif text-brand-900 mb-1">{editingCategory ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია'}</h3>
                  <p className="text-xs text-brand-400 uppercase tracking-widest font-bold">მიუთითეთ მონაცემები</p>
                </div>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-3 text-brand-400 hover:text-brand-900 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border-none outline-none cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-3 px-1 italic">კატეგორიის დასახელება</label>
                  <input 
                    type="text" 
                    required 
                    value={newCategory.name} 
                    onChange={e => setNewCategory({...newCategory, name: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:border-gold-400 focus:bg-white focus:ring-4 focus:ring-gold-400/5 transition-all outline-none font-medium"
                    placeholder="მაგ: სამზარეულო"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-400 tracking-widest uppercase mb-3 px-1 italic">კატეგორიის ფოტო</label>
                  <div className="space-y-4">
                    <div className="relative group aspect-video rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-gold-400/50 hover:bg-gold-50/20 transition-all flex flex-col items-center justify-center cursor-pointer">
                      {newCategory.image ? (
                        <>
                          <img src={newCategory.image} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-brand-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <RefreshCw className="text-white animate-spin-slow" size={32} />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center">
                          <ImageIcon className="text-gray-300 mb-3" size={40} />
                          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest italic">ატვირთეთ ფოტო</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'category')} 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isUploadingCategory}
                      />
                    </div>
                    {isUploadingCategory && (
                      <div className="flex items-center space-x-2 text-xs font-bold text-gold-600 uppercase tracking-widest animate-pulse">
                        <Loader2 size={14} className="animate-spin" />
                        <span>მიმდინარეობს ატვირთვა...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-brand-600 rounded-2xl font-bold tracking-widest uppercase border-none outline-none cursor-pointer hover:bg-gray-100 transition-all">გაუქმება</button>
                  <button type="submit" disabled={isUploadingCategory || !newCategory.name || !newCategory.image} className="flex-[2] py-4 bg-brand-900 text-gold-400 rounded-2xl font-black tracking-widest uppercase shadow-xl shadow-brand-900/30 border-none outline-none cursor-pointer hover:bg-brand-950 transition-all disabled:opacity-50">შენახვა</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
