import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, clearAuthCookies } from "@/services/auth";
import { toast } from "sonner";
import { useCsrfToken } from "@/services/auth";
import ReactGa from 'react-ga4';
import Footer from "@/components/global/footer";

// Define the login schema with Zod
const loginSchema = z.object({
  email: z.string()
    .min(1, "Roll number is required"),
  password: z.string().min(1, "Password is required")
});

type LoginFormValues = z.infer<typeof loginSchema>;

const carouselImages = [
  "/images/banner-1.jpg",
  "/images/banner-2.jpg",
  "/images/banner-3.jpg"
];

export default function Login() {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);

  useCsrfToken();

  useEffect(() => {
    ReactGa.send({
      hitType: "Login Page",
      page: "/login",
      title: "Teacher Selection App",
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        const newIndex = prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1;
        setNextImageIndex(newIndex === carouselImages.length - 1 ? 0 : newIndex + 1);
        return newIndex;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const { mutate, isPending } = useLogin((result) => {

    if (result?.status === 200) {
      if (result.user_type === 'student') {
        toast.success("Login successful! Welcome back.");
        navigate("/");
      } else {
        clearAuthCookies().then(() => {
          toast.error("Access denied. Please contact your HOD for more info.");
        });
      }
    } else {
      const errorMessage = typeof result?.detail === 'string' ? result.detail : 'Login failed';
      const errorCode = result?.code;
      const blockWarning = result?.block_warning;
      const remainingAttempts = result?.remaining_attempts;
      switch (errorCode) {
        case 'missing_credentials':
          toast.error("Please enter both email and password.");
          break;
        case 'account_inactive':
          toast.error("Your account is not active. Please verify your email first.");
          break;
        case 'invalid_password': {
          let msg = "Incorrect password.";
          if (typeof remainingAttempts === 'number' && blockWarning) {
            msg += ` ${remainingAttempts} more attempt${remainingAttempts === 1 ? '' : 's'} till blocked for ${blockWarning.match(/\d+/)?.[0] || ''} seconds.`;
          } else if (typeof remainingAttempts === 'number') {
            msg += ` ${remainingAttempts} more attempt${remainingAttempts === 1 ? '' : 's'} till blocked.`;
          }
          toast.error(msg);
          break;
        }
        case 'user_not_found': {
          let msg = "No account found with this email.";
          if (typeof remainingAttempts === 'number' && blockWarning) {
            msg += ` ${remainingAttempts} more attempt${remainingAttempts === 1 ? '' : 's'} till blocked for ${blockWarning.match(/\d+/)?.[0] || ''} seconds.`;
          } else if (typeof remainingAttempts === 'number') {
            msg += ` ${remainingAttempts} more attempt${remainingAttempts === 1 ? '' : 's'} till blocked.`;
          }
          toast.error(msg);
          break;
        }
        case 'login_not_allowed': {
          let msg = errorMessage;
          if (typeof remainingAttempts === 'number' && blockWarning) {
            msg += ` ${remainingAttempts} more attempt${remainingAttempts === 1 ? '' : 's'} till blocked for ${blockWarning.match(/\d+/)?.[0] || ''} seconds.`;
          } else if (typeof remainingAttempts === 'number') {
            msg += ` ${remainingAttempts} more attempt${remainingAttempts === 1 ? '' : 's'} till blocked.`;
          }
          toast.error(msg);
          break;
        }
        case 'blocked': {
          let msg = errorMessage;
          if (blockWarning) {
            msg += ` (${blockWarning})`;
          }
          toast.error(msg);
          break;
        }
        case 'server_error':
          toast.error("An unexpected error occurred. Please try again later.");
          break;
        default: {
          let msg = errorMessage;
          if (blockWarning) {
            msg += ` (${blockWarning})`;
          }
          toast.error(msg);
        }
      }
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const emailData = {
        ...data,
        email: `${data.email}`
      };
      
      mutate(emailData, {
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.detail || error?.message;
          const errorCode = error?.response?.data?.code;

          if (errorCode === 'network_error') {
            toast.error("Network error. Please check your internet connection.");
          } else {
            toast.error(errorMessage || "An error occurred during login. Please try again.");
          }
        }
      });
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative w-full">
      {/* Carousel Section */}
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

      {/* Login Form Section */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-20">
        <Card className="w-full max-w-md shadow-lg bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-4">
            <img
              src="/images/rec_logo.png"
              alt="REC Hostel Logo"
              className="w-60 h-24 mx-auto object-contain"
            />
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">Student Login</CardTitle>
              <CardDescription className="text-base">
                Enter your credentials
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email ID</Label>
                <div className="flex items-center">
                  <Input
                    id="email"
                    type="text"
                    placeholder="College Email-Id"
                    className="h-11 rounded-r-none"
                    {...register("email")}
                  />
                  {/* <div className="h-11 px-3 flex items-center bg-muted border border-l-0 rounded-r-md">
                    @rajalakshmi.edu.in
                  </div> */}
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-base">Password</Label>
                  <a href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  className="h-11"
                  placeholder="Password"
                  showPasswordToggle
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 mt-4">
                  <Button type="submit" className="w-full h-11 text-base hover:cursor-pointer" disabled={isPending}>
                    {isPending ? "Signing in..." : "Sign in"}
                  </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Footer */}
      <div className="relative z-20">
        <Footer transparent />
      </div>
    </div>
  );
} 