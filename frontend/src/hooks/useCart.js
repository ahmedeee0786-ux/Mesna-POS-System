import { useState, useCallback } from 'react';

const TAX_RATE = 0.085;

export function useCart() {
  const [cartItems, setCartItems] = useState([]);
  const [discount, setDiscount] = useState(0);

  const addToCart = useCallback((product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQty = useCallback((productId, qty) => {
    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty < 1) return;
    setCartItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: parsedQty } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setDiscount(0);
  }, []);

  const subtotal = cartItems.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );
  const discountAmount = subtotal * (discount / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = discountedSubtotal * TAX_RATE;
  const total = discountedSubtotal + taxAmount;

  return {
    cartItems,
    discount,
    setDiscount,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    itemCount: cartItems.reduce((sum, i) => sum + i.quantity, 0),
  };
}
