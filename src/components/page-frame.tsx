import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The logo fills the whole left gutter, so it ends exactly where the heading
 * starts. `72rem` and `1.5rem` are the `max-w-6xl` and `px-6` every page's
 * `<main>` uses, so the two stay aligned by arithmetic rather than by eye.
 *
 * The `9rem` floor is what keeps the logo readable once the gutter runs out.
 */
const GUTTER = { width: "max(9rem, calc((100% - 72rem) / 2 + 1.5rem))" };

/**
 * The window corners every page shares: the logo on the left, and whatever the
 * page wants on the right.
 *
 * From 1480px up the gutter is at least as wide as the logo's floor, so the row
 * leaves the flow and sits beside the page instead of pushing it down. Narrower
 * than that it would overlap the content, so there it stays an ordinary row
 * above it.
 */
export function PageFrame({
  children,
  belowLogo,
  aside,
}: {
  children: ReactNode;
  /** Sits under the logo, in the same gutter. */
  belowLogo?: ReactNode;
  /** Fills the right gutter. */
  aside?: ReactNode;
}) {
  return (
    <div className="relative">
      {/* Once absolute the row spans the full width, so it would sit on top of
          the controls below. Only its columns take clicks. */}
      <div className="pointer-events-none flex items-start justify-between gap-6 pt-6 min-[1480px]:absolute min-[1480px]:inset-x-0 min-[1480px]:top-0">
        {/* Padding rather than a width, so the logo still ends where the
            heading starts and only stops short of the gutter's own edges. */}
        <div className="pointer-events-auto shrink-0 px-8" style={GUTTER}>
          <Image
            src="/poe_logo.png"
            alt="Path of Exile"
            width={800}
            height={578}
            priority
            className="h-auto w-full"
          />
          {belowLogo}
        </div>

        {/* Same width as the logo's gutter, so what goes here stays clear of
            the content column instead of covering its top right. */}
        {aside && (
          <div className="pointer-events-auto shrink-0 px-4" style={GUTTER}>
            {aside}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
