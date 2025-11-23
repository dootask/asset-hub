"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Variant = "error" | "warning" | "info";

type ActionConfig = {
  label: string;
  onClick?: () => void;
  loading?: boolean;
};

type AppAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: Variant;
  primaryAction: ActionConfig;
  secondaryAction?: ActionConfig;
};

export default function AppAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "info",
  primaryAction,
  secondaryAction,
}: AppAlertDialogProps) {
  const accentClass =
    variant === "error"
      ? "text-destructive"
      : variant === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-primary";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={accentClass}>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {secondaryAction ? (
            <AlertDialogCancel onClick={secondaryAction.onClick} disabled={secondaryAction.loading}>
              {secondaryAction.label}
            </AlertDialogCancel>
          ) : null}
          <AlertDialogAction
            onClick={primaryAction.onClick}
            disabled={primaryAction.loading}
          >
            {primaryAction.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
