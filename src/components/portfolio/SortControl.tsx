"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortMode } from "@/data/projects";

/**
 * "Sort By / Recent" control from the Work export — a real, functional
 * sort (Recent = latest activity first, Oldest = reverse).
 */
export function SortControl({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (mode: SortMode) => void;
}) {
  const label = value === "recent" ? "Recent" : "Oldest";
  return (
    <div className="flex items-center gap-2.5">
      <span id="sort-by-label" className="hidden text-[13px] text-soft sm:inline">
        Sort By
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Sort projects — currently ${label}`}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-medium text-ink transition-colors hover:bg-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:bg-badge"
        >
          {label}
          <ChevronDown className="h-4 w-4 text-soft" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[9rem] rounded-xl"
          aria-labelledby="sort-by-label"
        >
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(v) => onChange(v as SortMode)}
          >
            <DropdownMenuRadioItem value="recent" className="rounded-lg">
              Recent
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="oldest" className="rounded-lg">
              Oldest
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
