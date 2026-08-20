import React, { useState, useEffect } from "react";
import { Users, FileCheck, CheckCircle, Package, UserCheck, AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function FacultyOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/volunteer/faculty/dashboard`);
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return <div className="p-8 text-center text-slate-500">Loading overview metrics...</div>;
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, colorClass }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-black text-slate-800">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-2 font-medium">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Event Overview</h1>
          <p className="text-slate-500 mt-1">Real-time metrics and check-in progress.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Checked-In Teams" 
          value={`${stats.checkedInTeams} / ${stats.totalTeams}`} 
          subtitle="Total Teams Arrived"
          icon={Users} 
          colorClass="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          title="Checked-In Members" 
          value={`${stats.checkedInMembers} / ${stats.totalMembers}`} 
          subtitle="Total Individual Participants"
          icon={UserCheck} 
          colorClass="bg-emerald-50 text-emerald-600" 
        />
        <StatCard 
          title="Missing Gov ID" 
          value={stats.missingGovId} 
          subtitle="Present but ID not verified"
          icon={AlertTriangle} 
          colorClass="bg-amber-50 text-amber-600" 
        />
        <StatCard 
          title="Missing Consent" 
          value={stats.missingConsent} 
          subtitle="Present but no consent form"
          icon={FileCheck} 
          colorClass="bg-red-50 text-red-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle className="text-indigo-500" /> Attendance Tracking
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-slate-700">Day 1</span>
                <span className="text-indigo-600">{stats.day1Attendance} / {stats.checkedInMembers}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${stats.checkedInMembers ? (stats.day1Attendance/stats.checkedInMembers)*100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-slate-700">Day 2</span>
                <span className="text-indigo-600">{stats.day2Attendance} / {stats.checkedInMembers}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${stats.checkedInMembers ? (stats.day2Attendance/stats.checkedInMembers)*100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-slate-700">Day 3</span>
                <span className="text-indigo-600">{stats.day3Attendance} / {stats.checkedInMembers}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${stats.checkedInMembers ? (stats.day3Attendance/stats.checkedInMembers)*100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="text-purple-500" /> Distribution Status
          </h3>
          <div className="grid grid-cols-2 gap-4 h-[calc(100%-2rem)]">
            <div className="bg-purple-50 rounded-xl p-4 flex flex-col justify-center text-center">
              <p className="text-sm font-bold text-purple-800 mb-2">Member Registration Kits</p>
              <p className="text-4xl font-black text-purple-600">{stats.registrationKitsGiven}</p>
              <p className="text-xs text-purple-400 mt-2">Members Received</p>
            </div>
            <div className="bg-fuchsia-50 rounded-xl p-4 flex flex-col justify-center text-center">
              <p className="text-sm font-bold text-fuchsia-800 mb-2">Participation Certs</p>
              <p className="text-4xl font-black text-fuchsia-600">{stats.participationCertsGiven}</p>
              <p className="text-xs text-fuchsia-400 mt-2">Members Received</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
