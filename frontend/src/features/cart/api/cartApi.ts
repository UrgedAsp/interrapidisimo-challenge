import { apiGet, apiSend } from '../../../api/apiClient.js';
import type { Cart, CheckoutResult } from '../../../types/api.js';

export async function getCartApi(): Promise<Cart> {
  return apiGet<Cart>('/cart');
}

export async function addCartItemApi(productId: number, quantity: number = 1): Promise<Cart> {
  return apiSend<Cart>('POST', '/cart/items', {
    body: { productId, quantity },
  });
}

export async function updateCartItemApi(productId: number, quantity: number): Promise<Cart> {
  return apiSend<Cart>('PATCH', `/cart/items/${productId}`, {
    body: { quantity },
  });
}

export async function removeCartItemApi(productId: number): Promise<Cart> {
  return apiSend<Cart>('DELETE', `/cart/items/${productId}`);
}

export async function checkoutApi(): Promise<CheckoutResult> {
  return apiSend<CheckoutResult>('POST', '/cart/checkout');
}
