import { cn } from "@/lib/utils";

export default function BrandMark({ className, compact = false }) {
  if (compact) {
    return (
      <img
        src="/icon.png"
        alt="My University"
        className={cn("h-9 w-9 object-contain rounded-lg", className)}
      />
    );
  }

  return (
    <>
      {/* Light mode logo */}
      <img
        src="/my-university-logo.png"
        alt="My University"
        className={cn("h-auto w-36 dark:hidden", className)}
      />
      {/* Dark mode logo */}
      <img
        src="/my-university-logo-dark.png"
        alt="My University"
        className={cn("h-auto w-36 hidden dark:block", className)}
      />
    </>
  );
}
