import type { Cart, CartItem } from '../../../types/api.js';

export function recalc(items: CartItem[]): { items: CartItem[]; itemCount: number; total: number } {
  let itemCount = 0;
  let total = 0;

  const updatedItems = items.map((item) => {
    const subtotal = item.price * item.quantity;
    itemCount += item.quantity;
    total += subtotal;
    return {
      ...item,
      subtotal,
    };
  });

  return {
    items: updatedItems,
    itemCount,
    total,
  };
}

export function withItemAdded(
  cart: Cart | undefined,
  product: { id: number; name: string; price: number; imageUrl: string; stock: number },
  quantity = 1,
): Cart {
  const currentItems = cart?.items ? [...cart.items] : [];
  const existingIndex = currentItems.findIndex((item) => item.productId === product.id);

  if (existingIndex >= 0) {
    const existing = currentItems[existingIndex]!;
    const newQty = existing.quantity + quantity;
    currentItems[existingIndex] = {
      ...existing,
      quantity: newQty,
      subtotal: existing.price * newQty,
      stock: product.stock,
    };
  } else {
    currentItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity,
      stock: product.stock,
      subtotal: product.price * quantity,
    });
  }

  const { items, itemCount, total } = recalc(currentItems);

  return {
    id: cart?.id ?? 0,
    items,
    itemCount,
    total,
  };
}

export function withQuantity(cart: Cart | undefined, productId: number, newQuantity: number): Cart {
  if (!cart) {
    return {
      id: 0,
      items: [],
      itemCount: 0,
      total: 0,
    };
  }

  if (newQuantity <= 0) {
    return withoutItem(cart, productId);
  }

  const updatedItems = cart.items.map((item) => {
    if (item.productId === productId) {
      return {
        ...item,
        quantity: newQuantity,
        subtotal: item.price * newQuantity,
      };
    }
    return item;
  });

  const { items, itemCount, total } = recalc(updatedItems);

  return {
    ...cart,
    items,
    itemCount,
    total,
  };
}

export function withoutItem(cart: Cart | undefined, productId: number): Cart {
  if (!cart) {
    return {
      id: 0,
      items: [],
      itemCount: 0,
      total: 0,
    };
  }

  const filteredItems = cart.items.filter((item) => item.productId !== productId);
  const { items, itemCount, total } = recalc(filteredItems);

  return {
    ...cart,
    items,
    itemCount,
    total,
  };
}
