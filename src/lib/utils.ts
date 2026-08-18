import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A number the way the game writes one: thousands split by a narrow space
 * rather than a comma, so 173 838 chaos reads as one number and not as a list.
 * The space is non-breaking, so a price never wraps mid-number.
 */
export function num(value: number | undefined, digits = 0) {
  return (value ?? 0)
    .toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    .replace(/,/g, "\u202f");
}
