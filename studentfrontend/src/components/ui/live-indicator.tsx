import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  isLive: boolean;
  className?: string;
}

export function LiveIndicator({ isLive, className }: LiveIndicatorProps) {
  if (!isLive) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </div>
      <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
        Live
      </span>
    </div>
  );
}
