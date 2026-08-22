import React, { useState, useEffect } from "react";
import { Award, AlertTriangle, FileText, Activity } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function TeamPerformance() {
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const email = sessionStorage.getItem("care_email");
        if (!email) {
          setError("User email not found. Please log in again.");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/team/performance?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        
        if (data.success) {
          setPerformances(data.performances || []);
        } else {
          setError(data.message || "Failed to fetch performance data.");
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching your performance.");
      }
      setLoading(false);
    };

    fetchPerformance();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 font-medium">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Loading Performance Insights...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={24} />
          <p className="font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8 animate-fade-in pb-8 md:pt-4">
      <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 bg-gradient-to-br from-white to-slate-50">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-green-100 text-green-700 rounded-2xl shadow-inner">
            <Award size={28} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Performance</h1>
        </div>
        <p className="text-slate-600 leading-relaxed md:ml-16 mt-2 md:mt-0 text-sm md:text-base">
          View your team's event-wise assessment feedback and progress insights provided by the evaluators.
        </p>
      </div>

      {performances.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <Activity size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Assessments Yet</h3>
          <p className="text-gray-500">
            Your team has not received any text-based evaluations for your events yet. Keep checking back!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {performances.map((perf, index) => (
            <div key={index} className="space-y-6">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 border-b-2 border-slate-100 pb-4 flex items-center gap-3">
                <div className="w-2.5 h-8 bg-gradient-to-b from-green-400 to-green-600 rounded-full shadow-sm"></div>
                {perf.eventName}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                {perf.assessments.map((assessment, aIdx) => (
                  <div key={aIdx} className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200 overflow-hidden group">
                    <div className="bg-indigo-50/50 border-b border-indigo-100/50 px-4 md:px-5 py-3.5 flex justify-between items-center group-hover:bg-indigo-50 transition-colors">
                      <span className="font-bold text-slate-800 text-sm flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shadow-sm">
                          <FileText size={16} />
                        </div>
                        {assessment.evaluatorName ? `Evaluator: ${assessment.evaluatorName}` : `Evaluation #${aIdx + 1}`}
                      </span>
                    </div>
                    <div className="p-4 md:p-6 space-y-4">
                      {Object.entries(assessment.textData || assessment).map(([key, value], i) => {
                        if (key === 'evaluatorName' && !assessment.textData) return null;
                        return (
                          <div key={i} className="flex flex-col">
                            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{key}</span>
                            <div className="bg-slate-50 hover:bg-slate-100/50 text-slate-800 p-3.5 md:p-4 rounded-2xl text-sm leading-relaxed border border-slate-100 transition-colors shadow-inner">
                              {value || <span className="text-gray-400 italic">No feedback provided</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
