import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { forgotPasswordApi } from "@/services/api";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm your password")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  // All hooks must be here, before any return
  const carouselImages = [
    "/images/banner-1.jpg",
    "/images/banner-2.jpg",
    "/images/banner-3.jpg"
  ];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await forgotPasswordApi.requestReset({ email: data.email, password: data.password });
      toast.success("Check your email for a verification link to reset your password.");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "An error occurred. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-full max-w-md shadow-lg bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a password reset link to your email. Please check your inbox and follow the instructions.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-4 mt-4">
            <Button onClick={() => navigate("/auth/login")}>Back to Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>Enter your email and new password to reset your account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input id="email" type="email" placeholder="College Email-Id" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">New Password</Label>
              <Input id="password" type="password" placeholder="New Password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="Confirm Password" {...register("confirmPassword")} />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 mt-4">
            <Button type="submit" className="w-full h-11 text-base hover:cursor-pointer">Send Reset Link</Button>
            <Button variant="link" type="button" onClick={() => navigate("/auth/login")}>Back to Login</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 