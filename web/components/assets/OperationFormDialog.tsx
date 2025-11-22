"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import OperationForm from "@/components/assets/OperationForm";
import type { OperationTemplate } from "@/lib/types/operation-template";

type Props = {
  assetId: string;
  locale?: string;
  templates?: OperationTemplate[];
  trigger?: ReactNode;
};

export default function OperationFormDialog({
  assetId,
  locale = "en",
  templates = [],
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const isChinese = locale === "zh";

  const triggerNode =
    trigger ??
    (
      <Button className="mt-4 w-full rounded-full" variant="outline" size="sm">
        <Plus className="mr-2 h-4 w-4" />
        {isChinese ? "添加操作" : "Add Operation"}
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isChinese ? "新建资产操作" : "Create Asset Operation"}
          </DialogTitle>
          <DialogDescription>
            {isChinese
              ? "填写操作类型、经办人及模板字段，保存后即可刷新时间线。"
              : "Provide the operation details and submit to refresh the timeline."}
          </DialogDescription>
        </DialogHeader>
        <OperationForm
          assetId={assetId}
          locale={locale}
          templates={templates}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

