import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

/**
 * Toast notification interface
 */
export interface Toast {
  id: string;
  message: string;
  type: ToastType; // <--- 新增 type 属性
  duration?: number;
}

/**
 * Toast state interface
 */
interface ToastState {
  toasts: Toast[];
   showToast: (payload: { message: string; type?: ToastType; duration?: number }) => void;
  removeToast: (id: string) => void;
}

/**
 * Toast store
 * Manages global toast notifications
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

 showToast: ({ message, type = 'info', duration = 3000 }) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
