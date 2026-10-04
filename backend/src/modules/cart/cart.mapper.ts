import type { Cart, CartItem } from '../../shared/types.js';

export type CartItemRow = {
  id: number;
  product_id: number;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  stock: number;
};

export function toCart(cartId: number, itemRows: CartItemRow[]): Cart {
  let itemCount = 0;
  let total = 0;

  const items: CartItem[] = itemRows.map((row) => {
    const subtotal = row.price * row.quantity;
    itemCount += row.quantity;
    total += subtotal;

    return {
      productId: row.product_id,
      name: row.name,
      price: row.price,
      imageUrl: row.image_url,
      quantity: row.quantity,
      stock: row.stock,
      subtotal,
    };
  });

  return {
    id: cartId,
    items,
    itemCount,
    total,
  };
}
