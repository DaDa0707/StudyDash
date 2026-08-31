"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { SUBJECT_COLORS } from "@core/validation/timetable";

/** 科目の表示色を選ぶ（§5.1 表示色） */
export function ColorPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [color, setColor] = useState(defaultValue);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">表示色</legend>
      <input type="hidden" name={name} value={color} />
      <div role="radiogroup" aria-label="表示色" className="flex flex-wrap gap-2">
        {SUBJECT_COLORS.map((value) => {
          const selected = color.toLowerCase() === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`色 ${value}`}
              onClick={() => setColor(value)}
              style={{ backgroundColor: value }}
              className="flex size-11 items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {selected ? <Check className="size-5 text-white" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
