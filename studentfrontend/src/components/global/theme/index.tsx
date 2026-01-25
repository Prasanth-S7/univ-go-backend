import { useTheme } from '@/components/provider/theme-provider'
import { Moon, Sun, Laptop } from 'lucide-react'
import { useEffect } from 'react'

const SwitchTheme = () => {
    const { setTheme, theme } = useTheme()
    
    // Force update theme on selection
    const handleThemeChange = (selectedTheme: 'light' | 'dark' | 'system') => {
        // Apply theme directly to html element
        const html = document.documentElement;
        html.classList.remove('light', 'dark');
        
        if (selectedTheme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            html.classList.add(systemTheme);
        } else {
            html.classList.add(selectedTheme);
        }
        
        // Save theme to localStorage directly as fallback
        localStorage.setItem('vite-ui-theme', selectedTheme);
        
        // Update theme state
        setTheme(selectedTheme);
        
        // console.log("Theme changed to:", selectedTheme);
    };

    // Verify current theme on mount
    useEffect(() => {
        const currentTheme = localStorage.getItem('vite-ui-theme') as 'light' | 'dark' | 'system' || 'system';
        if (currentTheme !== theme) {
            // console.log("Theme mismatch, fixing...", {current: currentTheme, state: theme});
            handleThemeChange(currentTheme);
        }
    }, []);

    return (
        <div className="flex flex-wrap gap-2 mt-4">
            <ThemeButton 
                theme="light" 
                icon={<Sun className="h-5 w-5" />}
                isActive={theme === 'light'}
                onClick={() => handleThemeChange('light')}
            />
            
            <ThemeButton 
                theme="dark" 
                icon={<Moon className="h-5 w-5" />}
                isActive={theme === 'dark'}
                onClick={() => handleThemeChange('dark')}
            />
            
            <ThemeButton 
                theme="system" 
                icon={<Laptop className="h-5 w-5" />}
                isActive={theme === 'system'}
                onClick={() => handleThemeChange('system')}
            />
        </div>
    )
}

interface ThemeButtonProps {
    theme: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}

const ThemeButton = ({ theme, icon, isActive, onClick }: ThemeButtonProps) => {
    return (
        <button
            type="button"
            className={`
                px-4 py-3 rounded-md flex items-center gap-2 flex-1 justify-center
                ${isActive 
                    ? 'bg-primary text-primary-foreground font-medium border-2 border-primary' 
                    : 'bg-card border-2 border-muted hover:bg-muted/50'}
            `}
            onClick={onClick}
        >
            {icon}
            <span className="capitalize">{theme}</span>
        </button>
    );
};

export default SwitchTheme