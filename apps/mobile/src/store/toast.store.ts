import { create } from 'zustand'

export type ToastType = 'info' | 'success' | 'error' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface ToastState {
  queue: ToastItem[]
  show: (message: string, type?: ToastType, duration?: number) => void
  dismiss: (id: string) => void
}

let _idCounter = 0

export const useToastStore = create<ToastState>((set) => ({
  queue: [],

  show: (message, type = 'info', duration = 3000) => {
    const id = String(++_idCounter)
    set((s) => ({ queue: [...s.queue, { id, message, type, duration }] }))

    setTimeout(() => {
      set((s) => ({ queue: s.queue.filter((t) => t.id !== id) }))
    }, duration + 500) // +500ms for exit animation
  },

  dismiss: (id) => {
    set((s) => ({ queue: s.queue.filter((t) => t.id !== id) }))
  },
}))

// Convenience singleton so non-component code can show toasts
export const toast = {
  info:    (msg: string, duration?: number) => useToastStore.getState().show(msg, 'info', duration),
  success: (msg: string, duration?: number) => useToastStore.getState().show(msg, 'success', duration),
  error:   (msg: string, duration?: number) => useToastStore.getState().show(msg, 'error', duration),
  warning: (msg: string, duration?: number) => useToastStore.getState().show(msg, 'warning', duration),
}
