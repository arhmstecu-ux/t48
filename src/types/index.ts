export interface User {
  id: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  isBlacklisted: boolean;
  createdAt: string;
  profilePhoto?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Purchase {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  date: string;
  status: 'pending' | 'confirmed' | 'completed';
  paymentMethod: 'qris' | 'dana' | 'gopay';
}

export interface Review {
  id: string;
  userId: string;
  username: string;
  productId: string;
  productName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ReplayVideo {
  id: string;
  title: string;
  youtubeUrl: string;
  password: string;
  addedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'show' | 'vc' | 'other';
}
