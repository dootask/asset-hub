"use client";

import { useMemo } from "react";
import { Sketch } from "@uiw/react-color";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DEFAULT_COLOR = "#2563eb";

function normalizeHexColor(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;

  const raw = match[1].toLowerCase();
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  }
  return `#${raw}`;
}

type Props = {
  id: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onValueChange: (next: string) => void;
  pickLabel?: string;
  clearLabel?: string;
  className?: string;
};

export default function ColorPickerInput({
  id,
  value,
  placeholder,
  disabled,
  onValueChange,
  pickLabel = "Pick",
  clearLabel = "Clear",
  className,
}: Props) {
  const normalized = useMemo(() => normalizeHexColor(value), [value]);
  const currentColor = normalized ?? DEFAULT_COLOR;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-start gap-2 px-3 font-mono text-xs",
              !value.trim() && "text-muted-foreground",
            )}
            aria-label={pickLabel}
          >
            <span
              aria-hidden
              className={cn("h-4 w-4 rounded-full border", !normalized && "bg-muted")}
              style={normalized ? { backgroundColor: normalized } : undefined}
            />
            {value.trim() ? value.trim() : pickLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Sketch
            className="rounded-b-none!"
            color={currentColor}
            disableAlpha
            onChange={(next: { hex: string }) => onValueChange(next.hex)}
          />
          <div className="flex items-center justify-between gap-2 py-1 pl-3 pr-1">
            <span className="text-xs font-mono text-muted-foreground">{currentColor}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onValueChange("")}>
              {clearLabel}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        className="flex-1 font-mono hidden"
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={() => {
          const normalizedOnBlur = normalizeHexColor(value);
          if (normalizedOnBlur && normalizedOnBlur !== value.trim()) {
            onValueChange(normalizedOnBlur);
          }
        }}
      />
    </div>
  );
}

