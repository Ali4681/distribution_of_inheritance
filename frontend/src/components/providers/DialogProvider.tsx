"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/components/providers/AppProvider";

type DialogTone = "danger" | "primary" | "neutral";

type ConfirmDialogOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
};

type AlertDialogOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: DialogTone;
};

type DialogState =
  | {
      kind: "confirm";
      title: string;
      description: string;
      confirmLabel: string;
      cancelLabel: string;
      tone: DialogTone;
    }
  | {
      kind: "alert";
      title: string;
      description: string;
      confirmLabel: string;
      tone: DialogTone;
    };

type DialogContextValue = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useApp();
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const closeDialog = useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolve?.(result);
  }, []);

  useEffect(() => {
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDialog(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialog, closeDialog]);

  const value = useMemo<DialogContextValue>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          resolverRef.current = resolve;
          setDialog({
            kind: "confirm",
            title: options.title,
            description: options.description,
            confirmLabel: options.confirmLabel ?? t.delete,
            cancelLabel: options.cancelLabel ?? t.cancel,
            tone: options.tone ?? "danger",
          });
        }),
      alert: (options) =>
        new Promise<void>((resolve) => {
          resolverRef.current = () => {
            resolve();
            return true;
          };
          setDialog({
            kind: "alert",
            title: options.title,
            description: options.description,
            confirmLabel: options.confirmLabel ?? t.ok,
            tone: options.tone ?? "primary",
          });
        }),
    }),
    [t],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}

      {dialog && typeof document !== "undefined"
        ? createPortal(
            <div
              className="app-dialog-backdrop"
              role="presentation"
              onClick={() => closeDialog(false)}
            >
              <div
                className={`app-dialog app-dialog--${dialog.tone}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="app-dialog-title"
                aria-describedby="app-dialog-description"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="app-dialog-orb" aria-hidden="true" />
                <div className="app-dialog-head">
                  <div className="app-dialog-icon" aria-hidden="true">
                    <Icon
                      name={dialog.tone === "danger" ? "trash" : "shield"}
                      size={18}
                    />
                  </div>
                  <div className="app-dialog-copy">
                    <p className="app-dialog-kicker">
                      {dialog.kind === "confirm" ? t.confirmAction : t.notice}
                    </p>
                    <h2 id="app-dialog-title" className="app-dialog-title">
                      {dialog.title}
                    </h2>
                  </div>
                </div>

                <p
                  id="app-dialog-description"
                  className="app-dialog-description"
                >
                  {dialog.description}
                </p>

                <div className="app-dialog-actions">
                  {dialog.kind === "confirm" ? (
                    <button
                      type="button"
                      className="app-dialog-btn app-dialog-btn--ghost"
                      onClick={() => closeDialog(false)}
                    >
                      {dialog.cancelLabel}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className={`app-dialog-btn app-dialog-btn--${dialog.tone}`}
                    onClick={() => closeDialog(true)}
                    autoFocus
                  >
                    {dialog.confirmLabel}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("useDialog must be used inside DialogProvider");
  }

  return context;
}
