// Tipos del dominio frontend (duplicados intencionalmente del backend, ver overview §2)

export interface User {
  id: number;
  name: string;
  email: string;
  points: number;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
}

export interface Product {
  id: number;
  category_id: number;
  category_slug: string;
  category_name: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  rating: number;
}

export interface CartItem {
  id: number;
  product_id: number;
  name: string;
  price: number;
  image_url: string;
  stock: number;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface Favorite {
  id: number;
  product_id: number;
  name: string;
  price: number;
  image_url: string;
  rating: number;
  category_name: string;
  created_at: string;
}

export interface Order {
  orderId: number;
  total: number;
  pointsEarned: number;
  totalPoints: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details: unknown[];
}
