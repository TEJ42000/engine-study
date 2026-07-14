"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────
type ToastKind = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────
const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(Ctx);
}

// ─── Provider + Renderer ────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onClose={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </Ctx.Provider>
  );
}

// ─── Individual Toast ────────────────────────────────────────────────────────
const KIND_STYLES: Record<ToastKind, string> = {
  success: "bg-zinc-900 text-white border-zinc-700",
  error: "bg-red-600 text-white border-red-500",
  info: "bg-blue-600 text-white border-blue-500",
};

const KIND_ICON: Record<ToastKind, string> = {
  success: "✓",
  error: "✕",
  info: "i",
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so the CSS transition fires
    const t = setTimeout(() => setVisible(true), 10);

    // Auto-dismiss after 3.5s
    const dismissT = setTimeout(onClose, 3500);

    return () => {
      clearTimeout(t);
      clearTimeout(dismissT);
    };
  }, [onClose]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium max-w-sm transition-all duration-300 ${
        KIND_STYLES[toast.kind]
      } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <span className="text-xs font-bold opacity-80">{KIND_ICON[toast.kind]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100 transition-opacity ml-1 text-base leading-none"
      >
        ×
      </button>
    </div>
  );
}
