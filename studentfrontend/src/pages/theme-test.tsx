import { useTheme } from "@/components/provider/theme-provider";
import { useEffect } from "react";

export default function ThemeTest() {
  const { theme, setTheme } = useTheme();
  
  useEffect(() => {
    console.log("Current theme:", theme);
    console.log("localStorage theme:", localStorage.getItem("vite-ui-theme"));
    console.log("HTML classes:", document.documentElement.className);
  }, [theme]);
  
  const testSetTheme = (newTheme: "light" | "dark" | "system") => {
    console.log("Setting theme to:", newTheme);
    setTheme(newTheme);
    setTimeout(() => {
      console.log("After change - theme:", theme);
      console.log("After change - localStorage:", localStorage.getItem("vite-ui-theme"));
      console.log("After change - HTML classes:", document.documentElement.className);
    }, 100);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Theme Test Page</h1>
      
      <div className="mb-4">
        <p>Current theme: <strong>{theme}</strong></p>
        <p>localStorage: <strong>{localStorage.getItem("vite-ui-theme") || "not set"}</strong></p>
        <p>HTML classes: <strong>{document.documentElement.className}</strong></p>
      </div>
      
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => testSetTheme("light")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Set Light
        </button>
        <button 
          onClick={() => testSetTheme("dark")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Set Dark
        </button>
        <button 
          onClick={() => testSetTheme("system")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Set System
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background border rounded">
          <h2 className="font-bold">Background</h2>
          <p className="text-foreground">Text color</p>
        </div>
        
        <div className="p-4 bg-card rounded">
          <h2 className="font-bold text-card-foreground">Card</h2>
          <p className="text-card-foreground">Card text</p>
        </div>
        
        <div className="p-4 bg-primary rounded">
          <h2 className="font-bold text-primary-foreground">Primary</h2>
          <p className="text-primary-foreground">Primary text</p>
        </div>
        
        <div className="p-4 bg-secondary rounded">
          <h2 className="font-bold text-secondary-foreground">Secondary</h2>
          <p className="text-secondary-foreground">Secondary text</p>
        </div>
      </div>
    </div>
  );
} 