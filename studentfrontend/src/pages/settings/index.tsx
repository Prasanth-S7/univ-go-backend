import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/provider/theme-provider";
import SwitchTheme from "@/components/global/theme";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  PaletteIcon, 
  AccessibilityIcon,
  CheckCircle2
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useAllowedLoginStatus, clearAuthCookies } from "@/services/auth";
import { useLocation } from "react-router-dom";

const Setting = () => {
    const { theme } = useTheme();
    const { data: user } = useCurrentUser();
    const location = useLocation();
    
    // Accessibility settings
    const [accessibilitySettings, setAccessibilitySettings] = useState({
      highContrast: false,
      largerText: false,
      reducedMotion: false,
      screenReader: false
    });
    
    // Handle accessibility toggle
    const handleAccessibilityToggle = (setting: keyof typeof accessibilitySettings) => {
      setAccessibilitySettings(prev => ({
        ...prev,
        [setting]: !prev[setting]
      }));
      
      toast.success("Accessibility setting updated", {
        description: `${setting} ${!accessibilitySettings[setting] ? "enabled" : "disabled"}`,
        icon: <CheckCircle2 className="h-4 w-4" />
      });
      
      // Apply accessibility changes
      if (setting === 'highContrast') {
        document.documentElement.classList.toggle('high-contrast', !accessibilitySettings.highContrast);
      }
      if (setting === 'largerText') {
        document.documentElement.classList.toggle('larger-text', !accessibilitySettings.largerText);
      }
    };

    const { data: isLoginAllowed } = useAllowedLoginStatus();

    useEffect(() => {
      if (isLoginAllowed === false) {
        clearAuthCookies();
        window.location.href = "/auth/login?reason=not-allowed";
      }
    }, [isLoginAllowed]);

    return (
        <div className="mx-auto space-y-6">
            <Tabs defaultValue="appearance" className="w-full">
                <TabsList className="grid grid-cols-2 mb-6">
                    <TabsTrigger value="appearance" className="flex items-center gap-2">
                        <PaletteIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Appearance</span>
                    </TabsTrigger>
                    <TabsTrigger value="accessibility" className="flex items-center gap-2">
                        <AccessibilityIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Accessibility</span>
                    </TabsTrigger>
                </TabsList>
                
                {/* Appearance Tab */}
                <TabsContent value="appearance">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PaletteIcon className="h-5 w-5" />
                                Appearance
                            </CardTitle>
                            <CardDescription>Customize how the application looks</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-base font-medium mb-2 inline-block">Theme Mode</Label>
                                    <SwitchTheme />
                                </div>
                                <div className="bg-muted/50 p-3 rounded-md text-sm">
                                    <p className="text-muted-foreground">
                                        {theme === "light" && "Light theme is currently active."}
                                        {theme === "dark" && "Dark theme is currently active."}
                                        {theme === "system" && "System preference theme is currently active."}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                {/* Accessibility Tab */}
                <TabsContent value="accessibility">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AccessibilityIcon className="h-5 w-5" />
                                Accessibility
                            </CardTitle>
                            <CardDescription>Make the application more accessible for your needs</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="high-contrast">High Contrast</Label>
                                        <p className="text-sm text-muted-foreground">Enhance visual contrast for better readability</p>
                                    </div>
                                    <Switch 
                                        id="high-contrast" 
                                        checked={accessibilitySettings.highContrast}
                                        onCheckedChange={() => handleAccessibilityToggle('highContrast')}
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="larger-text">Larger Text</Label>
                                        <p className="text-sm text-muted-foreground">Increase the text size throughout the application</p>
                                    </div>
                                    <Switch 
                                        id="larger-text" 
                                        checked={accessibilitySettings.largerText}
                                        onCheckedChange={() => handleAccessibilityToggle('largerText')}
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="reduced-motion">Reduced Motion</Label>
                                        <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
                                    </div>
                                    <Switch 
                                        id="reduced-motion" 
                                        checked={accessibilitySettings.reducedMotion}
                                        onCheckedChange={() => handleAccessibilityToggle('reducedMotion')}
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="screen-reader">Screen Reader Optimization</Label>
                                        <p className="text-sm text-muted-foreground">Optimize for better screen reader compatibility</p>
                                    </div>
                                    <Switch 
                                        id="screen-reader" 
                                        checked={accessibilitySettings.screenReader}
                                        onCheckedChange={() => handleAccessibilityToggle('screenReader')}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Setting;