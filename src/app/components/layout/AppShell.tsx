import { Outlet } from 'react-router';
import { TopNav } from './TopNav';
import { ChatBot } from '../ChatBot';
import { CommandPalette } from '../CommandPalette';

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <TopNav />
      <main className="pt-16 min-h-screen">
        <Outlet />
      </main>
      <ChatBot />
      <CommandPalette />
    </div>
  );
}
