import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Menu, Home, Users, Phone, HelpCircle, ChevronUp, ChevronDown, QrCode, Award, X } from "lucide-react";

export default function TeamLayout() {
  const location = useLocation();
  const path = location.pathname;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [missingPhotos, setMissingPhotos] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const email = sessionStorage.getItem("care_email");
        if (!email) return;
        const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
        const res = await fetch(`${API_BASE}/api/team/my-details?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.success && data.team && data.team.members) {
          const hasMissing = data.team.members.some(m => !m.photoUrl);
          setMissingPhotos(hasMissing);
          if (hasMissing) setShowModal(true);
        }
      } catch (err) {}
    };
    fetchTeam();
  }, [location.pathname]); // Re-fetch on navigation to update the dot


  let activeTab = "home";
  if (path.includes("/team/myteam")) activeTab = "myteam";
  else if (path.includes("/team/entry-pass")) activeTab = "entry-pass";
  else if (path.includes("/team/performance")) activeTab = "performance";

  const navItems = [
    { id: "home", label: "Home", icon: Home, path: "/team" },
    { id: "myteam", label: "My Team", icon: Users, path: "/team/myteam" },
    { id: "entry-pass", label: "Entry Pass", icon: QrCode, path: "/team/entry-pass" },
    { id: "performance", label: "Performance", icon: Award, path: "/team/performance" },
  ];

  return (
    <div className="flex flex-col md:flex-row flex-1 bg-gray-50 w-full overflow-hidden h-[calc(100vh-72px)] md:h-[calc(100vh-80px)] relative">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0 z-30">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-gray-600 bg-gray-50 rounded-lg border border-gray-200 active:bg-gray-100 transition-colors"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-black text-green-800 tracking-tight">Team Console</h1>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside 
        className={`bg-white border-r border-gray-200 shadow-sm flex flex-col shrink-0 transition-transform duration-300 ease-in-out fixed md:relative z-50 h-full md:h-auto ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20 w-64' : 'w-64'}`}
      >
        <div className={`flex items-center justify-between md:justify-start pt-6 md:pt-8 pb-6 px-6 ${isCollapsed ? 'md:flex-col md:gap-6 md:px-0' : 'gap-4'}`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex flex-shrink-0 bg-white border border-green-200 rounded-lg p-2.5 shadow-sm text-green-700 hover:bg-green-50 transition-colors"
            >
              <Menu size={20} />
            </button>
            
            <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'md:opacity-0 md:w-0 md:h-0' : 'opacity-100 w-auto h-auto'}`}>
              <h1 className="text-xl font-black text-green-800 tracking-tight">Team Console</h1>
            </div>
          </div>

          <button 
            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <Link 
                key={item.id}
                to={item.path}
                title={isCollapsed ? item.label : ""}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 py-3.5 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  isActive 
                    ? "bg-green-100/60 text-green-800 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                } ${isCollapsed ? 'md:justify-center' : ''}`}
              >
                <Icon size={20} className={`flex-shrink-0 ${isActive ? "text-green-700" : "text-slate-400"}`} />
                <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden relative ${isCollapsed ? 'md:opacity-0 md:w-0' : 'opacity-100 w-auto'}`}>
                  {item.label}
                  {item.id === "myteam" && missingPhotos && (
                    <span className="absolute -top-1 -right-3 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </span>
                {item.id === "myteam" && missingPhotos && isCollapsed && (
                   <span className="hidden md:block absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto w-full min-w-0 flex flex-col relative p-4 pb-24 md:p-6">
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full relative">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Action Required</h2>
              <p className="text-gray-600 mb-6">
                Kindly upload the image of each team member. This will be used for verification.
              </p>
              <button 
                onClick={() => setShowModal(false)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg transition"
              >
                Okay, I understand
              </button>
            </div>
          </div>
        )}
        <Outlet />
      </main>

      {/* Floating Contact Widget */}
      <div className="fixed bottom-4 left-4 right-4 md:right-auto md:bottom-6 md:left-6 z-[40] md:w-64 shadow-xl rounded-xl overflow-hidden border border-blue-200 max-w-[calc(100vw-2rem)] md:max-w-none">
        {showContact && (
          <div className="p-4 bg-white text-xs border-b border-blue-100 space-y-3 max-h-[50vh] overflow-y-auto">
            <div>
              <p className="font-bold text-gray-800">Aarti Jaiswal</p>
              <p className="text-gray-500 mb-1">Faculty Coordinator</p>
              <a href="tel:+918966883481" className="flex items-center gap-1.5 text-blue-600 font-semibold hover:underline">
                <Phone size={14} /> +91 89668 83481
              </a>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="font-bold text-gray-800">Anjali Khandelwal</p>
              <p className="text-gray-500 mb-1">Student Coordinator</p>
              <a href="tel:+919406920845" className="flex items-center gap-1.5 text-blue-600 font-semibold hover:underline">
                <Phone size={14} /> 9406920845
              </a>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="font-bold text-gray-800">Haripriya Gupta</p>
              <p className="text-gray-500 mb-1">Student Coordinator</p>
              <a href="tel:+918839117054" className="flex items-center gap-1.5 text-blue-600 font-semibold hover:underline">
                <Phone size={14} /> 8839117054
              </a>
            </div>
          </div>
        )}
        <button 
          onClick={() => setShowContact(!showContact)}
          className="w-full flex items-center justify-between p-3.5 text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <HelpCircle size={18} className="text-blue-600" />
            Any queries, contact us
          </div>
          {showContact ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>
    </div>
  );
}

