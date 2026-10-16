import { cn } from "@/lib/utils";

export default function BrandMark({ className, compact = false }) {
  return (
    <img
      src={compact ? "/icon.png" : "/my-university-logo.png"}
      alt="My University"
      className={cn(compact ? "h-9 w-9 object-contain rounded-lg" : "h-auto w-36", className)}
    />
  );
}
