// src/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// or wherever API_BASE is defined
import "./index.css";
import ikigaiLogo from "./assets/ikigai.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("password"); // password | otp
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [error, setError] = useState("");

const normalizeEmail = (email) => email.trim().toLowerCase();
const API_BASE = import.meta.env.VITE_API_BASE;

useEffect(() => {
  localStorage.clear();
  sessionStorage.clear();
}, []);

const sendOtp = async () => {
  if (!email) {
    alert("Please enter your email first.");
    return;
  }

  setOtpLoading(true);

  try {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizeEmail(email),
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "No user found with this email.");
      return;
    }

    alert("OTP sent to your registered email.");
  } catch (err) {
    console.error("Send OTP error:", err);
    alert("Server error while sending OTP.");
  } finally {
    setOtpLoading(false);
  }
};


const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizeEmail(email),
        password,
      }),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      alert(data?.message || "Login failed");
      return;
    }

    // ✅ SUCCESS
    sessionStorage.setItem("care_role", data.role);
    sessionStorage.setItem("care_email", data.email);
    sessionStorage.setItem("care_name", data.name || data.teamName || "");

      if (data.role === "admin") navigate("/dashboard", { replace: true });
      else if (data.role === "sessionChair") navigate("/session", { replace: true });
      else if (data.role === "studentCoordinator") navigate("/student", { replace: true });
      else if (data.role === "studentVolunteer") navigate("/volunteer", { replace: true });
      else if (data.role === "facultyCoordinator") navigate("/faculty", { replace: true });
      else if (data.role === "teamLeader") navigate("/team", { replace: true });

  } catch (err) {
    console.error("LOGIN FETCH ERROR:", err);
    alert("Server unreachable");
  } finally {
    setLoading(false);
  }
};


  const verifyOtp = async (otpValue) => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      

body: JSON.stringify({
  email: normalizeEmail(email),

  otp: otpValue,
}),

    });

    const data = await res.json();

    if (!data.success) {
      return false;
    }

    // success
    setOtpVerified(true);
    sessionStorage.setItem("care_role", data.role);
    sessionStorage.setItem("care_email", normalizeEmail(email));
    sessionStorage.setItem("care_name", data.name || "");


    setTimeout(() => {
      console.log("LOGIN ATTEMPT:", email, password);

      if (data.role === "admin") {
        navigate("/dashboard");
      } else if (data.role === "sessionChair") {
        navigate("/session");
      } else if (data.role === "studentCoordinator") {
        navigate("/student");
      } else if (data.role === "studentVolunteer") {
        navigate("/volunteer");
      } else if (data.role === "teamLeader") {
        navigate("/team");
      } else if (data.role === "facultyCoordinator") {
        navigate("/faculty");
      }
    }, 700);


    return true;
  } catch (err) {
    console.error("Verify OTP error:", err);
    return false;
  }
};

const handleOtpChange = async (e, index) => {
  const val = e.target.value.replace(/\D/, "");
  if (!val) return;

  const newOtp = [...otp];
  newOtp[index] = val;
  setOtp(newOtp);

  // move to next box
  if (e.target.nextSibling) {
    e.target.nextSibling.focus();
  }

  const otpValue = newOtp.join("");
  if (otpValue.length === 4) {
    const ok = await verifyOtp(otpValue);
    if (!ok) {
      alert("❌ Invalid OTP");
      setOtp(["", "", "", ""]);
    }
  }
};



  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-50 via-green-100 to-green-200 px-4">
      <div className="w-full max-w-xl bg-white/90 backdrop-blur-md border border-green-200 rounded-2xl shadow-xl p-10">
        {/* Logo */}
        <div className="text-center mb-8">
{/* Hackathon Logo Header */}
<div className="mb-10 flex justify-center">
  <img
    src={ikigaiLogo}
    alt="Hackathon Logo"
    className="h-24 md:h-32 object-contain"
  />
</div>
        </div>
        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:outline-none"
              placeholder="Enter your email"
            />
          </div>
{mode === "password" && (
  <div>
    <label className="block text-gray-700 font-semibold mb-2">
      Password
    </label>

    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 pr-16 border border-green-300 rounded-lg
                   focus:ring-2 focus:ring-green-400 focus:outline-none"
        placeholder="Enter your password"
      />

      {/* SHOW / HIDE BUTTON */}
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute inset-y-0 right-3 flex items-center
                   text-sm font-medium text-gray-600 hover:text-green-600
                   focus:outline-none"
      >
        {showPassword ? "Hide" : "Show"}
      </button>
    </div>

    {/* FORGOT PASSWORD LINK */}
    <div className="mt-2 text-right text-sm">
      <button
        type="button"
        onClick={() => setMode("otp")}
        className="text-green-600 hover:underline"
      >
        Forgot password?
      </button>
    </div>
  </div>
)}



      {mode === "password" && (
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 rounded-lg font-bold text-white transition ${
          loading
            ? "bg-green-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    )}

    {mode === "otp" && (
      <>
       {/* OTP INSTRUCTION */}
    <div className="text-center mt-4 mb-2">
      <p className="text-sm text-gray-600">
        Enter the 4-digit OTP sent to
      </p>
      <p className="font-semibold text-green-700 break-all">
        {email}
      </p>
    </div>

    {/* SEND OTP BUTTON */}
    <button
      type="button"
      onClick={sendOtp}
      disabled={otpLoading}
      className={`w-full py-3 rounded-lg font-bold text-white transition flex items-center justify-center gap-2 ${
        otpLoading
          ? "bg-green-400 cursor-not-allowed"
          : "bg-green-600 hover:bg-green-700"
      }`}
    >
      {otpLoading ? (
        <>
          <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
          Sending OTP...
        </>
      ) : (
        "Send OTP"
      )}
    </button>

           {/* OTP INPUTS — SAME CARD, NO SIZE CHANGE */}
    <div className="flex justify-between gap-3 mt-6">
      {otp.map((digit, i) => (
        <input
          key={i}
          maxLength={1}
          value={digit}
          onChange={(e) => handleOtpChange(e, i)}
          className={`w-14 h-14 text-center text-xl font-semibold rounded-lg border-2 transition-all
            ${otpVerified ? "border-green-500" : "border-gray-300"}
          `}
        />
      ))}
    </div>

    {/* BACK TO PASSWORD LOGIN */}
    <button
      type="button"
      onClick={() => {
        setMode("password");
        setOtp(["", "", "", ""]);
        setError("");
      }}
      className="mt-4 text-sm text-gray-600 hover:text-green-600 underline"
    >
      Back to password login
    </button>

      </>
    )}


        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
  © 2026 HackEval — Towards Sustainable Research Evaluation
</div>

      </div>
    </div>
  );
}
