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
    <div className="max-w-5xl mx-auto w-full space-y-8 animate-fade-in pb-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-green-100 text-green-700 rounded-xl">
            <Award size={28} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Performance</h1>
        </div>
        <p className="text-gray-600 leading-relaxed ml-14">
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
            <div key={index} className="space-y-4">
              <h2 className="text-xl font-black text-slate-800 border-b border-gray-200 pb-3 flex items-center gap-2">
                <div className="w-2 h-6 bg-green-500 rounded-full"></div>
                {perf.eventName}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {perf.assessments.map((assessment, aIdx) => (
                  <div key={aIdx} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden">
                    <div className="bg-slate-50 border-b border-gray-100 px-5 py-3 flex justify-between items-center">
                      <span className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                        <FileText size={16} className="text-indigo-500" />
                        {assessment.evaluatorName ? `Evaluator: ${assessment.evaluatorName}` : `Evaluation #${aIdx + 1}`}
                      </span>
                    </div>
                    <div className="p-5 space-y-4">
                      {Object.entries(assessment.textData || assessment).map(([key, value], i) => {
                        if (key === 'evaluatorName' && !assessment.textData) return null; // Skip if iterating raw object
                        return (
                          <div key={i} className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{key}</span>
                            <div className="bg-slate-50 text-slate-800 p-3 rounded-xl text-sm leading-relaxed border border-gray-100">
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
