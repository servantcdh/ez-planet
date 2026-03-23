import React, { createContext, useContext } from "react";

import { create } from "zustand";

export type ModalRenderable = React.ReactNode | React.ComponentType<unknown>;

export type ModalSize = "lg" | "md" | "sm" | "xs";

export interface ModalViewConfig {
  header?: ModalRenderable;
  body: ModalRenderable;
  footer?: ModalRenderable;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  size?: ModalSize;
}

export interface ResolvedModalConfig extends ModalViewConfig {
  closeOnBackdrop: boolean;
  closeOnEsc: boolean;
  size: ModalSize;
}

const DEFAULT_MODAL_VALUES: Pick<
  ResolvedModalConfig,
  "closeOnBackdrop" | "closeOnEsc" | "size"
> = {
  closeOnBackdrop: false,
  closeOnEsc: true,
  size: "md",
};

function applyModalDefaults(config: ModalViewConfig): ResolvedModalConfig {
  return {
    ...DEFAULT_MODAL_VALUES,
    ...config,
    closeOnBackdrop:
      config.closeOnBackdrop ?? DEFAULT_MODAL_VALUES.closeOnBackdrop,
    closeOnEsc: config.closeOnEsc ?? DEFAULT_MODAL_VALUES.closeOnEsc,
    size: config.size ?? DEFAULT_MODAL_VALUES.size,
  };
}

interface ModalInstance {
  id: string;
  config: ResolvedModalConfig;
}

interface ModalState {
  modals: ModalInstance[];
  openModal: (config: ModalViewConfig) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  modals: [],

  openModal: (config) => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const resolvedConfig = applyModalDefaults(config);
    const instance: ModalInstance = { id, config: resolvedConfig };
    set((state) => ({ modals: [...state.modals, instance] }));
    return id;
  },

  closeModal: (id) => {
    let onClose: (() => void) | undefined;
    set((state) => {
      const targetModal = state.modals.find((modal) => modal.id === id);
      if (!targetModal) return state;
      onClose = targetModal.config.onClose;
      return { modals: state.modals.filter((modal) => modal.id !== id) };
    });
    onClose?.();
  },

  closeAllModals: () => {
    const callbacks: Array<() => void> = [];
    set((state) => {
      state.modals.forEach((modal) => {
        if (modal.config.onClose) callbacks.push(modal.config.onClose);
      });
      return { modals: [] };
    });
    callbacks.forEach((callback) => callback());
  },
}));

// Modal Context
interface ModalContextValue {
  close: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export const ModalProvider = ModalContext.Provider;

export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return context;
};
