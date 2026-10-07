import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNavigation } from './MobileNavigation';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-text-main transition-colors duration-300">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-60">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="px-4 pb-24 pt-7 sm:px-6 lg:px-10 lg:pb-10">
          <div className="mx-auto max-w-[1400px] animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
