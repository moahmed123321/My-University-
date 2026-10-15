import { cn } from "@/lib/utils";

export default function BrandMark({ className, compact = false }) {
  return (
    <img
      src="/my-university-logo.png"
      alt="My University"
      className={cn(compact ? "h-10 w-10 object-cover object-left" : "h-auto w-44", className)}
    />
  );
}
