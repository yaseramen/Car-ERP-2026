"use client";

import { useState, useRef, useEffect } from "react";

export interface SearchableOption {
  id: string;
  label: string;
  searchText?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (id: string, option: SearchableOption | null) => void;
  placeholder?: string;
  addNewLabel?: string;
  onAddNew?: () => void;
  addNewFirst?: boolean;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "بحث أو اختر...",
  addNewLabel,
  onAddNew,
  addNewFirst = false,
  className = "",
  disabled = false,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);
  const searchLower = query.trim().toLowerCase();
  const filtered =
    searchLower.length === 0
      ? options
      : options.filter(
          (o) =>
            o.label.toLowerCase().includes(searchLower) ||
            (o.searchText && o.searchText.toLowerCase().includes(searchLower))
        );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={open ? query : selected?.label ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={className || "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"}
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 && !addNewLabel ? (
            <div className="px-4 py-3 text-gray-500 text-sm">لا توجد نتائج</div>
          ) : (
            <>
              {addNewFirst && addNewLabel && onAddNew && (
                <button
                  type="button"
                  onClick={() => {
                    onAddNew();
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full text-right px-4 py-2.5 text-emerald-600 hover:bg-emerald-50 font-medium text-sm border-b border-gray-100"
                >
                  {addNewLabel}
                </button>
              )}
              {filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id, opt);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`w-full text-right px-4 py-2.5 hover:bg-emerald-50 text-sm ${
                    opt.id === value ? "bg-emerald-50 text-emerald-700" : "text-gray-700"
                  }`}
                >
                  {opt.searchText ? `${opt.label} (${opt.searchText})` : opt.label}
                </button>
              ))}
              {!addNewFirst && addNewLabel && onAddNew && (
                <button
                  type="button"
                  onClick={() => {
                    onAddNew();
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full text-right px-4 py-2.5 text-emerald-600 hover:bg-emerald-50 font-medium text-sm border-t border-gray-100"
                >
                  {addNewLabel}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
