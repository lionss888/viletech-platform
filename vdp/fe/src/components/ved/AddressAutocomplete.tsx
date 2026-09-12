import { useEffect, useMemo, useRef, useState } from "react";

import { suggestAddresses } from "@/lib/ved/address-book";
import { cn } from "@/lib/utils";

type Props = {
  /** Имя поля для FormData родительской формы. */
  name: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  testId?: string;
  autoFocus?: boolean;
  /** Дополнительные адреса (например уже заведённых организаций). */
  knownAddresses?: readonly string[];
  onChange?: (value: string) => void;
};

/** Поле адреса с предиктивным набором по справочнику адресов. */
export function AddressAutocomplete({
  name,
  value,
  defaultValue = "",
  placeholder = "г. Москва, ул. Тверская, 1",
  testId = "address-autocomplete",
  autoFocus,
  knownAddresses = [],
  onChange,
}: Props) {
  const [inner, setInner] = useState(value ?? defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const text = value ?? inner;

  const options = useMemo(
    () => suggestAddresses(text, knownAddresses),
    [text, knownAddresses],
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function commit(next: string) {
    setInner(next);
    onChange?.(next);
  }

  function pick(next: string) {
    commit(next);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        name={name}
        value={text}
        placeholder={placeholder}
        className="field mt-1 w-full"
        data-testid={testId}
        autoComplete="off"
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(e) => {
          commit(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (!open || options.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % options.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + options.length) % options.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const chosen = options[active];
            if (chosen) pick(chosen);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && options.length > 0 && (
        <ul
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg"
          data-testid={`${testId}-options`}
          role="listbox"
        >
          {options.map((opt, i) => (
            <li key={opt}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={cn(
                  "w-full rounded px-2 py-2 text-left text-sm",
                  i === active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted",
                )}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(opt)}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
