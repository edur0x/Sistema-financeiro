import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ComboBoxOption {
  value: string;
  label?: string;
  meta?: string;
}

interface ComboBoxInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: ComboBoxOption) => void;
  options: ComboBoxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const ComboBoxInput: React.FC<ComboBoxInputProps> = ({
  value,
  onChange,
  onSelectOption,
  options,
  placeholder,
  disabled = false,
  className = '',
  ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setShowAll(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (showAll || !value.trim()) return options;
    const q = value.trim().toLowerCase();
    const matches = options.filter(
      (opt) =>
        opt.value.toLowerCase().includes(q) ||
        (opt.label && opt.label.toLowerCase().includes(q)) ||
        (opt.meta && opt.meta.toLowerCase().includes(q))
    );
    return matches.length > 0 ? matches : options;
  }, [options, value, showAll]);

  const handleChoose = (opt: ComboBoxOption) => {
    onChange(opt.value);
    if (onSelectOption) onSelectOption(opt);
    setOpen(false);
    setShowAll(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <input
          type="text"
          disabled={disabled}
          aria-label={ariaLabel}
          value={value}
          onFocus={() => {
            if (!disabled) {
              setShowAll(true);
              setOpen(true);
            }
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setShowAll(false);
            if (!disabled) setOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-2.5 pr-8 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-800 dark:focus:border-sky-500 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-900/60 ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setShowAll(true);
            setOpen((prev) => !prev);
          }}
          aria-label="Abrir lista de opções"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-40"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && !disabled && (
        <ul
          role="listbox"
          className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-lg text-xs"
        >
          {filteredOptions.map((opt) => {
            const isActive = opt.value.toLowerCase() === value.trim().toLowerCase();
            return (
              <li key={`${opt.value}-${opt.meta ?? ''}`}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleChoose(opt);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200 font-semibold'
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70'
                  }`}
                >
                  <span className="truncate">{opt.label ?? opt.value}</span>
                  {opt.meta && (
                    <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                      {opt.meta}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          <li className="border-t border-slate-100 dark:border-slate-700 px-3 py-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            Selecione na lista ou digite manualmente no campo
          </li>
        </ul>
      )}
    </div>
  );
};
