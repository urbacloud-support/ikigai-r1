import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, History, ListChecks, Award, Loader2, ShieldCheck } from "lucide-react";
import FacultyOverview from "./FacultyOverview";
import FacultyHistory from "./FacultyHistory";
import FacultyAttendance from "./FacultyAttendance";
import FacultyKits from "./FacultyKits";
import AdminEntryVerification from "../admin/AdminEntryVerification";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [teamsData, setTeamsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location.pathname.includes("/faculty/history")) setActiveTab("history");
    else if (location.pathname.includes("/faculty/attendance")) setActiveTab("attendance");
    else if (location.pathname.includes("/faculty/kits")) setActiveTab("kits");
    else if (location.pathname.includes("/faculty/entry-verification")) setActiveTab("entry-verification");
    else setActiveTab("overview");
  }, [location]);

  useEffect(() => {
    const fetchTeamsData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/volunteer/faculty/teams-data`);
        const data = await res.json();
        if (data.success) {
          setTeamsData(data.teams);
        } else {
          setError("Failed to load teams data.");
        }
      } catch (err) {
        setError("Error connecting to server.");
      }
      setLoading(false);
    };
    fetchTeamsData();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "overview") navigate("/faculty");
    else navigate(`/faculty/${tab}`);
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col md:flex-row font-sans h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] relative">
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm z-20">
        <div className="p-6 pb-2">
          <h2 className="text-xl font-black text-indigo-900 tracking-tight">Coordinator Portal</h2>
        </div>
        <div className="flex-1 p-4 space-y-2 mt-4">
          <button onClick={() => handleTabChange("overview")} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}>
            <LayoutDashboard size={20} strokeWidth={activeTab === 'overview' ? 2.5 : 2} /> Overview
          </button>
          <button onClick={() => handleTabChange("history")} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}>
            <History size={20} strokeWidth={activeTab === 'history' ? 2.5 : 2} /> History & Docs
          </button>
          <button onClick={() => handleTabChange("attendance")} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === 'attendance' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}>
            <ListChecks size={20} strokeWidth={activeTab === 'attendance' ? 2.5 : 2} /> Attendance
          </button>
          <button onClick={() => handleTabChange("kits")} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === 'kits' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}>
            <Award size={20} strokeWidth={activeTab === 'kits' ? 2.5 : 2} /> Kits & Certs
          </button>
          <button onClick={() => handleTabChange("entry-verification")} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === 'entry-verification' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}>
            <ShieldCheck size={20} strokeWidth={activeTab === 'entry-verification' ? 2.5 : 2} /> Entry Verification
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-[80px] md:pb-0">
        <div className="w-full h-full flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 h-full">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-indigo-600 font-medium">Loading Data...</p>
            </div>
          ) : error ? (
            <div className="p-6 h-full flex flex-col items-center justify-center text-red-500">
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-100 rounded-lg">Retry</button>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<FacultyOverview teamsData={teamsData} />} />
              <Route path="/history" element={<FacultyHistory teamsData={teamsData} />} />
              <Route path="/attendance" element={<FacultyAttendance teamsData={teamsData} />} />
              <Route path="/kits" element={<FacultyKits teamsData={teamsData} />} />
              <Route path="/entry-verification" element={<AdminEntryVerification />} />
              <Route path="*" element={<Navigate to="/faculty" replace />} />
            </Routes>
          )}
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
        {['overview', 'history', 'attendance', 'kits', 'entry-verification'].map(tab => (
          <button key={tab} onClick={() => handleTabChange(tab)} className={`flex flex-col items-center justify-center w-full py-2 ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <div className={`p-1.5 rounded-xl mb-1 transition-colors ${activeTab === tab ? 'bg-indigo-50' : ''}`}>
              {tab === 'overview' && <LayoutDashboard size={24} />}
              {tab === 'history' && <History size={24} />}
              {tab === 'attendance' && <ListChecks size={24} />}
              {tab === 'kits' && <Award size={24} />}
              {tab === 'entry-verification' && <ShieldCheck size={24} />}
            </div>
            <span className="text-[10px] font-bold uppercase">{tab}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
