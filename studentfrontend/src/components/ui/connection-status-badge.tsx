import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Loader2, Circle } from "lucide-react";

interface ConnectionStatusBadgeProps {
  status: "idle" | "connecting" | "connected" | "closed";
  className?: string;
}

export function ConnectionStatusBadge({ status, className }: ConnectionStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "idle":
        return {
          icon: Circle,
          label: "Idle",
          variant: "outline" as const,
          iconColor: "text-gray-400",
          animate: false,
        };
      case "connecting":
        return {
          icon: Loader2,
          label: "Connecting",
          variant: "outline" as const,
          iconColor: "text-yellow-500",
          animate: true,
        };
      case "connected":
        return {
          icon: Wifi,
          label: "Connected",
          variant: "secondary" as const,
          iconColor: "text-green-600 dark:text-green-400",
          animate: false,
        };
      case "closed":
        return {
          icon: WifiOff,
          label: "Disconnected",
          variant: "destructive" as const,
          iconColor: "text-white",
          animate: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn("gap-1.5 px-2.5 py-1", className)}>
      <Icon 
        className={cn(
          "h-3.5 w-3.5", 
          config.iconColor,
          config.animate && "animate-spin"
        )} 
      />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  );
}
