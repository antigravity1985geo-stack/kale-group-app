import React, { useState } from 'react';
import { BookOpen, Package, ShoppingCart, Calculator, Book, Receipt, Warehouse, Percent, Users, BarChart2, ShieldAlert, ChevronDown, ChevronRight, Workflow, RefreshCcw, Factory, FileSignature } from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

export default function AdminGuide() {
  const [activeSection, setActiveSection] = useState<string>('accounting');

  const SECTIONS: GuideSection[] = [
    {
      id: 'general',
      title: 'ზოგადი მიმოხილვა',
      icon: BookOpen,
      content: (
        <div className="space-y-5 text-[15px] text-stone-300 leading-relaxed">
          <p className="text-xl font-medium text-white mb-2">კეთილი იყოს თქვენი მობრძანება KALE GROUP ERP სისტემაში.</p>
          <p>აღრიცხვისა და მართვის პანელზე წვდომა დაყოფილია ინდივიდუალურ როლებად, რათა უზრუნველყოფილი იყოს მონაცემთა მაქსიმალური უსაფრთხოება:</p>
          <div className="grid gap-4 mt-6">
            <div className="p-5 bg-stone-900/40 rounded-2xl border border-stone-800/80 backdrop-blur-sm">
              <strong className="text-amber-400 flex items-center gap-2 mb-2"><ShieldAlert size={18}/> ადმინისტრატორი (Admin)</strong>
              <span className="text-stone-400 text-sm leading-relaxed block">სრული წვდომა ყველა მოდულზე (პროდუქცია, ფინანსები, HR, სისტემური აუდიტი, კომპანიის პარამეტრები და მომხმარებელთა მართვა).</span>
            </div>
            <div className="p-5 bg-stone-900/40 rounded-2xl border border-stone-800/80 backdrop-blur-sm">
              <strong className="text-blue-400 flex items-center gap-2 mb-2"><Calculator size={18}/> ბუღალტერი (Accountant)</strong>
              <span className="text-stone-400 text-sm leading-relaxed block">მართავს ფინანსურ მოდულს, შეკვეთებს, თუმცა შეზღუდული აქვს პროდუქციის წაშლისა და სისტემური აუდიტის უფლება.</span>
            </div>
            <div className="p-5 bg-stone-900/40 rounded-2xl border border-stone-800/80 backdrop-blur-sm">
              <strong className="text-emerald-400 flex items-center gap-2 mb-2"><Package size={18}/> კონსულტანტი (Consultant)</strong>
              <span className="text-stone-400 text-sm leading-relaxed block">აქვს წვდომა მხოლოდ პროდუქციის მართვისა და შემოსული შეკვეთების სექციაზე. ბუღალტერია სრულად დაფარულია.</span>
            </div>
          </div>
          <div className="mt-6 p-4 border-l-4 border-emerald-500 bg-stone-900/40 rounded-r-xl">
            <h5 className="font-bold text-white mb-2">სისტემის უსაფრთხოება (v3.1 განახლება)</h5>
            <p className="text-sm text-stone-400">კრიტიკულ API ენდფოინთებზე (მაგ. შეკვეთების შექმნა) მოქმედებს Rate Limiting სისტემა. არაავტორიზებული ან სპამ-შეტევებისგან თავდასაცავად, სისტემა აბლოკირებს ბიჯებს თუ ის 15-წუთიან ლიმიტს გადააჭარბებს. კომპანიის Settings-ებიდან იმართება დღგ-ს სტატუსის დინამიური ინტეგრაცია.</p>
          </div>
        </div>
      )
    },
    {
      id: 'orders',
      title: 'შეკვეთების მართვა',
      icon: ShoppingCart,
      content: (
        <div className="space-y-4 text-[15px] text-stone-300 leading-relaxed">
          <p>შეკვეთების მიღება და დამუშავება არის სრულად ავტომატიზირებული <strong>BOG, TBC</strong> და <strong>Credo</strong> ბანკების API სინქრონიზაციის გზით. გადახდილი თანხები პირდაპირ აისახება ბუღალტერიაში.</p>
          
          <div className="mt-8 border-l-2 border-amber-500 pl-6 py-2 space-y-3 relative before:absolute before:left-[calc(-0.45rem-1px)] before:top-4 before:w-4 before:h-4 before:bg-stone-950 before:border-2 before:border-amber-500 before:rounded-full">
            <h4 className="text-white font-bold text-lg flex items-center gap-2">ეტაპი 1: შეკვეთის შემოსვლა</h4>
            <p className="text-sm text-stone-400">როდესაც კლიენტი წარმატებით იხდის ვებსაიტზე, შეკვეთის სტატუსი ავტომატურად ხდება <strong className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Confirmed (Paid)</strong>. ჩვენი ERP სისტემა ამ დროს ავტომატურად აკეთებს შესაბამის ბუღალტრულ გატარებას (1110 / 6100 / 3200).</p>
          </div>
          
          <div className="border-l-2 border-brand-500 pl-6 py-2 space-y-3 relative before:absolute before:left-[calc(-0.45rem-1px)] before:top-4 before:w-4 before:h-4 before:bg-stone-950 before:border-2 before:border-brand-500 before:rounded-full">
            <h4 className="text-white font-bold text-lg flex items-center gap-2">ეტაპი 2: ლოჯისტიკა</h4>
            <p className="text-sm text-stone-400">კურიერის გამოსვლის შემდეგ გადაიყვანეთ შეკვეთა <strong className="text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">Shipped</strong> სტატუსზე. RS.ge კრედენციალების შეყვანის შემდეგ, ზედნადების გენერირება მოხდება ერთი კლიკით.</p>
          </div>
          
          <div className="pl-6 py-2 pb-6 space-y-3 relative before:absolute before:left-[calc(-0.4rem-1px)] before:top-4 before:w-[17px] before:h-[17px] before:bg-emerald-500 before:rounded-full">
            <h4 className="text-white font-bold text-lg flex items-center gap-2">ეტაპი 3: დასრულება</h4>
            <p className="text-sm text-stone-400">პროდუქციის კლიენტზე ჩაბარების შემდგომ მიუთითეთ <strong className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Delivered</strong> სტატუსი.</p>
          </div>
        </div>
      )
    },
    {
      id: 'promotions',
      title: 'აქციები და მარკეტინგი',
      icon: Tag,
      content: (
        <div className="space-y-4 text-[15px] text-stone-300 leading-relaxed">
          <p>KALE GROUP პლატფორმაზე დანერგილია <strong>ჭკვიანი ფასდაკლებების სისტემა</strong>, რომელიც ავტომატურად აკონტროლებს პროდუქტის ფასს მიმდინარე თარიღთან მიმართებაში.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            <div className="p-4 bg-stone-900/40 rounded-xl border border-brand-500/30">
              <h5 className="text-brand-400 font-bold mb-2">მიმდინარე აქციები [აქტიური]</h5>
              <p className="text-xs text-stone-400">პროდუქტები, რომლებსაც უწერიათ მოქმედი აქციის ვადა. საიტზეც და POS სისტემაშიც აღიქმება ფასდაკლებით.</p>
            </div>
            <div className="p-4 bg-stone-900/40 rounded-xl border border-stone-600/50">
              <h5 className="text-stone-300 font-bold mb-2">ისტორია [ვადაგასული]</h5>
              <p className="text-xs text-stone-400">დასრულებული ფასდაკლებები. საიტზე უბრუნდება ძველ ფასს. ისტორიის ტაბი ეხმარება ბუღალტერიასა და მენეჯმენტს ჩანაწერების აღრიცხვაში.</p>
            </div>
          </div>
          <p className="text-sm p-4 bg-fuchsia-900/10 border border-fuchsia-500/30 rounded-xl">
            <strong className="text-fuchsia-400">ფინანსური ინტეგრაცია:</strong> ყოველი გაყიდვა, რომელიც ვადაში მყოფი ფასდაკლებით ხორციელდება, ბაზაში ფიქსირდება დროშით `is_promotional_sale`. მისი დინამიკის ნახვა ბუღალტერიას დეშბორდზე <strong>"აქციით გაყიდვების"</strong> ველში შეუძლია.
          </p>
        </div>
      )
    },
    {
      id: 'accounting',
      title: 'ბუღალტერია (ERP v3.1)',
      icon: Workflow,
      content: (
        <div className="space-y-4 text-sm text-stone-300 leading-relaxed">
          <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-5 rounded-2xl border-l-4 border-amber-500 mb-8">
            <p className="text-[15px]">KALE GROUP ERP ფინანსური მოდული ვერსია 3.1 დაფუძნებულია <strong>ორმაგი ჩანაწერის (Double-Entry Bookkeeping)</strong> სტანდარტზე საფუძვლიანი აუდიტით. სისტემა სრულად ინტეგრირებულია <strong>ესტონური მოდელის</strong> მოგების აღრიცხვასთან და ავტომატიზბულ გატარებებთან.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-stone-900/40 rounded-xl border border-stone-800/50">
               <h5 className="text-white font-bold mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> დინამიური დღგ (VAT)</h5>
              <p className="text-xs text-stone-400">B2C ონლაინ გაყიდვებისას სისტემა Settings-ებიდან ამოწმებს დღგ-ს სტატუსს და ინვოისებში დინამიურად ითვლის ინკლუზიურ (Inclusive) 18%-ს საბუღალტრო 3200 ანგარიშში.</p>
            </div>
            <div className="p-4 bg-stone-900/40 rounded-xl border border-stone-800/50">
              <h5 className="text-white font-bold mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> ავტომატიზებული ხელფასები</h5>
              <p className="text-xs text-stone-400">Payroll Run-ისას ავტომატურად იქმნება Journal Entry 8100 და 3300 ანგარიშებზე ჯამური ხარჯებისა და ვალდებულებების ზუსტი ასახვით.</p>
            </div>
          </div>
          <p className="text-stone-500 text-xs uppercase tracking-[0.2em] font-bold mt-8 mb-4">მოდულების დეტალური აღწერა</p>
        </div>
      )
    },
  ];

  const ACCOUNTING_MODULES = [
    {
      title: '📊 დეშბორდი (Dashboard)',
      icon: <BarChart2 size={18} className="text-amber-500" />,
      text: 'ფინანსური მდგომარეობის მყისიერი მიმოხილვა. აჩვენებს: ჯამურ შემოსავალს, COGS, მთლიან და ნეტო მოგებას, მარაგების ნაშთს და დღგ-ს. ასევე ზუსტად გამოყოფს "აქციით გენერირებულ გაყიდვებს" მარკეტინგული ROI-ს საზომად.'
    },
    {
      title: '📒 ჟურნალი (Journal Entries)',
      icon: <Book size={18} className="text-blue-400" />,
      text: 'აქ გროვდება ყველა ფინანსური ტრანზაქცია. შეგიძლიათ მექანიკურადაც დაამატოთ ჩანაწერი. ვების (სავაჭრო პლატფორმის) მეშვეობით განხორციელებული B2C შეკვეთები და ხელფასების დარიცხვა აქ ავტომატურად (POSTED) ისახება.'
    },
    {
      title: '🧾 ინვოისები (Invoices)',
      icon: <Receipt size={18} className="text-emerald-500" />,
      text: 'ავტომატურად ინახება B2B და B2C ინვოისები გაყიდვებიდან, რელევანტური subtotal, vat_rate და vat_amount ველებით. ინტეგრირებულია RS.ge-სთან B2B ინვოისების ასატვირთად.'
    },
    {
      title: '🛒 შესყიდვები (Purchases)',
      icon: <ShoppingCart size={18} className="text-purple-400" />,
      text: 'მოდული Suppliers, Purchase Orders (PO) და Goods Receipts (GRN) სამართავად. 3-Way Matching სისტემა უზრუნველყოფს მოწოდებული ინვოისისა და GRN-ის დამთხვევას.'
    },
    {
      title: '📦 სასაქონლო მარაგი (Inventory)',
      icon: <Warehouse size={18} className="text-brand-400" />,
      text: 'მარაგების რეალურ დროში მართვა FIFO მეთოდით. თითოეული პროდუქტისთვის დათვლილია საშუალო ღირებულება. საიტიდან ნივთის გაყიდვა (SALE_OUT) პირდაპირ ამცირებს მარაგს ინვენტარის ტრანზაქციებით.'
    },
    {
      title: '📈 ფინანსური რეპორტინგი (Reports)',
      icon: <BarChart2 size={18} className="text-emerald-400" />,
      text: 'დინამიური ფინანსური ანგარიშგება: მოგება-ზარალი (P&L), ბალანსი და საცდელი ბალანსი.'
    },
    {
      title: '🏭 წარმოება (Manufacturing)',
      icon: <Factory size={18} className="text-orange-400" />,
      text: 'ავეჯის წარმოების პროცესის მართვა. საშუალებას გაძლევთ შექმნათ BOM (Bill of Materials). Production Run ჩამოწერს ნედლეულს და დაამატებს მზა პროდუქციას.'
    },
    {
      title: '🔁 დაბრუნებები (RMA)',
      icon: <RefreshCcw size={18} className="text-rose-400" />,
      text: 'მომხმარებელთა დაბრუნებების ავტომატიზაცია. ირჩევთ მიზეზს (Damaged, Refused) და სისტემა აკეთებს Reversal ბუღალტრულ ჩანაწერსა და მარაგების უკან დაბრუნებას.'
    },
    {
      title: '🏛 დღგ მოდული (VAT)',
      icon: <Percent size={18} className="text-teal-400" />,
      text: 'ფიქსირდება შეყვანილი და გამოყვანილი დღგ დინამიურ Summary-ში. კომპანიის Settings-ებიდან იმართება დღგ-ს სტატუსი (დღგ-ს გადამხდელია თუ არა).'
    },
    {
      title: '💎 ესტონური მოდელი (Profit Tax)',
      icon: <Calculator size={18} className="text-amber-400" />,
      text: 'ესტონური მოდელის მიხედვით მოგების გადასახადის მართვა (15% დივიდენდები).'
    },
    {
      title: '👥 HR / ხელფასები (Payroll)',
      icon: <Users size={18} className="text-indigo-400" />,
      text: 'კადრების მართვა. Payroll Run გაშვებისას სისტემა ითვლის საშემოსავლო გადასახადს და ავტომატურად ქმნის Journal Entry-ს სახელფასო ხარჯის (8100) და ვალდებულების (3300) ასახვით.'
    },
    {
      title: '🛡 სისტემური აუდიტი (Audit Log)',
      icon: <ShieldAlert size={18} className="text-red-500" />,
      text: 'უსაფრთხოების კრიტიკული კომპონენტი, განკუთვნილი მხოლოდ ადმინისტრატორებისთვის. იწერება ყველა INSERT, UPDATE და DELETE მოქმედება.'
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 pb-12">
      {/* Header Profile - Premium Glassmorphism */}
      <div className="relative overflow-hidden bg-gradient-to-br from-stone-900 via-stone-900/90 to-black border border-stone-800 p-8 md:p-12 rounded-[2rem] shadow-2xl">
        {/* Abstract Background Element */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 p-8 md:p-12 opacity-[0.03] pointer-events-none transform -rotate-12">
          <BookOpen strokeWidth={0.5} size={250} />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-[11px] font-bold tracking-widest uppercase mb-6 backdrop-blur-sm">
            <FileSignature size={14} /> ERP v3.1 Documentation & User Manual
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
            სისტემის <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
              სახელმძღვანელო
            </span>
          </h2>
          <p className="text-stone-400 text-lg mt-5 max-w-2xl leading-relaxed">
            დეტალური ინსტრუქციები ტერმინოლოგიაზე, ფინანსური მოდულების ავტომატიზაციასა და მარკეტინგული აქციების ინტეგრაციაზე.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-3 sticky top-6">
          {SECTIONS.map(sec => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full group flex items-center justify-between px-6 py-4 rounded-2xl text-left transition-all duration-300 font-medium border ${
                activeSection === sec.id 
                  ? 'bg-gradient-to-r from-brand-900/40 to-stone-900/40 border-brand-700/50 text-amber-400 shadow-[0_0_30px_rgba(217,119,6,0.1)]' 
                  : 'bg-stone-900/40 border-stone-800/50 text-stone-400 hover:text-white hover:bg-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl transition-all duration-300 ${activeSection === sec.id ? 'bg-brand-500/20 text-amber-400 scale-110' : 'bg-stone-800 text-stone-500 group-hover:bg-stone-700 group-hover:text-stone-300'}`}>
                  <sec.icon size={20} />
                </div>
                <span className="text-base font-semibold">{sec.title}</span>
              </div>
              <ChevronRight size={18} className={`transition-transform duration-300 ${activeSection === sec.id ? 'opacity-100 translate-x-1 text-amber-500' : 'opacity-0 -translate-x-4'}`} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-stone-950/60 backdrop-blur-xl border border-stone-800/80 p-6 md:p-10 rounded-[2rem] min-h-[600px] shadow-2xl relative overflow-hidden">
          {/* Subtle noise/gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-stone-900/10 via-transparent to-black/20 pointer-events-none"></div>

          {SECTIONS.map(sec => (
            <div key={sec.id} className={`relative z-10 ${activeSection === sec.id ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'} h-full`}>
              <div className="flex flex-col md:flex-row md:items-center gap-5 mb-10 pb-8 border-b border-stone-800/80">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-900/80 to-stone-900 flex items-center justify-center border border-brand-800/80 text-amber-400 shadow-[0_0_30px_rgba(217,119,6,0.15)] shrink-0">
                  <sec.icon size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white tracking-wide">{sec.title}</h3>
                  <div className="h-1.5 w-16 bg-gradient-to-r from-amber-500 to-amber-700 rounded-full mt-3 opacity-90 shadow-[0_0_10px_rgba(217,119,6,0.5)]"></div>
                </div>
              </div>
              
              <div className="prose prose-invert max-w-none text-stone-300 prose-p:leading-relaxed prose-strong:text-white">
                {sec.content}
              </div>

              {/* Advanced Grid Layout for Accounting Modules */}
              {sec.id === 'accounting' && (
                <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {ACCOUNTING_MODULES.map((mod, i) => (
                    <GuideCard key={i} title={mod.title} content={mod.text} icon={mod.icon} index={i} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper Card Component for Modules
function GuideCard({ title, content, icon, index }: { title: string; content: string; icon: any; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div 
      className={`border rounded-2xl overflow-hidden transition-all duration-300 ${open ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-stone-900/80 shadow-[0_4px_30px_rgba(217,119,6,0.05)]' : 'border-stone-800/80 bg-stone-900/30 hover:bg-stone-900/60 hover:border-stone-700'}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-stone-950/80 rounded-xl border border-stone-800/80 shadow-inner group-hover:border-stone-700 transition-colors">
            {icon}
          </div>
          <span className="text-base font-bold text-stone-200 tracking-wide group-hover:text-white transition-colors">{title}</span>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${open ? 'bg-amber-500/20 text-amber-500' : 'bg-stone-800/80 text-stone-500 group-hover:bg-stone-700 group-hover:text-stone-300'}`}>
          <ChevronDown size={18} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-6 pb-6 text-[14px] text-stone-400 leading-relaxed border-t border-stone-800/50 mt-2 pt-5">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
