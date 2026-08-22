import React, { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import * as htmlToImage from "html-to-image";
import { Download, Clock, CheckCircle } from "lucide-react";
import ikigaiLogo from "../assets/ikigai.png"; // Assuming it's in assets

export default function TeamEntryPass() {
  const [teamInfo, setTeamInfo] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const passRef = useRef(null);
  
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const email = sessionStorage.getItem("care_email");
        if (email) {
          const teamRes = await fetch(`${API_BASE}/api/team/my-details?email=${encodeURIComponent(email)}`);
          const teamData = await teamRes.json();
          if (teamData.success) {
            setTeamInfo(teamData.team);
          }
          
          const qrRes = await fetch(`${API_BASE}/api/round2/team-qr/${encodeURIComponent(email)}`);
          const qrJson = await qrRes.json();
          if (qrJson.success && qrJson.qrToken) {
            setQrData({ token: qrJson.qrToken, status: qrJson.verificationStatus });
          }
        }
      } catch (error) {
        console.error("Error fetching team details or QR data:", error);
      }
      setLoading(false);
    };
    fetchTeamData();
  }, []);

  const downloadPass = async () => {
    if (passRef.current) {
      try {
        const dataUrl = await htmlToImage.toPng(passRef.current, { quality: 1, pixelRatio: 2 });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${teamInfo?.teamName || "Team"}_Entry_Pass.png`;
        link.click();
      } catch (err) {
        console.error("Failed to generate pass", err);
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Loading Entry Pass...</div>;
  }

  if (!qrData || !qrData.token) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Entry Pass Not Available</h2>
        <p className="text-gray-600">Your QR pass has not been generated yet. Please ensure your registration is verified.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full space-y-8 flex flex-col items-center">
      <div className="w-full bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
        <div className="flex-1">
          <h2 className="font-bold text-blue-800 text-lg">Download Your Entry Pass</h2>
          <p className="text-sm text-blue-600 mt-1">Please download the entry pass and save it to your device to avoid network issues at the entry gate.</p>
        </div>
        <button 
          onClick={downloadPass}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition ml-4 shrink-0"
        >
          <Download size={20} /> Download PNG
        </button>
      </div>

      <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-xl overflow-hidden max-w-sm w-full relative">
        <div 
          ref={passRef} 
          className="relative bg-gradient-to-br from-purple-400 to-pink-500 p-8 flex flex-col items-center text-center overflow-hidden"
          style={{ width: "100%" }}
        >
          {/* Decorative shapes for stylish theme */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-50 transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-50 transform translate-x-1/2 translate-y-1/2"></div>
          
          <div className="z-10 bg-white/80 backdrop-blur-sm px-6 py-2 rounded-2xl mb-6 shadow-sm border border-white/50">
             <img src={ikigaiLogo} alt="Ikigai Logo" className="h-14 object-contain" />
          </div>
          
          <div className="z-10 bg-white/20 backdrop-blur-md w-full py-3 px-4 rounded-xl border border-white/40 shadow-inner mb-6">
            <p className="text-purple-900 text-xs font-black uppercase tracking-widest mb-1">TEAM NAME</p>
            <h2 className="text-2xl md:text-3xl font-black text-white break-words leading-tight drop-shadow-md">{teamInfo?.teamName || "Your Team"}</h2>
          </div>
          
          <div className="z-10 p-4 bg-white rounded-2xl mb-6 shadow-lg border border-purple-200">
            <QRCode value={qrData.token} size={180} fgColor="#000000" bgColor="#FFFFFF" />
          </div>

          <div className="z-10 text-white w-full">
            <p className="text-sm font-semibold tracking-wide text-purple-200 uppercase border-t border-white/20 pt-4">Official Entry Pass</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm mt-4 text-center">
        {qrData.status === "CHECKED_IN" ? (
          <div className="inline-flex items-center gap-2 text-sm font-black px-5 py-2.5 bg-green-100 text-green-800 rounded-full border-2 border-green-300 shadow-sm">
            <CheckCircle size={18} /> ENTRY APPROVED
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 bg-orange-50 text-orange-700 rounded-full border border-orange-200 shadow-sm">
            <Clock size={16} /> Pending Verification at Gate
          </div>
        )}
      </div>
    </div>
  );
}
