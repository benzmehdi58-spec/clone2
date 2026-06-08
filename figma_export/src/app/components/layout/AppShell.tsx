import { Outlet } from 'react-router';
import { TopNav } from './TopNav';
import { ChatBot } from '../ChatBot';

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-[#F0F6FC]">
      <TopNav />
      <main className="pt-16 min-h-screen">
        <Outlet />
      </main>
      <ChatBot />
    </div>
  );
}
