import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  ChevronDown, 
  Package, 
  ShoppingCart, 
  Calculator, 
  Users, 
  Settings, 
  Store,
  Factory,
  BookOpen,
  MousePointerClick,
  BarChart,
  Tag,
  MessageSquare,
  Percent
} from "lucide-react";
import { cn } from "@/src/lib/utils";

const guideItems = [
  {
    id: "overview",
    icon: <BookOpen className="h-6 w-6" />,
    color: "bg-indigo-100 text-indigo-600 border-indigo-200",
    title: "სისტემის მიმოხილვა",
    subtitle: "გაეცანით Kale Group ERP-ის მთავარ პრინციპებს",
    content: (
      <div className="space-y-4 text-slate-700 leading-relaxed">
        <p>
          <strong>Kale Group ERP</strong> არის სრულყოფილი, ერთიანი პლატფორმა, რომელიც აკავშირებს გაყიდვებს (Online & Offline), წარმოებასა და ბუღალტერიას. 
          სისტემა ავტომატიზირებულად უზრუნველყოფს ფინანსური მონაცემების, მარაგებისა და მომხმარებელთა მოთხოვნების სინქრონიზაციას რეალურ დროში.
        </p>
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
          <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
            <MousePointerClick className="h-4 w-4" />
            როგორ გამოვიყენოთ სახელმძღვანელო?
          </h4>
          <p className="text-sm text-indigo-800">
            ჩამოშალეთ თითოეული მოდული, რათა დეტალურად ნახოთ მისი ფუნქციონალი, საჭიროების დრო და გამოყენების ინსტრუქცია.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "statistics",
    icon: <BarChart className="h-6 w-6" />,
    color: "bg-sky-100 text-sky-600 border-sky-200",
    title: "სტატისტიკა (Analytics)",
    subtitle: "გაყიდვების ზოგადი ანალიტიკა და გრაფიკები",
    content: (
      <div className="space-y-4 text-slate-700">
        <p className="text-sm">სტატისტიკის მოდული გაწვდით ვიზუალურ ინფორმაციას ბიზნესის ზრდის შესახებ, ბუღალტრული დეტალების გარეშე.</p>
        <ul className="text-sm space-y-1 list-disc list-inside text-slate-600 ml-2">
          <li><strong>შემოსავლების გრაფიკი:</strong> დროში განაწილებული შემოსავლების ანალიზი.</li>
          <li><strong>ყველაზე გაყიდვადი პროდუქტები:</strong> იდენტიფიკაცია იმ ნივთების, რომლებიც ყველაზე მოთხოვნადია.</li>
          <li><strong>მომხმარებელთა აქტივობა:</strong> ტრაფიკისა და შეკვეთების კონვერსიის მაჩვენებლები.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "products",
    icon: <Package className="h-6 w-6" />,
    color: "bg-blue-100 text-blue-600 border-blue-200",
    title: "პროდუქცია",
    subtitle: "კატალოგის, მახასიათებლების და ფასების მართვა",
    content: (
      <div className="space-y-4 text-slate-700">
        <p className="text-sm">კატალოგის ცენტრალიზებული მართვა. აქ შექმნილი პროდუქტები მომენტალურად აისახება მთავარ ვებსაიტზე და შოურუმის (POS) პანელში.</p>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <strong className="text-blue-700 block mb-1 text-sm">ახალი პროდუქტის დამატება</strong>
          <ul className="text-sm space-y-1 list-disc list-inside text-slate-600 ml-2">
            <li>აუცილებლად შეავსეთ სავალდებულო ველები: დასახელება, ფასი, და קატეგორია.</li>
            <li>ატვირთეთ მაღალი ხარისხის სურათები (მთავარი და გალერეის სურათები).</li>
            <li>შეცვალეთ სტატუსი (აქტიური სრულად გამოსაჩენად საიტზე, დრაფტი მალავს მას).</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "promotions",
    icon: <Percent className="h-6 w-6" />,
    color: "bg-rose-100 text-rose-600 border-rose-200",
    title: "აქციები (Promotions)",
    subtitle: "ფასდაკლებების სეზონური კამპანიები",
    content: (
      <div className="space-y-4 text-slate-700">
        <p className="text-sm">ეს მოდული საშუალებას გაძლევთ შექმნათ ავტომატიზირებული სარეკლამო კამპანიები მრავალ პროდუქტზე ერთდროულად.</p>
        <ul className="text-sm space-y-1 list-disc list-inside text-slate-600 ml-2">
          <li><strong>კამპანიის შექმნა:</strong> დაარქვით სახელი (მაგ: საახალწლო ფასდაკლება), აირჩიეთ % და მონიშნეთ კატეგორიები.</li>
          <li><strong>ტაიმერი:</strong> შეგიძლიათ მიუთითოთ დაწყების და დასრულების თარიღები. საიტზე ტაიმერი ავტომატურად ჩაირთვება.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "categories",
    icon: <Tag className="h-6 w-6" />,
    color: "bg-violet-100 text-violet-600 border-violet-200",
    title: "კატეგორიები",
    subtitle: "საიტის ნავიგაციის სტრუქტურირება",
    content: (
      <div className="space-y-4 text-slate-700">
        <p className="text-sm">პროდუქციის კატეგორიზაცია და ქვე-კატეგორიზაცია (ხე). ამ მოდულით კონტროლდება ვებსაიტის მთავარი მენიუ (Navbar).</p>
        <ul className="text-sm space-y-1 list-disc list-inside text-slate-600 ml-2">
          <li><strong>მთავარი და ქვე-კატეგორიები:</strong> შეგიძლიათ შექმნათ "ავეჯი", ხოლო მასში ჩააშენოთ "საძინებელი", "მისაღები" და ა.შ.</li>
          <li><strong>იკონები და სურათები:</strong> მიამაგრეთ ფოტოები, რათა საიტზე კატეგორიების განყოფილება ვიზუალურად მიმზიდველი გამოჩნდეს.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "orders",
    icon: <ShoppingCart className="h-6 w-6" />,
    color: "bg-emerald-100 text-emerald-600 border-emerald-200",
    title: "შეკვეთები (Orders)",
    subtitle: "საიტიდან შემოსული შეკვეთების სასიცოცხლო ციკლი",
    content: (
      <div className="space-y-4 text-slate-700">
        <p className="text-sm">აქ იყრის თავს ვებსაიტზე გაფორმებული ონლაინ შეკვეთები (BOG/TBC ან ნაღდი გადახდით), რათა ლოჯისტიკამ დროულად მოახდინოს რეაგირება.</p>
        <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-amber-500"></span> <strong>ახალი</strong> <span className="text-slate-500">- გადახდილი/გაფორმებული, ელოდება დასტურს.</span></div>
          <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-blue-500"></span> <strong>მუშავდება</strong> <span className="text-slate-500">- მიმდინარეობს საწყობიდან წამოღება.</span></div>
          <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> <strong>გაგზავნილი</strong> <span className="text-slate-500">- კურიერმა წაიღო.</span></div>
          <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> <strong>დასრულებული</strong> <span className="text-slate-500">- კლიენტმა ჩაიბარა ნივთი.</span></div>
        </div>
      </div>
    ),
  },
  {
    id: "pos",
    icon: <Store className="h-6 w-6" />,
    color: "bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200",
    title: "შოურუმი (POS)",
    subtitle: "ფიზიკური მაღაზიის სალაროს სისტემა",
    content: (
      <div className="space-y-4 text-slate-700">
        <p className="text-sm">განკუთვნილია ფიზიკური მაღაზიის სალაროსთვის. იძლევა კლიენტების სწრაფი მომსახურების და ქვითრის ამოჭრის საშუალებას.</p>
        <div className="bg-gradient-to-r from-fuchsia-50 to-pink-50 p-5 rounded-xl border border-fuchsia-100">
          <h4 className="font-semibold text-fuchsia-900 mb-2">როგორ მუშაობს?</h4>
          <ol className="text-sm space-y-2 list-decimal list-inside text-fuchsia-800">
            <li>ისარგებლეთ საძიებო ველით (ბარკოდის სკანერით) გადასატანად კალათაში.</li>
            <li>დაარეგისტრირეთ კლიენტის ინფო მომავალი მარკეტინგისთვის.</li>
            <li>აირჩიეთ მეთოდი (ნაღდი, ბარათი, განვადება) და დაასრულეთ გადახდა. საწყობიდან ჩამოიწერება ავტომატურად.</li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: "accounting",
    icon: <Calculator className="h-6 w-6" />,
    color: "bg-teal-100 text-teal-600 border-teal-200",
    title: "ბუღალტერია (ERP CORE)",
    subtitle: "სრული ფინანსური სურათი, დეკლარაციები და ინვოისები",
    content: (
      <div className="space-y-4 text-slate-700">
        <p className="text-sm">მთავარი ფინანსური მოდული, სადაც სინქრონიზდება ყველა ოპერაცია (შოურუმიდან, საიტიდან, წარმოებიდან). დეტალურად მოიცავს შემდეგ ქვე-განყოფილებებს:</p>
        
        <ul className="text-sm space-y-3 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <li className="flex gap-2">
            <strong className="min-w-[120px] text-teal-700">დეშბორდი:</strong>
            <span className="text-slate-600">იძლევა ყოველდღიური გაყიდვების, მოგების, ზარალის და ქეშფლოუს (Cashflow), ასევე სრული საბანკო ბალანსების ვიზუალურ ანალიზს.</span>
          </li>
          <li className="flex gap-2">
            <strong className="min-w-[120px] text-teal-700">ჟურნალი:</strong>
            <span className="text-slate-600">ორმაგი ჩანაწერების რეესტრი (დებეტი/კრედიტი) ტرانზაქციების უწყვეტი ლოგირებისთვის.</span>
          </li>
          <li className="flex gap-2">
            <strong className="min-w-[120px] text-teal-700">ინვოისები:</strong>
            <span className="text-slate-600">B2B გაყიდვებისა და შესყიდვების ინვოისების գენერირება და მათზე დავალიანებების/გადახდების მართვა.</span>
          </li>
          <li className="flex gap-2">
            <strong className="min-w-[120px] text-teal-700">მარაგი:</strong>
            <span className="text-slate-600">ავტომატური კონტროლი თვითღირებულებაზე (Cost of Goods Sold) და ნაშთებზე ყოველი გაყიდვის შემდეგ.</span>
          </li>
          <li className="flex gap-2">
            <strong className="min-w-[120px] text-teal-700">დღგ:</strong>
            <span className="text-slate-600">ავტომატურად აგენერირებს დღგ-ს ყოველთვიურ საგადასახადო ბაზას შემოსავლებსა და ხარჯებზე დაყრდნობით.</span>
          </li>
          <li className="flex gap-2">
            <strong className="min-w-[120px] text-teal-700">HR / ხელფ.:</strong>
            <span className="text-slate-600">თანამშრომელთა საათობრივი ან ფიქსირებული ანაზღაურებების გამოთვლა და საშემოსავლო გადასახადის (20%) დაკავება.</span>
          </li>
          <li className="flex gap-2">
            <strong className="min-w-[120px] text-teal-700">დანახარჯ.:</strong>
            <span className="text-slate-600">საოპერაციო ხარჯების აღრიცხვა (იჯარა, დენი, მარკეტინგი და ა.შ.).</span>
          </li>
          <li className="flex gap-2">
            <strong className="min-w-[120px] text-teal-700">RS.ge:</strong>
            <span className="text-slate-600">უშუალო API ინტეგრაცია შემოსავლების სამსახურთან ზედნადებების ასატვირთად და დასადასტურებლად.</span>
          </li>
          <li className="flex gap-2">
            <strong className="min-w-[120px] text-teal-700">ძირ. აქტ.:</strong>
            <span className="text-slate-600">ძირითადი აქტივების (დანადგარები, ავეჯი) მართვა და მათი წლიური ამორტიზაციის ავტომატური დარიცხვა.</span>
          </li>
          <li className="flex gap-2">
            <strong className="min-w-[120px] text-teal-700">გადასახ.:</strong>
            <span className="text-slate-600">სტანდარტული (დღგ, საშემოსავლო, მოგების) საგადასახადო ვალდებულებების კალენდარი და სტატუსები.</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "manufacturing",
    icon: <Factory className="h-6 w-6" />,
    color: "bg-orange-100 text-orange-600 border-orange-200",
    title: "წარმოება და საწყობი",
    subtitle: "ნედლეულის და ჩამოჭრების რეესტრი",
    content: (
      <div className="space-y-4 text-slate-700">
        <p className="text-sm">კონტროლდება ნედლეული (შემომავალი მასალები) და წარმოების პროცესში მიღებული ნარჩენები.</p>
        <ul className="text-sm space-y-1 list-disc list-inside text-slate-600 ml-2">
          <li><strong>ნედლეულის ჩამოწერა:</strong> ავეჯის აწყობისას სისტემა ავტომატურად აკლებს საჭირო მასალას მარაგებიდან.</li>
          <li><strong>ჩამოჭრები (Offcuts):</strong> უკვე გამოყენებული დაფების ნარჩენების ზომების ლოგირება, რათა დეტალურად გააკონტროლოთ დანაკარგები.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "team",
    icon: <Users className="h-6 w-6" />,
    color: "bg-stone-100 text-stone-600 border-stone-200",
    title: "თანამშრომლები (HR/გუნდი)",
    subtitle: "წვდომის უფლებები და მოწვევები",
    content: (
      <div className="space-y-4 text-slate-700">
        <p className="text-sm">გუნდის წევრების დამატება და როლების განსაზღვრა უსაფრთხოების დასაცავად.</p>
        <div className="space-y-2 mt-2">
          <div className="bg-stone-50 text-sm p-3 rounded-lg border border-stone-100">
            <strong className="text-stone-800">ადმინისტრატორი</strong> - წვდომა ყველა ფინანსურ მოდულსა და პარამეტრებზე.
          </div>
          <div className="bg-stone-50 text-sm p-3 rounded-lg border border-stone-100">
            <strong className="text-stone-800">ბუღალტერი</strong> - მხოლოდ ბუღალტერიის ქვე-მოდულების და ჟურნალის მართვა.
          </div>
          <div className="bg-stone-50 text-sm p-3 rounded-lg border border-stone-100">
            <strong className="text-stone-800">კონსულტანტი</strong> - წვდომა შეკვეთებზე, POS შოურუმსა და პროდუქციის ნახვაზე.
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "messages",
    icon: <MessageSquare className="h-6 w-6" />,
    color: "bg-pink-100 text-pink-600 border-pink-200",
    title: "შეტყობინებები",
    subtitle: "მომხმარებელთა უკუკავშირი საიტიდან",
    content: (
      <div className="space-y-4 text-slate-700 text-sm">
        <p>საიტის საკონტაქტო ფორმიდან შემოსული წერილების ინბოქსი.</p>
        <p className="text-slate-600">საშუალებას გაძლევთ თვალი ადევნოთ მომხმარებლების კითხვებს პროდუქციასთან დაკავშირებით და მონიშნოთ ისინი როგორც "წაკითხული / პასუხგაცემული".</p>
      </div>
    ),
  },
  {
    id: "settings",
    icon: <Settings className="h-6 w-6" />,
    color: "bg-slate-100 text-slate-600 border-slate-200",
    title: "პარამეტრები (Settings)",
    subtitle: "აპლიკაციის გლობალური კონფიგურაცია",
    content: (
      <div className="space-y-4 text-slate-700 text-sm">
        <ul className="list-disc list-inside space-y-2 text-slate-600 ml-2">
          <li><strong>დღგ-ს სტატუსი:</strong> ჩართეთ თუ კომპანია არის დღგ-ს გადამხდელი (ავტომატურად გაითვალისწინებს 18%-იან დარიცხვებს სისტემაში).</li>
          <li><strong>განვადების საკომისიო:</strong> მიუთითეთ % (მაგ: 5%), რაც ემატება შოურუმში განვადებით შესყიდვებს.</li>
          <li><strong>პაროლები და API:</strong> საბანკო სისტემებთან (BOG/TBC) დაკავშირების გასაღებები.</li>
        </ul>
      </div>
    ),
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export function Guide() {
  const [openItems, setOpenItems] = useState<string[]>(["overview", "accounting"]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      
      {/* Visual Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-8 p-8 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-blue-50 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm mb-4 text-indigo-600">
          <BookOpen className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">ადმინ პანელის სრული გზამკვლევი</h2>
        <p className="text-slate-500 max-w-lg mx-auto">მოგესალმებით სისტემაში. ეს სახელმძღვანელო დეტალურად ხსნის ყველა მოდულისა და ფინანსური ინსტრუმენტის დანიშნულებას.</p>
      </motion.div>

      {/* Accordion List */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {guideItems.map((item) => {
          const isOpen = openItems.includes(item.id);
          
          return (
            <motion.div
              variants={itemVariants}
              key={item.id}
              className={cn(
                "rounded-2xl border transition-all duration-300 overflow-hidden",
                isOpen 
                  ? "bg-white border-slate-200 shadow-md translate-y-[-2px]" 
                  : "bg-white/60 border-slate-100 hover:bg-white hover:border-slate-200"
              )}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="flex w-full items-center gap-5 p-5 text-left focus:outline-none"
              >
                <div className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-300",
                  isOpen ? item.color : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                  {item.icon}
                </div>
                
                <div className="flex-1">
                  <h3 className={cn("text-lg font-semibold transition-colors duration-300", isOpen ? "text-slate-900" : "text-slate-700")}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5 leading-snug">{item.subtitle}</p>
                </div>

                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                  className={cn(
                    "flex shrink-0 h-8 w-8 items-center justify-center rounded-full transition-colors",
                    isOpen ? "bg-slate-100 text-slate-800" : "text-slate-400"
                  )}
                >
                  <ChevronDown className="h-5 w-5" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  >
                    <div className="px-5 pb-6 pt-2 ml-[68px]">
                      {item.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  );
}
