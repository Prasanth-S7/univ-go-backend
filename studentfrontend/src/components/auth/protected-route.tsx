import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useCurrentUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";


interface ProtectedRouteProps {
  children: ReactNode;
  requireHOD?: boolean;
}

export function ProtectedRoute({ 
  children,   
}: ProtectedRouteProps) {
  const location = useLocation();
  const { data: user, isPending } = useCurrentUser();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);


  if (isPending || isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const currentUser = user as any;

  if (currentUser &&  user?.user?.user_type!== 'student') {
    return <Navigate to="/auth/login" state={{ message: "Only students can login" }} replace />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isPending || isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  // If not authenticated, render the public route
  return <>{children}</>;
} 