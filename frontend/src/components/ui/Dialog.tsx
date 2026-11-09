import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  type LucideIcon,
} from "lucide-react";
import {
  DialogContext,
  type AlertOptions,
  type ConfirmOptions,
} from "./dialog-context";

type DialogState =
  | {
      kind: "confirm";
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | { kind: "alert"; options: AlertOptions; resolve: () => void }
  | null;

const ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  primary: { icon: HelpCircle, className: "bg-teal-100 text-teal-700" },
  info: { icon: Info, className: "bg-sky-100 text-sky-700" },
  success: {
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-600",
  },
  warning: { icon: AlertTriangle, className: "bg-amber-100 text-amber-700" },
  danger: { icon: AlertTriangle, className: "bg-red-100 text-red-600" },
};

const CONFIRM_BUTTONS: Record<string, string> = {
  primary: "btn-primary",
  danger: "btn-danger",
  success: "btn-success",
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setDialog({ kind: "confirm", options, resolve });
      }),
    [],
  );

  const alert = useCallback(
    (options: AlertOptions) =>
      new Promise<void>((resolve) => {
        setDialog({ kind: "alert", options, resolve });
      }),
    [],
  );

  const dismiss = useCallback(() => {
    setDialog((current) => {
      if (current?.kind === "confirm") current.resolve(false);
      if (current?.kind === "alert") current.resolve();
      return null;
    });
  }, []);

  const accept = useCallback(() => {
    setDialog((current) => {
      if (current?.kind === "confirm") current.resolve(true);
      if (current?.kind === "alert") current.resolve();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dialog, dismiss]);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <DialogCard dialog={dialog} onDismiss={dismiss} onAccept={accept} />
      )}
    </DialogContext.Provider>
  );
}

function DialogCard({
  dialog,
  onDismiss,
  onAccept,
}: {
  dialog: NonNullable<DialogState>;
  onDismiss: () => void;
  onAccept: () => void;
}) {
  const isConfirm = dialog.kind === "confirm";
  const variant = isConfirm
    ? dialog.options.variant || "primary"
    : dialog.options.variant || "info";
  const { icon: Icon, className: iconClass } = ICONS[variant] || ICONS.info;
  const confirmLabel = isConfirm
    ? dialog.options.confirmLabel || "Confirm"
    : dialog.options.confirmLabel || "OK";
  const cancelLabel = isConfirm ? dialog.options.cancelLabel || "Cancel" : "";
  const confirmClass = isConfirm
    ? CONFIRM_BUTTONS[dialog.options.variant || "primary"] || "btn-primary"
    : "btn-primary";

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        role={isConfirm ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        className="dialog-card w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}
          >
            <Icon size={20} strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              id="app-dialog-title"
              className="text-base font-bold text-gray-900"
            >
              {dialog.options.title}
            </h3>
            {dialog.options.message && (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {dialog.options.message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          {isConfirm && (
            <button type="button" className="btn-secondary" onClick={onDismiss}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={confirmClass}
            onClick={onAccept}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
