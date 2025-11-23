"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toast, type ExternalToast } from "sonner";
import AppAlertDialog from "@/components/common/AppAlertDialog";

type AlertDialogAction = {
  label: string;
  onClick?: () => void;
  loading?: boolean;
};

type FeedbackDialogState = {
  open: boolean;
  title?: string;
  description?: string;
  variant?: "error" | "warning" | "info";
  primaryAction?: AlertDialogAction;
  secondaryAction?: AlertDialogAction;
  acknowledgeLabel?: string;
  onClose?: () => void;
};

type BlockingOptions = {
  blocking?: boolean;
  title?: string;
  description?: string;
  variant?: "error" | "warning" | "info";
  acknowledgeLabel?: string;
  primaryAction?: AlertDialogAction;
  secondaryAction?: AlertDialogAction;
  onClose?: () => void;
  toastOptions?: ExternalToast;
};

type AppFeedbackContextValue = {
  success: (message: string, options?: ExternalToast) => void;
  info: (message: string, options?: ExternalToast) => void;
  warning: (message: string, options?: ExternalToast) => void;
  error: (message: string, options?: BlockingOptions) => void;
};

const FeedbackContext = createContext<AppFeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<FeedbackDialogState>({
    open: false,
  });

  const closeDialog = useCallback(() => {
    setDialogState((prev) => {
      prev.onClose?.();
      return { ...prev, open: false };
    });
  }, []);

  const showBlockingDialog = useCallback(
    (message: string, options?: BlockingOptions) => {
      setDialogState({
        open: true,
        title: options?.title,
        description: options?.description ?? message,
        variant: options?.variant ?? "error",
        primaryAction: options?.primaryAction,
        secondaryAction: options?.secondaryAction,
        acknowledgeLabel: options?.acknowledgeLabel,
        onClose: options?.onClose,
      });
    },
    [],
  );

  const success = useCallback(
    (message: string, options?: ExternalToast) => toast.success(message, options),
    [],
  );
  const info = useCallback(
    (message: string, options?: ExternalToast) => toast.info(message, options),
    [],
  );
  const warning = useCallback(
    (message: string, options?: ExternalToast) => toast.warning(message, options),
    [],
  );
  const error = useCallback(
    (message: string, options?: BlockingOptions) => {
      if (options?.blocking) {
        showBlockingDialog(message, options);
        return;
      }
      toast.error(message, options?.toastOptions);
    },
    [showBlockingDialog],
  );

  const value = useMemo(
    () => ({
      success,
      info,
      warning,
      error,
    }),
    [success, info, warning, error],
  );

  const primaryAction = dialogState.primaryAction ?? {
    label: dialogState.acknowledgeLabel ?? "OK",
    onClick: closeDialog,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <AppAlertDialog
        open={dialogState.open}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
            return;
          }
          setDialogState((prev) => ({ ...prev, open: true }));
        }}
        title={
          dialogState.title ??
          (dialogState.variant === "warning"
            ? "Warning"
            : dialogState.variant === "info"
              ? "Notice"
              : "Error")
        }
        description={dialogState.description}
        variant={dialogState.variant ?? "error"}
        primaryAction={{
          ...primaryAction,
          onClick: () => {
            primaryAction.onClick?.();
            closeDialog();
          },
        }}
        secondaryAction={
          dialogState.secondaryAction
            ? {
                ...dialogState.secondaryAction,
                onClick: () => {
                  dialogState.secondaryAction?.onClick?.();
                  closeDialog();
                },
              }
            : undefined
        }
      />
    </FeedbackContext.Provider>
  );
}

export function useAppFeedback(): AppFeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useAppFeedback must be used within a FeedbackProvider");
  }
  return ctx;
}
