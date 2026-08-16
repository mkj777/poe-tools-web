import Image from "next/image";
import { cn } from "@/lib/utils";

const ORBS = {
  chaos: { src: "/Chaos_Orb_inventory_icon.png", label: "Chaos Orb" },
  divine: { src: "/Divine_Orb_inventory_icon.png", label: "Divine Orb" },
} as const;

export type CurrencyKind = keyof typeof ORBS;

/** The orb, the way a price is written in game — no "c", no "chaos". */
export function CurrencyIcon({
  currency = "chaos",
  size = 18,
  className,
}: {
  currency?: CurrencyKind;
  size?: number;
  className?: string;
}) {
  const orb = ORBS[currency];
  return (
    <Image
      src={orb.src}
      alt={orb.label}
      title={orb.label}
      width={size}
      height={size}
      className={cn("inline-block shrink-0", className)}
    />
  );
}

/** A price: the number, then the orb it is quoted in. */
export function Price({
  value,
  currency = "chaos",
  size = 18,
  className,
}: {
  value: number;
  currency?: CurrencyKind;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 align-middle tabular-nums whitespace-nowrap",
        className,
      )}
    >
      {value.toLocaleString("en-US", {
        minimumFractionDigits: value < 10 ? 1 : 0,
        maximumFractionDigits: value < 10 ? 1 : 0,
      })}
      <CurrencyIcon currency={currency} size={size} />
    </span>
  );
}
