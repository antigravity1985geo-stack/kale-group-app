export interface Product {
  id: string;
  name: string;
  category: string;
  images: string[];
  colors?: string[];
  price: number;
  description?: string;
  material?: string;
  warranty?: string;
  delivery?: string;
  manufacturing?: string;
  in_stock?: boolean;
  is_on_sale?: boolean;
  discount_percentage?: number;
  sale_price?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  created_at?: string;
}

export interface Category {
  id?: string;
  name: string;
  image: string;
  created_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  customer: CustomerInfo;
  paymentMethod: 'bog' | 'tbc' | 'credo';
  paymentType: 'full' | 'installment';
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'delivered';
  createdAt: string;
}

export interface CustomerInfo {
  customerType: 'physical' | 'legal';
  personalId?: string;
  companyId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  note?: string;
}
