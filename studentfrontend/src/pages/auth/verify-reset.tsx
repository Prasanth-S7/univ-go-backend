import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { forgotPasswordApi } from "@/services/api";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function VerifyReset() {
  const navigate = useNavigate();
  const query = useQuery();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>("pending");
  const [message, setMessage] = useState("");
  const carouselImages = [
  "/images/banner-1.jpg",
  "/images/banner-2.jpg",
  "/images/banner-3.jpg"
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);

  useEffect(() => {
    const email = query.get("email");
    const token = query.get("token");
    if (!email || !token) {
      setStatus("error");
      setMessage("Invalid or missing verification link.");
      return;
    }
    forgotPasswordApi.verifyReset(email, token)
      .then(() => {
        setStatus("success");
        setMessage("Password reset successful! You can now log in.");
      })
      .catch((err: any) => {
        setStatus("error");
        setMessage(err?.response?.data?.detail || err?.message || "Invalid or expired verification link.");
      });
  }, [query]);

  return (
    <div className="flex h-screen items-center relative justify-center">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0">
          {carouselImages.map((image, index) => (
            <div
              key={image}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
            </div>
          ))}
        </div>
      </div>
      <Card className="w-full relative z-10 max-w-md shadow-lg bg-background/80 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-bold">{status === "success" ? "Success" : "Password Reset"}</CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-4 mt-4">
          <Button onClick={() => navigate("/auth/login")}>Back to Login</Button>
        </CardFooter>
      </Card>
    </div>
  );
} 