import type { Product, Category } from '../types/product';

export const categories: Category[] = [
  { name: 'სამზარეულო', image: 'https://images.unsplash.com/photo-1556910103-1c02745a872f?q=80&w=2070&auto=format&fit=crop' },
  { name: 'საძინებელი', image: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?q=80&w=2022&auto=format&fit=crop' },
  { name: 'მისაღები', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1974&auto=format&fit=crop' },
  { name: 'საოფისე', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=2070&auto=format&fit=crop' },
];

export const defaultProducts: Product[] = [
  {
    id: '043',
    name: 'მოდელი 043',
    category: 'სამზარეულო',
    price: 2900,
    description: 'თანამედროვე სამზარეულოს კომპლექტი, დამზადებული მაღალი ხარისხის MDF-ისგან. გამოირჩევა მინიმალისტური დიზაინით და ფუნქციონალურობით.',
    material: 'MDF / მუხა',
    warranty: '5 წელი',
    delivery: '7-14 დღე',
    manufacturing: 'ინდივიდუალური',
    in_stock: true,
    is_on_sale: false,
    images: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556910103-1c02745a872f?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=2070&auto=format&fit=crop'
    ]
  },
  {
    id: '042',
    name: 'მოდელი 042',
    category: 'საძინებელი',
    price: 3500,
    description: 'ელეგანტური საძინებლის კომპლექტი, რომელიც მოიცავს საწოლს, ტუმბოებს და კარადას. იდეალური კომფორტისა და სტილის შერწყმა.',
    material: 'მასიური მუხა',
    warranty: '7 წელი',
    delivery: '10-14 დღე',
    manufacturing: 'ინდივიდუალური',
    in_stock: true,
    is_on_sale: false,
    images: [
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=2057&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1505693314120-0d443867891c?q=80&w=2022&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=2070&auto=format&fit=crop'
    ]
  },
  {
    id: '041',
    name: 'მოდელი 041',
    category: 'მისაღები',
    price: 4200,
    description: 'ლუქსი მისაღების ავეჯის კომპლექტი — დივანი, მაგიდა და სათავსო. შექმნილი ფართო სივრცეებისთვის, პრემიუმ ხარისხის მასალებით.',
    material: 'ხავერდი / მუხა',
    warranty: '5 წელი',
    delivery: '7-10 დღე',
    manufacturing: 'ინდივიდუალური',
    in_stock: true,
    is_on_sale: false,
    images: [
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1581428982868-e410dd047a90?q=80&w=1974&auto=format&fit=crop'
    ]
  },
  {
    id: '040',
    name: 'მოდელი 040',
    category: 'საოფისე',
    price: 2200,
    description: 'პროფესიონალური საოფისე ავეჯი — მაგიდა, სკამი და შკაფი. ერგონომიული დიზაინი პროდუქტიულობისთვის.',
    material: 'ЛДСП / მეტალი',
    warranty: '3 წელი',
    delivery: '5-7 დღე',
    manufacturing: 'სტანდარტული',
    in_stock: true,
    is_on_sale: false,
    images: [
      'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?q=80&w=2069&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop'
    ]
  },
  {
    id: '039',
    name: 'მოდელი 039',
    category: 'სამზარეულო',
    price: 3100,
    description: 'კლასიკური სამზარეულოს გარნიტურა თეთრი ფასადებით. ჩაშენებული ტექნიკისთვის მომზადებული, მაქსიმალური სივრცის გამოყენება.',
    material: 'MDF / აკრილი',
    warranty: '5 წელი',
    delivery: '10-14 დღე',
    manufacturing: 'ინდივიდუალური',
    in_stock: true,
    is_on_sale: false,
    images: [
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556910103-1c02745a872f?q=80&w=2070&auto=format&fit=crop'
    ]
  },
  {
    id: '038',
    name: 'მოდელი 038',
    category: 'მისაღები',
    price: 2800,
    description: 'მოდერნული მისაღების კომპლექტი — კუთხის დივანი და ჟურნალის მაგიდა. კომპაქტური, მაგრამ ელეგანტური.',
    material: 'ტყავი / მუხა',
    warranty: '5 წელი',
    delivery: '7-10 დღე',
    manufacturing: 'ინდივიდუალური',
    in_stock: true,
    is_on_sale: false,
    images: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1974&auto=format&fit=crop'
    ]
  },
];
