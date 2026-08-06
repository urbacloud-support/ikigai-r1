import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Menu, CalendarDays, TrendingUp, Users, UserCheck, Rocket, Mail } from "lucide-react";

export default function AdminLayout() {
  const location = useLocation();
  const path = location.pathname;
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Determine active tab based on URL path
  let activeTab = "events";
  if (path.includes("/progress") || path.includes("/event/")) activeTab = "progress";
  if (path.includes("/shortlist")) activeTab = "shortlist";
  if (path.includes("/users")) activeTab = "users";
  if (path.includes("/round2")) activeTab = "round2";
  if (path.includes("/mailing")) activeTab = "mailing";

  const navItems = [
    { id: "events", label: "Events", icon: CalendarDays, path: "/dashboard" },
    { id: "progress", label: "Progress", icon: TrendingUp, path: "/progress" },
    { id: "shortlist", label: "Shortlist", icon: UserCheck, path: "/shortlist" },
    { id: "round2", label: "Round 2", icon: Rocket, path: "/round2" },
    { id: "users", label: "Users", icon: Users, path: "/users" },
    { id: "mailing", label: "Mailing Service", icon: Mail, path: "/mailing" },
  ];

  return (
    <div className="flex flex-1 bg-gray-50 w-full overflow-hidden h-[calc(100vh-72px)] md:h-[calc(100vh-80px)]">
      
      {/* Sidebar - Collapsible */}
      <aside 
        className={`bg-white border-r border-gray-200 shadow-sm flex flex-col shrink-0 transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-20' : 'w-64'} hidden md:flex`}
      >
        {/* Sidebar Header (Toggle + Logo) */}
        <div className={`flex items-center pt-8 pb-6 ${isCollapsed ? 'flex-col gap-6' : 'px-6 gap-4'}`}>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 bg-white border border-pink-200 rounded-lg p-2.5 shadow-sm text-purple-700 hover:bg-pink-50 transition-colors"
            title="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
          
          <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'opacity-0 w-0 h-0' : 'opacity-100 w-auto h-auto'}`}>
            <h1 className="text-2xl font-black text-purple-800 tracking-tight">Admin</h1>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-2 mt-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <Link 
                key={item.id}
                to={item.path}
                title={isCollapsed ? item.label : ""}
                className={`flex items-center gap-4 py-3.5 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  isActive 
                    ? "bg-fuchsia-100/60 text-purple-800 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon size={20} className={`flex-shrink-0 ${isActive ? "text-purple-700" : "text-slate-400"}`} />
                
                <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
                  isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full min-w-0 flex flex-col relative">
        {/* We use h-screen and overflow-y-auto so nested pages that rely on full height (like EventDetails) work seamlessly */}
        <Outlet />
      </main>
    </div>
  );
}
