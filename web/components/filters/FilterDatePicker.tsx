"use client";

import { useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { enUS, zhCN } from "react-day-picker/locale";

interface Props {
  name: string;
  label: string;
  locale: string;
  defaultValue?: string;
}

export default function FilterDatePicker({
  name,
  label,
  locale,
  defaultValue,
}: Props) {
  const initialDate = useMemo(() => {
    if (!defaultValue) return undefined;
    const parsed = new Date(defaultValue);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, [defaultValue]);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Date | undefined>(initialDate);

  const formattedValue = value?.toISOString().slice(0, 10) ?? "";
  const placeholder = locale === "zh" ? "选择日期" : "Pick a date";
  const clearLabel = locale === "zh" ? "清除" : "Clear";

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="hidden"
        name={name}
        value={formattedValue}
        disabled={!value}
        readOnly
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-empty={!value}
            className={cn(
              "w-full justify-start rounded-2xl border bg-background/40 text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value
              ? value.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-2xl p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(nextDate) => {
              setValue(nextDate);
              setOpen(false);
            }}
            locale={locale === "zh" ? zhCN : enUS}
            captionLayout="dropdown"
            weekStartsOn={0}
            startMonth={new Date(new Date().getFullYear() - 5, 0)}
            endMonth={new Date(new Date().getFullYear() + 5, 11)}
          />
          {value && (
            <div className="border-t bg-muted/30 px-3 py-2 text-right">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setValue(undefined);
                  setOpen(false);
                }}
              >
                {clearLabel}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}


