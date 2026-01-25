import { Outlet } from 'react-router-dom';
import Sidebar from './sidebar';
import Footer from './footer';
import { useState, useEffect } from 'react';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // for mobile
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // for desktop
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(false); // always expanded on mobile
      } else {
        setIsSidebarOpen(false); // close drawer on desktop
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sidebar toggle handler
  const handleSidebarToggle = () => {
    if (isMobile) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      {isMobile ? (
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile />
      ) : (
        <Sidebar isOpen={!isSidebarCollapsed} onClose={() => {}} collapsed={isSidebarCollapsed} />
      )}
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center border-b px-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSidebarToggle}
            className="rounded-full hover:bg-accent mr-3"
            aria-label="Toggle sidebar"
          >
            {isMobile ? (
              <Menu className="h-5 w-5" />
            ) : isSidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
          <div className="flex items-center gap-3">
              {/* <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Menu className="h-6 w-6 text-primary" />
              </div> */}
            <span className="font-bold text-lg tracking-tight">Student Portal</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-accent/5">
          <div className="max-w-8xl mx-auto bg-background rounded-lg shadow-sm p-4 md:p-6">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
} 