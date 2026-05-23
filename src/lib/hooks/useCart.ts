import { useReducer, useCallback, useMemo } from "react";

export type CartItem = {
  product_id: string;       // composite key: "uuid" or "uuid|Topping1,Topping2"
  base_product_id: string;  // always the original product UUID
  name: string;             // display name, includes topping info
  price: number;            // unit price including topping cost
  quantity: number;
  toppings?: string[];
};

type CartState = { items: CartItem[] };

type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "quantity"> }
  | { type: "REMOVE_ITEM"; payload: { product_id: string } }
  | { type: "UPDATE_QUANTITY"; payload: { product_id: string; quantity: number } }
  | { type: "CLEAR_CART" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.product_id === action.payload.product_id);
      if (existing) {
        return { items: state.items.map((i) => i.product_id === action.payload.product_id ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { items: [...state.items, { ...action.payload, quantity: 1 }] };
    }
    case "REMOVE_ITEM":
      return { items: state.items.filter((i) => i.product_id !== action.payload.product_id) };
    case "UPDATE_QUANTITY": {
      const { product_id, quantity } = action.payload;
      if (quantity <= 0) return { items: state.items.filter((i) => i.product_id !== product_id) };
      return { items: state.items.map((i) => i.product_id === product_id ? { ...i, quantity } : i) };
    }
    case "CLEAR_CART":
      return { items: [] };
    default:
      return state;
  }
}

export function useCart() {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = useCallback((product: Omit<CartItem, "quantity">) => {
    dispatch({ type: "ADD_ITEM", payload: product });
  }, []);

  const removeItem = useCallback((product_id: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { product_id } });
  }, []);

  const updateQuantity = useCallback((product_id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { product_id, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const { subtotal, total, itemCount } = useMemo(() => {
    const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { subtotal, total: subtotal, itemCount: state.items.reduce((sum, item) => sum + item.quantity, 0) };
  }, [state.items]);

  return { items: state.items, addItem, removeItem, updateQuantity, clearCart, subtotal, total, itemCount };
}
