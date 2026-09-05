"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, Loader2, ExternalLink, X } from "lucide-react";
import { NETWORKS } from "@/lib/constants";

export type ToastType = "success" | "error" | "info" | "loading";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  txHash?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => string;
  dismissToast: (id: string) => void;
  success: (title: string, message?: string, txHash?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  loading: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, txHash, duration = 6000 }: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, txHash, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0 && type !== "loading") {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const success = useCallback(
    (title: string, message?: string, txHash?: string) => {
      return showToast({ type: "success", title, message, txHash });
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      return showToast({ type: "error", title, message });
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      return showToast({ type: "info", title, message });
    },
    [showToast]
  );

  const loading = useCallback(
    (title: string, message?: string) => {
      return showToast({ type: "loading", title, message, duration: 0 });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        success,
        error,
        info,
        loading,
      }}
    >
      {children}

      {/* Top-Right Notification Container */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="pointer-events-auto rounded-2xl bg-surface/95 p-4 shadow-2xl shadow-black/90 backdrop-blur-xl flex items-start gap-3 relative overflow-hidden"
            >
              {/* Type Accent Bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  toast.type === "success"
                    ? "bg-positive"
                    : toast.type === "error"
                    ? "bg-negative"
                    : toast.type === "loading"
                    ? "bg-accent"
                    : "bg-accent"
                }`}
              />

              {/* Icon */}
              <div className="shrink-0 mt-0.5 pl-1">
                {toast.type === "success" && (
                  <CheckCircle2 className="w-5 h-5 text-positive" />
                )}
                {toast.type === "error" && (
                  <AlertCircle className="w-5 h-5 text-negative" />
                )}
                {toast.type === "info" && (
                  <Info className="w-5 h-5 text-accent" />
                )}
                {toast.type === "loading" && (
                  <Loader2 className="w-5 h-5 text-accent animate-spin" />
                )}
              </div>

              {/* Content */}
              <div className="flex-grow min-w-0 pr-6">
                <h4 className="text-sm font-medium text-foreground tracking-tight leading-snug">
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">
                    {toast.message}
                  </p>
                )}

                {/* Optional Explorer Link for on-chain txs */}
                {toast.txHash && (
                  <a
                    href={`${NETWORKS.CREDITCOIN_TESTNET.explorer}/tx/${toast.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-accent hover:underline mt-2"
                  >
                    <span>View on Creditcoin Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => dismissToast(toast.id)}
                className="absolute top-3.5 right-3 text-faint hover:text-foreground transition-colors p-1 rounded-md"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
