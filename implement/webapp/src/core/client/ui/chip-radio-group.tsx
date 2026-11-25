"use client";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  testId: string;
};

/** Nhóm chip chọn một (radiogroup), VD chọn giọng rao. */
export function ChipRadioGroup<T extends string>({ options, value, onChange, label, disabled, testId }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} data-testid={testId} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            data-testid={`${testId}-${option.value}`}
            onClick={() => !selected && onChange(option.value)}
            className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
              selected ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
