import { create } from 'zustand';

/**
 * Toast notification interface
 */
export interface Toast {
  id: string;
  message: string;
  duration?: number; // Duration in milliseconds (default: 1000)
}

/**
 * Toast state interface
 */
interface ToastState {
  toasts: Toast[];
  showToast: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

/**
 * Toast store
 * Manages global toast notifications
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: (message, duration = 1000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, duration };

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
