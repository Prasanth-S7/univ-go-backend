import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  User,
  Settings,
  Menu,
  X,
  LogOutIcon,
  Puzzle,
  SunIcon,
  MoonIcon,
  Building,
  Circle,
  Bus
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useTheme } from "@/components/provider/theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarProps {
  isOpen: boolean; // for mobile drawer
  onClose: () => void;
  collapsed?: boolean; // for desktop compact mode
  isMobile?: boolean; // to distinguish mobile rendering
}

const routes = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Teacher Selection",
    icon: Puzzle,
    href: "/teacher-selection",
  },
  {
    title: "My Timetable",
    icon: Calendar,
    href: "/timetable",
  },
  {
    title: "Free Rooms",
    icon: Building, // Using Building icon for rooms
    href: "/free-rooms",
  },
  {
    title: "Transport",
    icon: Bus,
    href: "/transport",
  },
  {
    title: "Notes",
    icon: Circle,
    href: "/notes",
  },
  // {
  //   title: "Profile",
  //   icon: User,
  //   href: "/profile",
  // },
  // {
  //   title: "Settings",
  //   icon: Settings,
  //   href: "/settings",
  // },
];

export default function Sidebar({ isOpen, onClose, collapsed = false, isMobile = false }: SidebarProps) {
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(false);
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024);
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast.success("Logged out successfully");
        navigate("/auth/login");
      },
      onError: (error: Error) => {
        toast.error("Logout failed", {
          description: error.message
        });
      }
    });
  };

  // Sidebar content for both desktop and mobile
  const sidebarContent = (
    <div className={cn("flex flex-col h-full justify-between", collapsed ? "items-center" : "")}>
      <div>
        <div className={cn(
          "flex items-center justify-between px-4 py-5 bg-background rounded-t-xl shadow-sm",
          collapsed ? "px-2 justify-center" : ""
        )}>
          <div className="flex-1 items-center gap-3">
            <div className={`h-10 w-full overflow-hidden flex items-center ${collapsed ? 'w-16' : ''}`}>
              <img
                src="/images/rec_logo.png"
                className={`block h-full object-cover object-left mx-auto`}
                alt="Logo"
              />
            </div>
            {/* {!collapsed && <span className="font-bold text-lg tracking-tight">Student Portal</span>} */}
          </div>
          {/* Show close button only on mobile */}
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <nav className={cn("flex-1 py-4")}> 
          {routes.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 transition-all w-full h-full font-heading text-sm border-dashed border-white/10 border-b",
                collapsed ? "justify-center px-2 py-3 w-12 h-12 mx-auto w-full" : "px-4 py-4",
                location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                  ? "bg-primary/10 text-primary shadow"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}
              onClick={isMobile ? onClose : undefined}
              title={collapsed ? item.title : undefined}
            >
              <item.icon className="h-5 w-5" />
              {!collapsed && item.title}
            </Link>
          ))}
        </nav>
      </div>
      
      <div>
        <div className={`p-2 border-t border-dashed flex ${collapsed? "flex-col-reverse": "flex-row"} justify-evenly`}>
            <Button onClick={handleLogout} variant='ghost' className="w-full font-normal text-sm space-x-4 hover:bg-destructive/20 hover:text-destructive">
              <LogOutIcon height={20} width={20} />
            </Button>
            <Button onClick={() => theme == 'dark'? setTheme('light'): setTheme('dark')} variant='ghost' className="w-full font-normal text-sm space-x-4">
              {
                theme == 'light'?
                <MoonIcon height={20} width={20} />
                :
                <SunIcon height={20} width={20} />
              }
            </Button>
        </div>
      </div>
    </div>
  );

  // Mobile: slide-in sidebar
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        )}
        <aside
          className={cn(
            "fixed left-0 top-0 h-full w-64 bg-background border-r shadow-xl z-40 flex flex-col transition-transform duration-300",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
          style={{ willChange: "transform" }}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: togglable/collapsed sidebar
  return (
    <aside
      className={cn(
        "h-full bg-background border-r border-dashed shadow-lg z-40 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {sidebarContent}
    </aside>
  );
} 