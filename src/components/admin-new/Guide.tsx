import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Package, ShoppingCart, Calculator, Users, Settings, Truck } from "lucide-react"
import { cn } from "@/src/lib/utils"

const guideItems = [
  {
    id: "products",
    icon: <Package className="h-5 w-5" />,
    title: "პროდუქციის მართვა",
    content: `
      <p><strong>პროდუქტის დამატება:</strong></p>
      <ol>
        <li>გადადით "პროდუქცია" სექციაში</li>
        <li>დააჭირეთ "+ დამატება" ღილაკს</li>
        <li>შეავსეთ სავალდებულო ველები: დასახელება, ფასი, კატეგორია</li>
        <li>ატვირთეთ პროდუქტის სურათები</li>
        <li>დააჭირეთ "შენახვა"</li>
      </ol>
      <p><strong>აქციის დაყენება:</strong></p>
      <ul>
        <li>რედაქტირების რეჟიმში მონიშნეთ "პროდუქტი აქციაზეა"</li>
        <li>მიუთითეთ ფასდაკლების პროცენტი ან აქციის ფასი</li>
        <li>დააყენეთ აქციის ვადა (არასავალდებულო)</li>
      </ul>
    `,
  },
  {
    id: "orders",
    icon: <ShoppingCart className="h-5 w-5" />,
    title: "შეკვეთების მართვა",
    content: `
      <p><strong>შეკვეთის სტატუსები:</strong></p>
      <ul>
        <li><span style="color: #f59e0b;">● ახალი</span> - ახალი შეკვეთა, ელოდება დადასტურებას</li>
        <li><span style="color: #3b82f6;">● მუშავდება</span> - შეკვეთა დადასტურებულია და მზადდება</li>
        <li><span style="color: #6366f1;">● გაგზავნილი</span> - შეკვეთა გაიგზავნა მომხმარებელთან</li>
        <li><span style="color: #10b981;">● დასრულებული</span> - მომხმარებელმა მიიღო შეკვეთა</li>
        <li><span style="color: #ef4444;">● გაუქმებული</span> - შეკვეთა გაუქმდა</li>
      </ul>
      <p><strong>PDF ქვითარი:</strong></p>
      <p>შეკვეთის დეტალებში დააჭირეთ "PDF ქვითარი" ღილაკს ჩამოსატვირთად.</p>
    `,
  },
  {
    id: "pos",
    icon: <Truck className="h-5 w-5" />,
    title: "შოურუმი (POS)",
    content: `
      <p><strong>გაყიდვის პროცესი:</strong></p>
      <ol>
        <li>აირჩიეთ პროდუქტები კატალოგიდან</li>
        <li>შეავსეთ მომხმარებლის ინფორმაცია</li>
        <li>აირჩიეთ გადახდის მეთოდი</li>
        <li>დააჭირეთ "გაყიდვის დასრულება"</li>
      </ol>
      <p><strong>გადახდის მეთოდები:</strong></p>
      <ul>
        <li>💵 ნაღდი ფული</li>
        <li>💳 საბანკო ბარათი</li>
        <li>📅 განვადება (+საკომისიო)</li>
        <li>🏦 საბანკო გადარიცხვა</li>
      </ul>
    `,
  },
  {
    id: "accounting",
    icon: <Calculator className="h-5 w-5" />,
    title: "ბუღალტერია",
    content: `
      <p><strong>ძირითადი მოდულები:</strong></p>
      <ul>
        <li><strong>დეშბორდი</strong> - ფინანსური მიმოხილვა და KPI-ები</li>
        <li><strong>ჟურნალი</strong> - ბუღალტრული გატარებები</li>
        <li><strong>ინვოისები</strong> - გაყიდვების და შესყიდვების ინვოისები</li>
        <li><strong>მარაგი</strong> - პროდუქციის მარაგის მართვა</li>
        <li><strong>დღგ</strong> - დღგ-ს ანგარიშგება</li>
        <li><strong>HR/ხელფასი</strong> - თანამშრომლების ხელფასები</li>
        <li><strong>RS.ge</strong> - ზედნადებების მართვა</li>
      </ul>
    `,
  },
  {
    id: "team",
    icon: <Users className="h-5 w-5" />,
    title: "გუნდის მართვა",
    content: `
      <p><strong>როლები:</strong></p>
      <ul>
        <li><strong>ადმინისტრატორი</strong> - სრული წვდომა ყველა ფუნქციაზე</li>
        <li><strong>კონსულტანტი</strong> - პროდუქციის, აქციების, შეკვეთების და შოურუმის წვდომა</li>
        <li><strong>ბუღალტერი</strong> - ბუღალტრული მოდულების და შეკვეთების წვდომა</li>
      </ul>
      <p><strong>ახალი წევრის მოწვევა:</strong></p>
      <ol>
        <li>დააჭირეთ "+ მოწვევა" ღილაკს</li>
        <li>შეიყვანეთ ელ. ფოსტა</li>
        <li>აირჩიეთ როლი</li>
        <li>მოწვევის ბმული გაიგზავნება მითითებულ მისამართზე</li>
      </ol>
    `,
  },
  {
    id: "settings",
    icon: <Settings className="h-5 w-5" />,
    title: "პარამეტრები",
    content: `
      <p><strong>დღგ-ს გადამხდელი:</strong></p>
      <p>ჩართვისას 18% დღგ ავტომატურად გამოიანგარიშება ყველა გაყიდვაზე.</p>
      
      <p><strong>განვადების საკომისიო:</strong></p>
      <p>მიუთითეთ პროცენტი, რომელიც დაემატება განვადებით გადახდისას. ნაგულისხმევად: 5%</p>
    `,
  },
]

export function Guide() {
  const [openItems, setOpenItems] = useState<string[]>(["products"])

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      {guideItems.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="rounded-2xl border border-border/50 bg-card overflow-hidden"
        >
          <button
            onClick={() => toggleItem(item.id)}
            className="flex w-full items-center gap-4 p-6 text-left transition-colors hover:bg-muted/50"
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              openItems.includes(item.id)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}>
              {item.icon}
            </div>
            <span className="flex-1 text-lg font-semibold text-foreground">{item.title}</span>
            <motion.div
              animate={{ rotate: openItems.includes(item.id) ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </button>

          <AnimatePresence>
            {openItems.includes(item.id) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div
                  className="border-t border-border/50 px-6 py-6 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )
}
