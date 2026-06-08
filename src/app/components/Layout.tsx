import { Outlet, NavLink, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  Bell, 
  Search, 
  BrainCircuit, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Play
} from "lucide-react";
import { useState } from "react";
import { cn } from "../utils/cn";

export function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Alerts", path: "/alerts", icon: Bell, badge: 3 },
    { name: "Explorer", path: "/explorer", icon: Search },
    { name: "Models", path: "/models", icon: BrainCircuit },
    { name: "Simulation", path: "/simulation", icon: Play },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "flex flex-col border-r border-border bg-card transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2 font-bold text-white">
              <ShieldAlert className="h-6 w-6 text-[#2F81F7]" />
              <span>CyberAI Agent</span>
            </div>
          )}
          {isCollapsed && (
            <ShieldAlert className="h-6 w-6 text-[#2F81F7] mx-auto" />
          )}
        </div>
        
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted group",
                isActive ? "bg-muted text-white" : "text-muted-foreground hover:text-foreground",
                isCollapsed && "justify-center px-0"
              )}
            >
              <item.icon className={cn("h-5 w-5", location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path)) ? "text-[#2F81F7]" : "")} />
              {!isCollapsed && <span className="flex-1">{item.name}</span>}
              {!isCollapsed && item.badge && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F85149] text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
              {isCollapsed && item.badge && (
                <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-[#F85149]" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-white"
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
          <div className="flex items-center gap-4">
            {/* Context title could go here if needed */}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3FB950] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#3FB950]"></span>
              </span>
              <span className="text-sm font-medium text-foreground">Agent Running</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center ring-2 ring-[#30363D]">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User Avatar" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
