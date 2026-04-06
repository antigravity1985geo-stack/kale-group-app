import React, { useState } from 'react';
import { BookOpen, Package, ShoppingCart, Calculator, Book, Receipt, Warehouse, Percent, Users, BarChart2, ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';

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
        <div className="space-y-4 text-sm text-stone-300 leading-relaxed">
          <p>კეთილი იყოს თქვენი მობრძანება აღრიცხვის და მართვის პანელში. პანელზე წვდომა დაყოფილია 3 როლად:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white">ადმინისტრატორი</strong>: აქვს სრული წვდომა ყველა მოდულზე (პროდუქცია, ბუღალტერია, HR).</li>
            <li><strong className="text-white">ბუღალტერი</strong>: უყურებს და მართავს მხოლოდ ფინანსებს და შეკვეთებს. ვერ ცვლის პროდუქტებს.</li>
            <li><strong className="text-white">კონსულტანტი</strong>: შეუძლია მხოლოდ პროდუქტების და შეკვეთების მართვა. ბუღალტერიის მოდული მისთვის დაფარულია.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'products',
      title: 'პროდუქცია და კატეგორიები',
      icon: Package,
      content: (
        <div className="space-y-4 text-sm text-stone-300 leading-relaxed">
          <p>ადმინისტრატორებს და კონსულტანტებს შეუძლიათ "პროდუქცია" და "კატეგორიები" ტაბებიდან მართონ კატალოგი.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>პროდუქტის დამატება</strong>: აუცილებელია განისაზღვროს კატეგორია. თუ კატეგორია არ არსებობს, ჯერ შექმენით კატეგორია შესაბამის ტაბში.</li>
            <li><strong>აქციები (Promotions)</strong>: პროდუქტის რედაქტირებისას შეგიძლიათ მონიშნოთ 'აქციაშია' ნიშნული, მიუთითოთ ფასდაკლების პროცენტი და აქციის ვადა. ის ავტომატურად გამოჩნდება "აქციები" ტაბში.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'orders',
      title: 'შეკვეთების მართვა',
      icon: ShoppingCart,
      content: (
        <div className="space-y-4 text-sm text-stone-300 leading-relaxed">
          <p>კლიენტების მიერ ვებსაიტიდან შემოტანილი შეკვეთები ავტომატურად ვარდება ამ სექციაში სტატუსით <strong>pending</strong>. </p>
          <p>შეკვეთის დამუშავების ეტაპები:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>დაადასტურეთ შეკვეთა კლიენტთან და შეცვალეთ სტატუსი <strong>processing</strong>.</li>
            <li>კურიერის გამოსვლის შემდეგ მიუთითეთ <strong>shipped</strong>.</li>
            <li>ჩაბარების შემდგომ — <strong>delivered</strong>. ამ ეტაპზე შეკვეთა აისახება ბუღალტრული შემოსავლების ჯამში.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'accounting',
      title: 'ბუღალტერია: ძირითადი მიმოხილვა',
      icon: Calculator,
      content: (
        <div className="space-y-4 text-sm text-stone-300 leading-relaxed">
          <p>KALE GROUP-ის ბუღალტერიის მოდული დაფუძნებულია <strong>ორმაგი ჩანაწერის (Double-Entry Bookkeeping)</strong> სტანდარტზე, ყოველ ტრანზაქციას აქვს დებეტი (Debit) და კრედიტი (Credit). ეს უზრუნველყოფს ფინანსური მონაცემების აბსოლუტურ სიზუსტეს.</p>
          <p>სისტემა იყენებს <span className="text-amber-400 font-mono">FIFO (First-In, First-Out)</span> მეთოდს მარაგების (COGS - თვითღირებულება) დასათვლელად.</p>
          <p>აირჩიეთ ქვემოთ არსებული სექციებიდან დეტალური ინსტრუქციის სანახავად:</p>
        </div>
      )
    },
  ];

  const ACCOUNTING_MODULES = [
    {
      title: '📊 დეშბორდი (Dashboard)',
      text: 'ფინანსური მდგომარეობის მყისიერი მიმოხილვა. აჩვენებს: ჯამურ შემოსავალს, COGS (რეალიზებულის თვითღირებულებას), მთლიან და ნეტო მოგებას, მარაგების ნაშთს და დღგ-ს. დიაგრამაზე შეგიძლიათ ადევნოთ თვალი შემოსავლებისა და ნეტო მოგების დინამიკას თვეების მიხედვით.'
    },
    {
      title: '📒 ჟურნალი (Journal Entries)',
      text: 'აქ გროვდება ყველა ფინანსური ტრანზაქცია. შეგიძლიათ მექანიკურადაც დაამატოთ ჩანაწერი ("ახალი ჩანაწ."). აუცილებელია, რომ დებეტისა და კრედიტის ჯამი ერთმანეთს უდრიდეს, სხვაგვარად სვეტი არ შეინახება. ჩანაწერები თავდაპირველად არის DRAFT (მოლოდინში) სტატუსით. განთავსების (Post) შემდეგ ისინი აისახებიან ფინანსურ რეპორტებში.',
    },
    {
      title: '🧾 ინვოისები (Invoices)',
      text: 'ავტომატურად ინახება B2B და B2C ინვოისები გაყიდვებიდან. თითოეულ ინვოისს აქვს თავისი სტატუსი (PENDING, PAID). PAID-ზე გადასვლისას, სისტემა ავტომატურად წარმოქმნის დღგ-ს (Output VAT) და ახდენს შემოსავლის აღიარებას. ინტეგრირებულია RS.ge-ს სტატუსებიც (მომავალი სრული სინქრონიზაციისთვის).'
    },
    {
      title: '📦 სასაქონლო მარაგი (Inventory)',
      text: 'მარაგების რეალურ დროში მართვა. თითოეული პროდუქტისთვის დათვლილია "საშუალო ღირებულება" და "ხელმისაწვდომი რაოდენობა". სისტემა ავტომატურად გაფრთხილებთ სიგნალით, თუ მარაგი მინიმალურ ზღვარს ჩამოსცდება. კორექტირებისას შეგიძლიათ დაამატოთ/ჩამოწეროთ პროდუქცია (Adjustments).'
    },
    {
      title: '🏛 დღგ მოდული (VAT)',
      text: 'ფიქსირდება ყველა შემომავალი (Input) და გამომავალი (Output) დღგ. "ყოველთვ. შეჯ." (Summary) გვერდზე იხილავთ კონკრეტული თვის სანეტო დღგ-ს: სახელმწიფოსთვის გაქვთ გადასახდელი (წითლად) თუ ჩასათვლელი. YTD ინდიკატორები აჩვენებენ მიმდინარე წლის ჯამურ მაჩვენებლებს.'
    },
    {
      title: '👥 HR / ხელფასები (Payroll)',
      text: 'თანამშრომლობის მონაცემთა ბაზა. ყოველი თვის ბოლოს შეგიძლიათ გაუშვათ "პეიროლი" (Payroll Run). სისტემა ავტომატურად აკავებს 20%-იან საშემოსავლოს და ითვლის ასაღებ (Net) ხელფასს. გაშვების შემდგომ ავტომატურად იქმნება Journal Entry ბიუჯეტის აღსარიცხად.'
    },
    {
      title: '📈 ანგარიშგება (Financial Reports)',
      text: 'ამ ტაბში განთავსებულია 3 კლასიკური რეპორტი: P&L (მოგება-ზარალი), ბალანსი (Balance Sheet) და საბრუნავი უწყისი (Trial Balance). P&L-ზე ავტომატურად ითვლება Gross Margin-ის პროცენტულობა. ბალანსი ყოველთვის უნდა იძლეოდეს ტოლობას (Assets = Liabilities + Equity), რასაც სისტემა სიმწვანით გიდასტურებთ.'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Book size={24} /> სისტემის სახელმძღვანელო</h2>
        <p className="text-stone-400 text-sm mt-1">ინსტრუქციები P&L მოდულის, ფუნქციონალების და აღრიცხვის მეთოდოლოგიის შესახებ.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {SECTIONS.map(sec => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all font-medium ${
                activeSection === sec.id 
                  ? 'bg-brand-900 border border-brand-800 text-gold-400' 
                  : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <sec.icon size={18} />
                <span className="text-sm">{sec.title}</span>
              </div>
              <ChevronRight size={16} className={`transition-transform opacity-50 ${activeSection === sec.id ? 'opacity-100' : ''}`} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-stone-900/50 border border-stone-800 p-6 md:p-8 rounded-3xl min-h-[500px]">
          {SECTIONS.map(sec => (
            <div key={sec.id} className={activeSection === sec.id ? 'block animate-in fade-in slide-in-from-bottom-2' : 'hidden'}>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-800">
                <div className="w-12 h-12 rounded-2xl bg-brand-900/50 flex items-center justify-center border border-brand-800 text-gold-400">
                  <sec.icon size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white">{sec.title}</h3>
              </div>
              
              {sec.content}

              {/* Add Accordion specifically for Accounting Section */}
              {sec.id === 'accounting' && (
                <div className="mt-8 space-y-3">
                  {ACCOUNTING_MODULES.map((mod, i) => (
                    <GuideAccordion key={i} title={mod.title} content={mod.text} isDefaultOpen={i === 0} />
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

// Helper Accordion Component
function GuideAccordion({ title, content, isDefaultOpen = false }: { title: string; content: string; isDefaultOpen?: boolean }) {
  const [open, setOpen] = useState(isDefaultOpen);

  return (
    <div className={`border rounded-xl  overflow-hidden transition-all ${open ? 'border-brand-800 bg-brand-900/10' : 'border-stone-800 bg-stone-900/40 hover:bg-stone-900/80'}`}>
      <button 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-white focus:outline-none"
      >
        <span className="text-sm">{title}</span>
        <ChevronDown size={18} className={`text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-stone-400 leading-relaxed">
          {content}
        </div>
      )}
    </div>
  );
}
