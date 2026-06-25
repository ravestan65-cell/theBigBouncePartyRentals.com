import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quliykryvfhhwclkbhnf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bGl5a3J5dmZoaHdjbGtiaG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNTUyNzYsImV4cCI6MjA4OTYzMTI3Nn0.1AymurP-ppueyQOlQl6tlqhAZLCmtat7N6GoHjAYL-M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ProductImage {
  url: string;
  alt: string;
  is_primary: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  daily_price: number;
  buy_price: number;
  description: string;
  short_description: string;
  dimensions: string;
  length: string;
  width: string;
  height: string;
  weight: string | null;
  age_range: string;
  capacity: string;
  sku: string;
  badge: string | null;
  features: string[];
  included_items: string[];
  images: ProductImage[];
  variations: any[];
  is_active: boolean;
  sort_order: number;
  category?: Category;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .single();
  if (!cat) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('category_id', cat.id)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data;
}

// Pricing model:
//  - Customers pay a flat reservation deposit up-front to lock in a booking.
//  - The full daily rental price scales with the size/value of the item, kept
//    within a sensible band (small items ~$300/day, large items up to ~$600/day),
//    rounded to clean $50 increments. The stored `daily_price` is used as the
//    size proxy since larger items were already priced higher.
//  - The remaining balance (full price minus the deposit) is collected on delivery.
const RESERVATION_DEPOSIT = 150;
const MIN_DAILY_RENTAL = 300;
const MAX_DAILY_RENTAL = 600;

export function getReservationPrice(_product: Product): number {
  return RESERVATION_DEPOSIT;
}

export function getFullRentalPrice(product: Product): number {
  const scaled = Math.round((product.daily_price * 2) / 50) * 50;
  return Math.min(MAX_DAILY_RENTAL, Math.max(MIN_DAILY_RENTAL, scaled));
}

export function getBalanceDueOnDelivery(product: Product): number {
  return getFullRentalPrice(product) - getReservationPrice(product);
}

export function getPrimaryImage(product: Product): ProductImage | null {
  if (!product.images || product.images.length === 0) return null;
  return product.images.find(img => img.is_primary) || product.images[0];
}

export function getCategoryLabel(product: Product): string {
  return product.category?.name || '';
}

export function getCategorySlug(product: Product): string {
  return product.category?.slug || '';
}
