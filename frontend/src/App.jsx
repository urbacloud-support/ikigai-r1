// src/App.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import ErrorBoundary from "./ErrorBoundary";
import UpdatePassword from "./UpdatePassword";
import SlideViewer from "./components/evaluator/SlideViewer";
import NotificationCenter from "./components/student/NotificationCenter";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
  Outlet,
} from "react-router-dom";
import Login from './Login';
import { EventsView, ProgressView, UsersView } from "./AdminConsole";
import AdminLayout from './AdminLayout';
import AdminMailingService from './pages/admin/AdminMailingService';
import "./index.css";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AdminEventParticipants from "./AdminEventParticipants";
import AdminShortlist from "./AdminShortlist";
import AdminRound2 from "./AdminRound2";
import AdminCloseRegistration from "./pages/admin/AdminCloseRegistration";
import AdminProblemStatements from "./pages/admin/AdminProblemStatements";
import AdminAssignTracks from "./pages/admin/AdminAssignTracks";
import StudentDashboard from "./pages/StudentDashboard";
import VolunteerConsole from "./pages/volunteer/VolunteerConsole";
import AdminEntryVerification from "./pages/admin/AdminEntryVerification";
import TeamLayout from "./pages/TeamLayout";
import TeamHome from "./pages/TeamHome";
import TeamMyTeam from "./pages/TeamMyTeam";
import ikigaiLogo from "./assets/ikigai.png";
import { FileText, CheckCircle, Link2, User, Mail, Phone, Building2, BookOpen, GraduationCap, MapPin, X, Bell } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
export const ASSESSMENT_CRITERIA = [
  "Innovation & Creativity",
  "Technical Complexity",
  "UI/UX & Design",
  "Feasibility & Impact",
  "Presentation & Q&A",
];


function ChangePasswordModal({ user, onClose }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password-direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          role: user.role,
          newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.message || "Failed to update password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
    setLoading(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Change Password</h2>
        <p className="text-gray-500 mb-6 text-sm">Securely update your password.</p>

        {success ? (
          <div className="bg-green-100 text-green-700 p-4 rounded-xl text-center font-semibold">
            Password updated successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ----------------------------- Shared Header ----------------------------- */
function Header({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const displayRole = user.role === "sessionChair" ? "Evaluator" : user.role === "studentCoordinator" ? "Student Coordinator" : user.role === "studentVolunteer" ? "Student Volunteer" : user.role === "teamLeader" ? "Team Leader" : "Admin";

  return (
    <>
      <header className="w-full bg-white/70 backdrop-blur-md border-b border-green-200 shadow-sm relative z-50">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:h-20">

          <div className="flex items-center min-w-0 w-1/2">
            {/* LOGO */}
            <img
              src={ikigaiLogo}
              alt="Hackathon Logo"
              className="h-12 md:h-16 object-contain w-auto max-w-full"
            />
          </div>


          <div className="flex items-center gap-2 relative">
            {user.role !== "admin" && (
              <NotificationCenter
                userEmail={user.email}
                onOpenPasswordModal={() => setShowPasswordModal(true)}
              />
            )}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-green-50"
                aria-haspopup="true"
                aria-expanded={open}
              >
                <div className="w-10 h-10 bg-green-600 text-white flex items-center justify-center rounded-full font-semibold">
                  {user.name[0]?.toUpperCase() || "U"}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-sm font-semibold">{user.name}</span>
                  {user.role !== "admin" && (
                    <span className="text-xs text-green-700 capitalize">{displayRole}</span>
                  )}
                </div>
              </button>

              {open && (
                <div className="absolute right-0 top-14 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-bold text-gray-800 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email || "No email"}</p>
                    {user.role !== "admin" && (
                      <p className="text-xs font-semibold text-green-600 mt-1 capitalize">{displayRole}</p>
                    )}
                  </div>
                  <div className="py-1">
                    {user.role !== "admin" && (
                      <button
                        onClick={() => {
                          setOpen(false);
                          setShowPasswordModal(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 font-medium"
                      >
                        Change Password
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {showPasswordModal && <ChangePasswordModal user={user} onClose={() => setShowPasswordModal(false)} />}
    </>
  );
}

/* -------------------------------- Dashboard -------------------------------- */
function Dashboard({ events, refreshEvents }) {
  const [participantCounts, setParticipantCounts] = useState({});
  const [sessionChairCounts, setSessionChairCounts] = useState({});

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/events/participant-counts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setParticipantCounts(data.counts || {});
        }
      });
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/events/session-chair-counts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSessionChairCounts(data.counts || {});
        }
      });
  }, []);

  return (
    <main className="flex-1 px-6 py-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Events</h2>
        <Link
          to="/create"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold"
        >
          Create Event
        </Link>
      </div>

      <div className="space-y-4">
        {!events || events.length === 0 ? (
          <div className="p-6 bg-white/80 border border-green-200 rounded-lg text-gray-600">
            No events yet. Click “Create Event” to start.
          </div>
        ) : (
          events.map((ev) => {
            const participantsCount = Object.values(
              ev.participants || {}
            ).reduce((acc, list) => acc + (list?.length || 0), 0);
            return (
              <div
                key={ev._id || ev.id}
                className="bg-white border border-green-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-6">

                  {/* LEFT: Event Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-green-700 truncate">
                      {ev.title}
                    </h3>

                    <p className="text-sm text-gray-600 mt-1 line-clamp-2 text-justify">
                      {ev.description || "No description available for this event."}
                    </p>

                    <p className="text-sm text-gray-500 mt-2">
                      Date: {ev.date || "—"}
                    </p>
                  </div>

                  {/* RIGHT: Stats + Actions */}
                  <div className="flex flex-col items-end gap-4 shrink-0">

                    {/* STATS */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                          Tracks
                        </div>
                        <div className="text-lg font-semibold text-gray-800">
                          {ev.tracks?.length || 0}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                          Chairs
                        </div>
                        <div className="text-lg font-semibold text-gray-800">
                          {sessionChairCounts[ev._id || ev.id] || 0}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                          Participants
                        </div>
                        <div className="text-lg font-semibold text-gray-800">
                          {participantCounts[ev._id || ev.id] || 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Link
                        to={`/event/${ev._id || ev.id}`}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-semibold"
                      >
                        View Details
                      </Link>
                      <Link
                        to={`/admin/events/${ev._id || ev.id}/participants`}
                        className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-md text-sm font-semibold"
                      >
                        View Participants
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

            );
          })
        )}
      </div>
    </main>
  );
}







/* --------------------------- Create Event Wizard -------------------------- */
/* This corresponds to the large wizard you previously had. I preserved behavior.
   It supports create and edit flows depending on props passed in. */

function CreateEvent({
  onEventSaved,
  events = [],
  isEdit = false,
  editEventId = null,
  setEvents,
}) {
  const navigate = useNavigate();

  // steps
  const stepDefs = [
    { id: 1, label: "Basic Details" },
    { id: 2, label: "Tracks" },
    { id: 3, label: "Session Chairs" },
    { id: 4, label: "Student Coordinator" },
  ];
  const [activeStep, setActiveStep] = useState(1);
  const [completed, setCompleted] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [scByTrack, setScByTrack] = useState({});
  const [scLoading, setScLoading] = useState(false);


  const markDirty = () => setIsDirty(true);




  // if editing an existing event, prefill
  const findEventToEdit = () => {
    if (!isEdit || !editEventId) return null;
    return (
      events.find((e) => e._id === editEventId || e.id === editEventId) || null
    );
  };

  useEffect(() => {
    if (!isEdit || !editEventId || !Array.isArray(events)) return;

    const ev = events.find(
      (e) => e._id === editEventId || e.id === editEventId
    );

    if (!ev) return;

    setEvent({
      _id: ev._id,
      id: ev._id || ev.id,
      title: ev.title || "",
      description: ev.description || "",
      date: ev.date || "",
      tracks: Array.isArray(ev.tracks)
        ? ev.tracks.map((t, idx) => ({
          _id: t._id,
          id: t.id || String(idx + 1).padStart(3, "0"), // 🔥 ENSURE UI ID
          title: t.title,
          description: t.description,
        }))
        : [],

      sessionChairs: [],            // will be loaded at step 3
      studentCoordinators: [],      // will be loaded at step 4
      participants: ev.participants || {},
    });
  }, [isEdit, editEventId, events]);


  // main event object (local while creating)
  const [event, setEvent] = useState({
    id: Date.now().toString(),
    title: "",
    description: "",
    date: "",
    tracks: [], // {id,title,description}
    sessionChairs: [], // {id,name,email,phone,type,password,trackId}
    participants: {}, // keyed by trackId -> array of participants
    studentCoordinators: [], // {id,name,email,phone,trackId,password}
  });



  const [successMessage, setSuccessMessage] = useState("");
  // 🔥 Auto-save helper for EDIT mode (prevents data loss on refresh)
  const persistEditEvent = async (updatedEvent) => {
    if (!isEdit) return;
    if (!updatedEvent._id) return;
    if (activeStep !== 2) return;

    await fetch(`${API_BASE}/api/admin/events/${updatedEvent._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tracks: updatedEvent.tracks, // ✅ ONLY TRACKS
      }),
    });
  };


  const persistFullEditEvent = async (updatedEvent) => {
    if (!isEdit) return;
    if (!updatedEvent._id) return;

    console.log("🔵 FULL EDIT SAVE", updatedEvent._id);

    await fetch(`${API_BASE}/api/admin/events/${updatedEvent._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: updatedEvent.title,
        description: updatedEvent.description,
        date: updatedEvent.date,
        tracks: updatedEvent.tracks,
        sessionChairs: updatedEvent.sessionChairs.map(c => ({
          _id: c._id || undefined, // 🔥 preserve existing DB id
          name: c.name,
          email: c.email,
          phone: c.phone,
          type: c.type,
          trackId: c.trackId,
        })),
        studentCoordinators: updatedEvent.studentCoordinators,
      }),
    });
  };


  /* ---------------------------- Step 1 (Basic) ---------------------------- */
  const step1Valid = event.title.trim() && event.date.trim();

  /* ---------------------------- Step 2 (Tracks) --------------------------- */
  const [tTitle, setTTitle] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [editingTrackId, setEditingTrackId] = useState(null);
  const getNextTrackId = () => {
    const existingIds = event.tracks
      .map((t) => parseInt(t.id, 10))
      .filter((n) => !isNaN(n));

    const next = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return next.toString().padStart(3, "0");
  };



  const addTrack = () => {
    markDirty()
    if (!tTitle.trim() || !tDesc.trim()) {
      alert("Track title and description are required.");
      return;
    }

    const id = getNextTrackId();

    const newTrack = {
      id,
      title: tTitle.trim(),
      description: tDesc.trim(),

    };

    setEvent((ev) => {
      const updated = { ...ev, tracks: [...ev.tracks, newTrack] };
      persistEditEvent(updated); // auto-save in edit mode
      return updated;
    });

    setTTitle("");
    setTDesc("");
  };

  const editTrack = (track) => {
    setEditingTrackId(track.id);
    setTTitle(track.title);
    setTDesc(track.description);
  };



  const deleteTrack = (id) => {
    markDirty()
    if (!confirm("Delete track and its participants/chairs?")) return;
    setEvent((ev) => {
      const updated = {
        ...ev,
        tracks: ev.tracks.filter((tr) => tr.id !== id),
        sessionChairs: ev.sessionChairs.filter((ch) => ch.trackId !== id),
        participants: Object.fromEntries(
          Object.entries(ev.participants || {}).filter(([k]) => k !== id)
        ),
      };


      persistEditEvent(updated);   // 🔥 SAVE IMMEDIATELY
      return updated;
    });

  };

  const updateTrack = () => {
    markDirty()
    if (!editingTrackId) return;

    setEvent((ev) => ({
      ...ev,
      tracks: ev.tracks.map((t) =>
        t.id === editingTrackId
          ? {
            ...t,                     // ✅ preserves ID
            title: tTitle.trim(),
            description: tDesc.trim(),
          }
          : t
      ),
    }));

    setEditingTrackId(null);
    setTTitle("");
    setTDesc("");
  };


  const step2Valid = event.tracks.length > 0;

  /* -------------------------- Step 3 (Session Chairs) ---------------------- */
  // 🔥 STEP 4 – Load Student Coordinators in EDIT mode
  useEffect(() => {
    if (!isEdit || !event._id || activeStep !== 4) return;

    fetch(`${API_BASE}/api/admin/events/${event._id}`)
      .then(res => res.json())
      .then(data => {
        if (!data?.event?.studentCoordinators) return;

        setEvent(ev => ({
          ...ev,
          studentCoordinators: data.event.studentCoordinators.map(sc => {
            const uiTrack = ev.tracks.find(
              tr => String(tr._id) === String(sc.trackId)
            );

            return {
              _id: sc._id,
              id: sc._id,
              name: sc.name,
              email: sc.email,
              phone: sc.phone,
              password: "",
              trackId: uiTrack ? uiTrack.id : null, // ✅ now valid
            };
          }),
        }));
      });
  }, [isEdit, event._id, activeStep]);


  useEffect(() => {
    if (!isEdit || activeStep !== 4 || !event._id) return;

    const load = async () => {
      setScLoading(true);
      const map = {};

      for (const tr of event.tracks) {
        try {
          const res = await fetch(
            `${API_BASE}/api/admin/student-coordinator?eventId=${event._id}&trackId=${tr.id}`
          );
          const data = await res.json();

          map[tr.id] = data.coordinator; // may be null
        } catch (err) {
          console.error("SC fetch failed:", tr.id, err);
          map[tr.id] = null;
        }
      }

      setScByTrack(map);
      setScLoading(false);
    };

    load();
  }, [isEdit, activeStep, event._id, event.tracks]);

  useEffect(() => {
    if (!isEdit || !event._id || activeStep !== 3) return;

    fetch(`${API_BASE}/api/admin/session-chairs/${event._id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.chairs)) {
          setEvent(ev => ({
            ...ev,
            sessionChairs: data.chairs.map(ch => ({
              _id: ch._id,        // DB id
              id: ch._id,         // keep for UI consistency
              name: ch.name,
              email: ch.email,
              phone: ch.phone,
              type: ch.type,
              trackId: ch.trackId,
              password: "",
            }))
          }));
        }
      });
  }, [isEdit, event._id, activeStep]);

  const [chairForm, setChairForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    type: "",
    password: "",
    trackId: "",
  });

  const [studentForm, setStudentForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    trackId: "",
  });

  const genStudentId = () =>
    `SC${(event.studentCoordinators.length + 1)
      .toString()
      .padStart(3, "0")}`;

  const genStudentPassword = (name) => {
    if (!name) return "";
    return name.split(" ")[0].toLowerCase() + "123";
  };


  const emailValid = (em) => /\S+@\S+\.\S+/.test(em);
  const phoneValid = (ph) => /^\d{10}$/.test(ph);

  const genChairId = () => {
    const nums = event.sessionChairs
      .map(c => parseInt(c.id?.replace("SCH", ""), 10))
      .filter(n => !isNaN(n));

    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `SCH${next.toString().padStart(3, "0")}`;
  };


  const genAutoPassword = (name) => {
    if (!name) return "";
    const first = name.trim().split(" ")[0].toLowerCase();
    return `${first}123`;
  };

  const addChair = () => {
    markDirty()
    const { name, email, phone, type, password, trackId } = chairForm;
    if (!name.trim()) return alert("Name required");
    if (!emailValid(email)) return alert("Valid email required");
    if (!phoneValid(phone)) return alert("Valid 10-digit phone required");
    if (!type) return alert("Please select Internal or External");
    if (!trackId) return alert("Please assign a track");

    // auto-generate password if empty
    const realPass =
      password && password.trim() ? password.trim() : genAutoPassword(name);

    // ensure no duplicate same type per track
    const conflict = event.sessionChairs.find(
      (c) =>
        c.trackId === trackId && c.type.toLowerCase() === type.toLowerCase()
    );
    if (conflict) {
      return alert(
        `A ${type} chair is already assigned to this track (${conflict.name}).`
      );
    }

    const newChair = { ...chairForm, id: genChairId(), password: realPass };
    setEvent((ev) => ({
      ...ev,
      sessionChairs: [...ev.sessionChairs, newChair],
    }));
    setChairForm({
      id: "",
      name: "",
      email: "",
      phone: "",
      type: "",
      password: "",
      trackId: "",
    });
  };

  const editChair = (id) => {
    const c = event.sessionChairs.find((x) => x.id === id);
    if (!c) return;
    setChairForm({ ...c });
  };

  const updateChair = () => {
    markDirty()
    const { id, name, email, phone, type, password, trackId } = chairForm;
    if (!id) return;
    if (!name.trim()) return alert("Name required");
    if (!emailValid(email)) return alert("Valid email required");
    if (!phoneValid(phone)) return alert("Valid 10-digit phone required");
    if (!type) return alert("Please select Internal or External");
    if (!trackId) return alert("Please assign a track");

    // check conflict excluding this id
    const conflict = event.sessionChairs.find(
      (c) =>
        c.trackId === trackId &&
        c.type.toLowerCase() === type.toLowerCase() &&
        c.id !== id
    );
    if (conflict) {
      return alert(
        `A ${type} chair is already assigned to this track (${conflict.name}).`
      );
    }

    setEvent((ev) => ({
      ...ev,
      sessionChairs: ev.sessionChairs.map((c) =>
        c.id === id ? { ...chairForm } : c
      ),
    }));
    setChairForm({
      id: "",
      name: "",
      email: "",
      phone: "",
      type: "",
      password: "",
      trackId: "",
    });
  };

  const deleteChair = (id) => {
    markDirty()
    if (!confirm("Delete this chair?")) return;
    setEvent((ev) => ({
      ...ev,
      sessionChairs: ev.sessionChairs.filter((c) => c.id !== id),
    }));
  };

  const addStudentCoordinator = async () => {
    const { name, email, phone, password, trackId } = studentForm;

    if (!name || !email || !phone || !trackId) {
      alert("All fields required");
      return;
    }

    const res = await fetch(`${API_BASE}/api/admin/student-coordinator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
        eventId: event._id,
        trackId,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Failed to add student coordinator");
      return;
    }

    setScByTrack(prev => ({
      ...prev,
      [trackId]: data.coordinator,
    }));

    setStudentForm({
      id: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      trackId: "",
    });
  };


  const editStudent = (id) => {
    const s = event.studentCoordinators.find((x) => x.id === id);
    if (s) setStudentForm({ ...s });
  };

  const updateStudent = async () => {
    const { id, name, email, phone, password, trackId } = studentForm;

    if (!id) return alert("Invalid student");

    await fetch(`${API_BASE}/api/admin/student-coordinator`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name,
        email,
        phone,
        password: password || undefined, // 🔐 update only if provided
        eventId: event._id,
        trackId,
      }),
    });

    // 🔄 refetch this track only
    const res = await fetch(
      `${API_BASE}/api/admin/student-coordinator?eventId=${event._id}&trackId=${trackId}`
    );
    const data = await res.json();

    setScByTrack(prev => ({
      ...prev,
      [trackId]: data.coordinator,
    }));

    setStudentForm({
      id: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      trackId: "",
    });
  };




  const deleteStudent = (id) => {
    markDirty()
    if (!confirm("Delete student coordinator?")) return;
    setEvent((ev) => ({
      ...ev,
      studentCoordinators: ev.studentCoordinators.filter((s) => s.id !== id),
    }));
  };


  const getTrackTitle = (trackId) => {
    const t = event.tracks.find((x) => x.id === trackId);
    return t ? t.title : "—";
  };

  // validation: each track must have exactly one internal + one external
  const step3Valid = (() => {
    if (event.tracks.length === 0) return false;
    if (!Array.isArray(event.sessionChairs) || event.sessionChairs.length === 0)
      return false;

    for (const tr of event.tracks) {
      const chairsForTrack = event.sessionChairs.filter(
        (c) => c.trackId === tr.id
      );
      const types = chairsForTrack.map((c) => c.type.toLowerCase());
      if (
        !(
          chairsForTrack.length === 2 &&
          types.includes("internal") &&
          types.includes("external")
        )
      ) {
        return false;
      }
    }
    return true;
  })();

  /* ------------------------- Step 4 Participants -------------------------- */
  // modal state
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [participantModalTrackId, setParticipantModalTrackId] = useState(null);

  // participant form inside modal
  const [pForm, setPForm] = useState({
    id: "",
    presenterName: "",
    problemStatement: "",
    file: null, // file object
    fileName: "",
    mode: "",
    email: "",
    phone: "",
  });

  const openParticipantModal = (trackId) => {
    setParticipantModalTrackId(trackId);
    setPForm({
      id: "",
      presenterName: "",
      problemStatement: "",
      file: null,
      fileName: "",
      mode: "",
      email: "",
      phone: "",
    });
    setParticipantModalOpen(true);
  };

  const genParticipantId = (trackId) => {
    const list = event.participants?.[trackId] || [];
    const idx = list.length + 1;
    return `${trackId}P${idx.toString().padStart(3, "0")}`; // e.g., 001P001
  };

  const fileIsValid = (file) => {
    if (!file) return false;
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    ];
    return allowed.includes(file.type);
  };

  const addParticipant = () => {
    const { presenterName, problemStatement, file, mode, email, phone } = pForm;
    if (!presenterName.trim()) return alert("Presenter name required");
    if (!problemStatement.trim()) return alert("Paper title required");
    if (!file) return alert("Please upload the research paper (.pdf or .docx)");
    if (!fileIsValid(file)) return alert("Invalid file type. Use PDF or DOCX.");
    if (!mode) return alert("Select presentation mode");
    if (!emailValid(email)) return alert("Valid email required");
    if (!phoneValid(phone)) return alert("Valid 10-digit phone required");

    const pid = genParticipantId(participantModalTrackId);
    const saved = {
      paperId: pid,              // ✅ FIX
      presenterName: presenterName.trim(),
      problemStatement: problemStatement.trim(),
      fileName: pForm.fileName || file.name,
      file, // keep file object in state (local)
      mode,
      email,
      phone,
    };

    setEvent((ev) => {
      const current = { ...(ev.participants || {}) };
      if (!current[participantModalTrackId])
        current[participantModalTrackId] = [];
      current[participantModalTrackId] = [
        ...current[participantModalTrackId],
        saved,
      ];
      return { ...ev, participants: current };
    });

    setParticipantModalOpen(false);
    setPForm({
      id: "",
      presenterName: "",
      problemStatement: "",
      file: null,
      fileName: "",
      mode: "",
      email: "",
      phone: "",
    });
  };

  const deleteParticipant = (trackId, participantId) => {
    if (!confirm("Delete participant?")) return;

    setEvent((ev) => {
      const current = { ...(ev.participants || {}) };
      current[trackId] = (current[trackId] || []).filter(
        (p) => p.paperId !== participantId
      );
      return { ...ev, participants: current };
    });
  };

  const step4Valid =
    Array.isArray(event.tracks) &&
    event.tracks.length > 0 &&
    event.tracks.every((tr) => scByTrack[tr.id] !== null);





  /* ---------------------------- Save & Next ------------------------------- */
  const markCompleted = (id) => {
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const saveEventToBackend = async (evToSave) => {
    console.log("SAVE EVENT CALLED", {
      isEdit,
      eventId: evToSave._id,
      payload: evToSave,
    });

    try {
      // For edit: use PUT (if evToSave.id looks like Mongo _id), else POST
      const existsId = evToSave._id;
      if (isEdit && existsId) {
        // update the event on backend
        const url = `${API_BASE}/api/admin/events/${existsId}`;
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: evToSave.title,
            description: evToSave.description,
            date: evToSave.date,
            tracks: evToSave.tracks,
            sessionChairs: evToSave.sessionChairs,
            studentCoordinators: evToSave.studentCoordinators,
          }),

        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update event");
        // reflect update
        if (setEvents)
          setEvents((prev) =>
            prev.map((p) =>
              p._id === existsId || p.id === existsId ? data.event : p
            )
          );
        return { success: true, event: data.event };
      } else {
        const res = await fetch(`${API_BASE}/api/admin/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: evToSave.title,
            description: evToSave.description,
            date: evToSave.date,
            tracks: evToSave.tracks,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create event");
        return { success: true, event: data.event };
      }
    } catch (err) {
      console.error("Error saving to backend:", err);
      return { success: false, error: err.message || "" };
    }
  };




  const saveAndNext = async () => {
    // 🔥 ALWAYS persist when editing
    if (isEdit && activeStep === 4) {
      setSaving(true);
      try {
        await persistFullEditEvent(event);
      } finally {
        setSaving(false);
      }
    }


    if (activeStep === 1) {
      if (!step1Valid) return alert("Complete Step 1");
      markCompleted(1);
      setActiveStep(2);
    }
    else if (activeStep === 2) {
      if (!step2Valid) return alert("Add at least one track");
      markCompleted(2);
      setActiveStep(3);
    }
    else if (activeStep === 3) {
      if (!step3Valid) return alert("Fix session chairs");
      markCompleted(3);
      setActiveStep(4);
    }
    else if (activeStep === 4) {
      if (!step4Valid) return alert("Fix student coordinators");

      markCompleted(4);

      if (!isEdit) {
        // CREATE MODE ONLY
        const result = await saveEventToBackend(event);
        if (!result.success) {
          alert("Save failed");
          return;
        }
      }

      setSuccessMessage(
        isEdit
          ? "✅ Event updated successfully"
          : "✅ Event created successfully"
      );
      return;
    }
  };


  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(""), 3500);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  if (isEdit && !event.tracks) {
    return (
      <div className="p-6 text-gray-600">
        Loading event data...
      </div>
    );
  }



  /* ------------------------------- UI Render ----------------------------- */
  return (
    <div className="flex-1 flex">
      {/* leftmost sidebar anchored to left */}
      <aside className="w-64 bg-white/80 border-r border-green-200 min-h-[calc(100vh-80px)] p-4">
        <div className="flex flex-col gap-3 sticky top-6">
          {stepDefs.map((s) => {
            const active = s.id === activeStep;
            const done = completed.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (done || active) setActiveStep(s.id);
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border font-medium text-left transition ${active
                  ? "border-green-500 text-green-700 bg-green-50"
                  : done
                    ? "bg-green-600 text-white"
                    : "border-green-100 text-gray-600 hover:bg-green-50"
                  }`}
              >
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded-full font-semibold ${done
                    ? "bg-green-500 text-white"
                    : active
                      ? "border-2 border-green-500 text-green-700"
                      : "border border-gray-300 text-gray-500"
                    }`}
                >
                  {s.id}
                </span>
                <div>
                  <div>{s.label}</div>
                </div>
              </button>
            );
          })}
          <div className="mt-4">
            <button
              onClick={() => {
                if (isDirty && !successMessage) {
                  const ok = confirm(
                    "You have unsaved changes. If you leave now, they will be lost. Continue?"
                  );
                  if (!ok) return;
                }
                navigate("/dashboard");
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition flex items-center justify-center w-full sm:w-auto gap-2"
            >
              ← Back to Dashboard
            </button>

          </div>
        </div>
      </aside>

      {/* main content stretches to rightmost */}
      <section className="flex-1 p-6 overflow-auto relative w-full">
        {successMessage && (
          <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-100 text-green-800">
            {successMessage}
          </div>
        )}

        {/* Step 1 */}
        {activeStep === 1 && (
          <div className="w-full max-w-5xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Basic Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Event Title *
                </label>
                <input
                  value={event.title}
                  onChange={(e) =>
                    setEvent({ ...event, title: e.target.value })
                  }
                  className="w-full border border-green-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-300"
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={event.description}
                  onChange={(e) =>
                    setEvent({ ...event, description: e.target.value })
                  }
                  className="w-full border border-green-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-300"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Event Date *
                </label>
                <input
                  type="date"
                  value={event.date}
                  onChange={(e) => setEvent({ ...event, date: e.target.value })}
                  className="w-full border border-green-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {activeStep === 2 && (
          <div className="max-w-4xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Tracks</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Track Title *
                </label>
                <input
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  className="w-full border border-green-200 rounded-md px-3 py-2"
                  placeholder="e.g. AI & ML"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  value={tDesc}
                  onChange={(e) => setTDesc(e.target.value)}
                  className="w-full border border-green-200 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Track scope"
                />
              </div>
              <div className="flex gap-2">
                {editingTrackId ? (
                  <>
                    <button
                      onClick={updateTrack}
                      className="px-4 py-2 bg-yellow-500 text-white rounded"
                    >
                      Update Track
                    </button>
                    <button
                      onClick={() => {
                        setEditingTrackId(null);
                        setTTitle("");
                        setTDesc("");
                      }}
                      className="px-4 py-2 border rounded"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={addTrack}
                    className="px-4 py-2 bg-green-600 text-white rounded"
                  >
                    Add Track
                  </button>
                )}

              </div>

              {event.tracks.length > 0 && (
                <div className="mt-4 space-y-2">

                  {event.tracks.map((tr) => (
                    <div
                      key={tr.id}
                      className="flex justify-between items-start border border-green-100 rounded-md p-3 bg-white"
                    >
                      <div>
                        <p className="font-semibold text-green-700">
                          {tr.id} — {tr.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {tr.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-3">
                          <button
                            onClick={() => editTrack(tr)}
                            className="text-blue-600 text-sm"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteTrack(tr.id)}
                            className="text-red-600 text-sm"
                          >
                            Delete
                          </button>

                        </div>
                      </div>


                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {activeStep === 3 && (
          <div className="max-w-4xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Session Chairs
            </h2>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  value={chairForm.name}
                  onChange={(e) =>
                    setChairForm({ ...chairForm, name: e.target.value })
                  }
                  className="w-full border border-green-200 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  value={chairForm.email}
                  onChange={(e) =>
                    setChairForm({ ...chairForm, email: e.target.value })
                  }
                  className="w-full border border-green-200 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone *
                </label>
                <input
                  value={chairForm.phone}
                  onChange={(e) =>
                    setChairForm({ ...chairForm, phone: e.target.value })
                  }
                  className="w-full border border-green-200 rounded-md px-3 py-2"
                  placeholder="10 digits"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type *
                </label>
                <select
                  value={chairForm.type}
                  onChange={(e) =>
                    setChairForm({ ...chairForm, type: e.target.value })
                  }
                  className="w-full border border-green-200 rounded-md px-3 py-2"
                >
                  <option value="">Select</option>
                  <option>Internal</option>
                  <option>External</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password (auto-generated if left empty)
                </label>
                <input
                  type="text"
                  value={chairForm.password}
                  onChange={(e) =>
                    setChairForm({ ...chairForm, password: e.target.value })
                  }
                  className="w-full border border-green-200 rounded-md px-3 py-2"
                  placeholder="Leave blank to auto-generate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Assign Track *
                </label>
                <select
                  value={chairForm.trackId}
                  onChange={(e) =>
                    setChairForm({ ...chairForm, trackId: e.target.value })
                  }
                  className="w-full border border-green-200 rounded-md px-3 py-2"
                >
                  <option value="">Select Track</option>
                  {event.tracks.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {chairForm.id ? (
                <button
                  onClick={updateChair}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md"
                >
                  Update Chair
                </button>
              ) : (
                <button
                  onClick={addChair}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add Chair
                </button>
              )}
            </div>

            {!step3Valid && event.sessionChairs.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-md mb-4">
                ⚠ Each track must have exactly one Internal and one External
                chair.
              </div>
            )}

            {event.sessionChairs.length > 0 && (
              <div className="space-y-2">
                {event.tracks.map(tr => {
                  const chairs = event.sessionChairs.filter(
                    c => c.trackId === tr.id
                  );

                  if (chairs.length === 0) return null;

                  return (
                    <div
                      key={tr.id}
                      className="border border-green-200 rounded-lg p-4 mb-4 bg-green-50"
                    >
                      <h3 className="font-semibold text-green-800 mb-2">
                        Track: {tr.title}
                      </h3>

                      <div className="space-y-2">
                        {chairs.map(c => (
                          <div
                            key={c.id}
                            className="flex justify-between items-start border rounded-md p-3 bg-white"
                          >
                            <div>
                              <p className="font-semibold">
                                {c.name}
                                <span
                                  className={`ml-2 text-xs px-2 py-0.5 rounded ${c.type === "Internal"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                                    }`}
                                >
                                  {c.type}
                                </span>
                              </p>
                              <p className="text-sm text-gray-600">
                                {c.email} • {c.phone}
                              </p>
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={() => editChair(c.id)}
                                className="text-blue-600 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteChair(c.id)}
                                className="text-red-600 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

              </div>
            )}
          </div>
        )}

        {/* Step 4 Participants */}
        {activeStep === 4 && (
          <div className="max-w-4xl">
            <h2 className="text-xl font-semibold mb-4">
              Student Coordinator
            </h2>

            {/* ---- FORM ---- */}
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                placeholder="Name"
                value={studentForm.name}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, name: e.target.value })
                }
                className="border px-3 py-2 rounded"
              />

              <input
                placeholder="Email"
                value={studentForm.email}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, email: e.target.value })
                }
                className="border px-3 py-2 rounded"
              />

              <input
                placeholder="Phone"
                value={studentForm.phone}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, phone: e.target.value })
                }
                className="border px-3 py-2 rounded"
              />

              <input
                placeholder="Password (auto if empty)"
                value={studentForm.password}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, password: e.target.value })
                }
                className="border px-3 py-2 rounded"
              />

              <select
                value={studentForm.trackId}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, trackId: e.target.value })
                }
                className="border px-3 py-2 rounded sm:col-span-2"
              >
                <option value="">Assign Track</option>
                {event.tracks.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.title}
                  </option>
                ))}
              </select>
            </div>

            {/* ---- ACTION BUTTON ---- */}
            <div className="mt-4">
              {studentForm.id ? (
                <button
                  onClick={updateStudent}
                  className="px-4 py-2 bg-yellow-500 text-white rounded"
                >
                  Update Student
                </button>
              ) : (
                <button
                  onClick={addStudentCoordinator}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Add Student Coordinator
                </button>
              )}
            </div>

            {/* ---- LIST BY TRACK ---- */}
            <div className="mt-6 space-y-4">
              {event.tracks.map((tr) => {
                const coordinator = scByTrack[tr.id];

                return (
                  <div
                    key={tr.id}
                    className="border border-green-200 rounded-lg p-4 bg-green-50"
                  >
                    <h3 className="font-semibold text-green-800 mb-2">
                      Track: {tr.title}
                    </h3>

                    {coordinator ? (
                      <div className="flex justify-between items-start border rounded-md p-4 bg-white">
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-800">
                            {coordinator.name}
                          </p>

                          <p className="text-sm text-gray-600">
                            📧 {coordinator.email}
                          </p>

                          <p className="text-sm text-gray-600">
                            📞 {coordinator.phone}
                          </p>

                          <p className="text-sm text-gray-500 italic">
                            🔐 Password: •••••••• (hidden)
                          </p>

                          <p className="text-sm text-gray-700">
                            🧭 Track:{" "}
                            <span className="font-medium">{tr.title}</span>
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              setStudentForm({
                                id: coordinator._id,
                                name: coordinator.name,
                                email: coordinator.email,
                                phone: coordinator.phone,
                                password: "",
                                trackId: tr.id,
                              })
                            }
                            className="text-blue-600 text-sm font-medium"
                          >
                            Edit
                          </button>

                          <button
                            onClick={async () => {
                              if (!confirm("Delete student coordinator?")) return;

                              await fetch(
                                `${API_BASE}/api/admin/student-coordinator`,
                                {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    eventId: event._id,
                                    trackId: tr.id,
                                  }),
                                }
                              );

                              setScByTrack((prev) => ({
                                ...prev,
                                [tr.id]: null,
                              }));
                            }}
                            className="text-red-600 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        No student coordinator assigned for this track
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        )}


        {/* Fixed Save & Next (bottom-right of viewport) */}
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={saveAndNext}
            disabled={saving}
            className={`px-6 py-3 rounded-lg font-semibold shadow-md transition ${saving
              ? "bg-gray-400 text-white cursor-not-allowed"
              : (activeStep === 1 && step1Valid) ||
                (activeStep === 2 && step2Valid) ||
                (activeStep === 3 && step3Valid) ||
                (activeStep === 4 && step4Valid)
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
          >
            {saving
              ? "Saving..."
              : activeStep === 4
                ? isEdit
                  ? "Save Changes"
                  : "Create Event"
                : "Save & Next"}
          </button>


        </div>

        {/* Participant Modal */}
        {participantModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-100/60 backdrop-blur-sm px-4">
            <div className="relative w-full max-w-2xl bg-white/95 border border-green-200 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Add Participant — Track {participantModalTrackId}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Participant ID
                  </label>
                  <div className="mt-1 text-sm text-gray-800 font-semibold">
                    {pForm.id || genParticipantId(participantModalTrackId)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Presenter Name *
                  </label>
                  <input
                    value={pForm.presenterName}
                    onChange={(e) =>
                      setPForm({ ...pForm, presenterName: e.target.value })
                    }
                    className="w-full border border-green-200 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Problem Statement *
                  </label>
                  <input
                    value={pForm.problemStatement}
                    onChange={(e) =>
                      setPForm({ ...pForm, problemStatement: e.target.value })
                    }
                    className="w-full border border-green-200 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Research Paper (PDF / DOCX) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPForm({ ...pForm, file, fileName: file.name });
                      }
                    }}
                    className="w-full"
                  />
                  {pForm.fileName && (
                    <div className="text-xs text-gray-500 mt-1">
                      {pForm.fileName}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Presentation Mode *
                  </label>
                  <select
                    value={pForm.mode}
                    onChange={(e) =>
                      setPForm({ ...pForm, mode: e.target.value })
                    }
                    className="w-full border border-green-200 rounded-md px-3 py-2"
                  >
                    <option value="">Select</option>
                    <option>Online</option>
                    <option>Offline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Presenter Email *
                  </label>
                  <input
                    value={pForm.email}
                    onChange={(e) =>
                      setPForm({ ...pForm, email: e.target.value })
                    }
                    className="w-full border border-green-200 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Presenter Phone *
                  </label>
                  <input
                    value={pForm.phone}
                    onChange={(e) =>
                      setPForm({ ...pForm, phone: e.target.value })
                    }
                    className="w-full border border-green-200 rounded-md px-3 py-2"
                    placeholder="10 digits"
                  />
                </div>
              </div>

              {/* modal footer: Save Participant bottom-right inside modal */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setParticipantModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-md border border-green-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addParticipant();
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Save Participant
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* -------------------------- Event Details Page -------------------------- */
function EventDetails({ events, setEvents }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [local, setLocal] = useState(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [sessionChairs, setSessionChairs] = useState([]);
  const [studentCoordinator, setStudentCoordinator] = useState(null);
  const [trackStats, setTrackStats] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  useEffect(() => {
    if (!local || !Array.isArray(local.tracks)) return;
    if (selectedTrackId) return;

    const firstTrack = local.tracks[0];
    if (firstTrack?.id) {
      setSelectedTrackId(firstTrack.id);
    }
  }, [local, selectedTrackId]);

  useEffect(() => {
    if (!local?._id) return;

    fetch(`${API_BASE}/api/admin/session-chairs/${local._id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSessionChairs(data.chairs || []);
        }
      });
  }, [local]);

  useEffect(() => {
    if (!local?._id || !selectedTrackId) return;

    // 🔥 RESET before fetch
    setStudentCoordinator(null);

    fetch(
      `${API_BASE}/api/admin/student-coordinator?eventId=${local._id}&trackId=${selectedTrackId}`
    )
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStudentCoordinator(data.coordinator);
        }
      });
  }, [local, selectedTrackId]);



  useEffect(() => {
    let cancelled = false;

    const loadEvent = async () => {
      // 1️⃣ First try from already-loaded events list
      if (Array.isArray(events) && events.length > 0) {
        const ev = events.find((e) => e._id === id || e.id === id);

        if (ev) {
          if (cancelled) return;

          setLocal({
            _id: ev._id,
            id: ev._id || ev.id,
            title: ev.title || "",
            description: ev.description || "",
            date: ev.date || "",
            tracks: Array.isArray(ev.tracks) ? ev.tracks : [],
            participants: ev.participants || {},
            studentCoordinators: Array.isArray(ev.studentCoordinators)
              ? ev.studentCoordinators.map((s) => ({
                ...s,
                trackId:
                  typeof s.trackId === "object"
                    ? s.trackId._id || s.trackId.id
                    : s.trackId,
              }))
              : [],
            sessionChairs: [], // loaded separately if needed
            criteria: ev.criteria || [],
            allowDirectTotal: ev.allowDirectTotal ?? true,
          });

          return;
        }
      }

      // 2️⃣ Fallback: fetch single event from backend
      try {
        const res = await fetch(
          `${API_BASE}/api/admin/events/${encodeURIComponent(id)}`
        );

        if (!res.ok) return;

        const data = await res.json();

        if (!data?.event || cancelled) return;

        setLocal({
          _id: data.event._id,
          id: data.event._id,
          title: data.event.title || "",
          description: data.event.description || "",
          date: data.event.date || "",
          tracks: Array.isArray(data.event.tracks)
            ? data.event.tracks
            : [],
          participants: data.event.participants || {},
          studentCoordinators: Array.isArray(data.event.studentCoordinators)
            ? data.event.studentCoordinators.map((s) => ({
              ...s,
              trackId:
                typeof s.trackId === "object"
                  ? s.trackId._id || s.trackId.id
                  : s.trackId,
            }))
            : [],
          sessionChairs: [],
          criteria: data.event.criteria || [],
          allowDirectTotal: data.event.allowDirectTotal ?? true,
        });
      } catch (err) {
        console.error("Fetching single event failed:", err);
      }
    };

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [events, id]);

  useEffect(() => {
    if (!local?._id) return;

    fetch(`${API_BASE}/api/admin/participants/stats?eventId=${local._id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTrackStats(data.stats || {});
        }
      });
  }, [local]);
  const getProgressColor = (assessed, total) => {
    if (!total || total === 0) return "bg-gray-300";

    const percent = (assessed / total) * 100;

    if (percent <= 20) return "bg-red-500";
    if (percent <= 40) return "bg-orange-500";
    if (percent <= 60) return "bg-yellow-500";
    if (percent <= 80) return "bg-lime-500";
    return "bg-green-600";
  };


  if (!local) {
    return (
      <div className="flex-1 p-6">
        <div className="w-full mt-6 px-6">
          <div className="p-6 bg-white/80 border border-green-200 rounded-lg">
            <p className="text-gray-600">Event not found.</p>
            <div className="mt-3">
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition flex items-center justify-center w-fit gap-2"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const updateTrackField = (trackId, field, value) => {
    setLocal((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.id === trackId ? { ...t, [field]: value } : t
      ),
    }));
  };

  const updateLocalToGlobal = async () => {

    try {
      // Save to backend (PUT)
      const idToSave = local._id || local.id;
      const res = await fetch(
        `${API_BASE}/api/admin/events/${encodeURIComponent(idToSave)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(local),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        alert("Save failed: " + (data.message || "Server error"));
        return false;
      }
      // update parent list
      setEvents((prev) =>
        prev.map((e) =>
          e._id === idToSave || e.id === idToSave ? data.event : e
        )
      );
      setSaveConfirmOpen(true);
      setTimeout(() => setSaveConfirmOpen(false), 1800);
      return true;
    } catch (err) {
      console.error("Error saving event:", err);
      alert("Unable to save event to server.");
      return false;
    }
  };

  const getTrackTitle = (trackId) => {
    const t = local.tracks.find((x) => x.id === trackId);
    return t ? t.title : "—";
  };

  const toggleAssessmentLock = async (trackId) => {
    const track = local.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const res = await fetch(
      `${API_BASE}/api/admin/tracks/${local._id}/${trackId}/lock`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !track.assessmentLocked }),
      }
    );

    const data = await res.json();
    if (!data.success) {
      alert("Failed to update lock");
      return;
    }

    // ✅ RE-FETCH EVENT FROM BACKEND (single source of truth)
    const refreshed = await fetch(
      `${API_BASE}/api/admin/events/${local._id}`
    ).then((r) => r.json());

    if (refreshed.success) {
      setLocal((prev) => ({
        ...prev,
        tracks: refreshed.event.tracks,
      }));
    }
  };



  return (
    <div className="absolute inset-0 p-6 flex flex-col overflow-hidden">
      <div className="flex items-start justify-between mb-6 shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm w-full">
          <h2 className="text-2xl font-semibold text-gray-800">
            {local.title}
          </h2>

          <p className="text-sm text-gray-600 text-justify mt-0">
            {local.description}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-500 mt-2">
              Date: {local.date}
            </p>


            <div className="flex items-center gap-3">

              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>


        </div>


      </div>


      <div className="flex flex-1 border rounded-xl overflow-hidden relative min-h-0">

        {/* 🟢 LEFT SIDEBAR */}
        {/* 🟢 LEFT SIDEBAR */}
        <aside
          className={`
    fixed inset-y-0 left-0
    z-50
    w-72 bg-white border-r border-green-100
    flex flex-col
    transform transition-transform duration-300
    md:static md:translate-x-0 md:z-auto
    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
  `}
        >
          {/* Sidebar Header */}
          <div className="relative px-5 py-4 border-b bg-gradient-to-r from-green-50 to-white">
            <h3 className="text-lg font-bold text-green-700 tracking-wide">
              Tracks
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Select a track to view details
            </p>

            {/* ❌ Close button (mobile only) */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-500 md:hidden"
            >
              ✕
            </button>
          </div>


          {/* Track List */}
          <div className="flex-1 overflow-y-auto">

            {local.tracks.map((tr) => {
              const active = selectedTrackId === tr.id;

              return (
                <button
                  key={tr.id}
                  onClick={() => {
                    setSelectedTrackId(tr.id);
                    setIsSidebarOpen(false); // 👈 auto-close sidebar
                  }}
                  className={`relative w-full px-5 py-4 text-left transition group ${active ? "bg-green-50" : "hover:bg-gray-50"
                    }`}
                >

                  {/* Active indicator */}
                  {active && (
                    <span className="absolute left-0 top-0 h-full w-1 bg-green-600 rounded-r" />
                  )}

                  <div className="flex flex-col gap-0.5">

                    {/* ✅ Track ID */}
                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                      Track ID: {tr.id}
                    </span>

                    {/* ✅ Track Title */}
                    <span
                      className={`text-sm font-semibold ${active ? "text-green-700" : "text-gray-800"
                        }`}
                    >
                      {tr.title}
                    </span>

                    {/* ✅ Assessment count */}
                    <span className="text-xs text-gray-500 mt-1">
                      Assessed:{" "}
                      <span className="font-semibold text-green-700">
                        {trackStats[tr.id]?.assessed ?? 0}
                      </span>
                      {" / "}
                      {trackStats[tr.id]?.total ?? 0}
                    </span>

                    {/* ✅ Progress bar (UNCHANGED) */}
                    {trackStats[tr.id] && (
                      <div className="mt-1 w-full bg-gray-200 rounded h-1">
                        <div
                          className={`${getProgressColor(
                            trackStats[tr.id]?.assessed ?? 0,
                            trackStats[tr.id]?.total ?? 0
                          )} h-1 rounded transition-all duration-500`}
                          style={{
                            width: `${trackStats[tr.id].total === 0
                              ? 0
                              : (trackStats[tr.id].assessed /
                                trackStats[tr.id].total) * 100
                              }%`
                          }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </aside>
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
          />
        )}


        {/* 🟢 RIGHT CONTENT */}
        {/* 🟢 RIGHT CONTENT */}
        <section className="flex-1 p-4 md:p-6 overflow-auto bg-green-50/40">

          {/* 📱 MOBILE: Track selector button */}
          <div className="mb-4 md:hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="
        w-full flex items-center justify-between
        px-4 py-2 rounded-lg
        bg-white border border-green-200
        text-green-700 font-semibold
      "
            >
              {selectedTrackId
                ? `Track ${selectedTrackId}`
                : "Select Track"}
              <span className="text-lg">☰</span>
            </button>
          </div>

          {/* 🟢 MAIN CONTENT */}
          {selectedTrackId ? (
            <TrackDetails
              eventId={local._id}
              trackId={selectedTrackId}
              local={local}
              studentCoordinator={studentCoordinator}
              sessionChairs={sessionChairs}
              onToggleAssessmentLock={toggleAssessmentLock}
            />
          ) : (
            <div className="text-gray-600">
              Select a track to view details
            </div>
          )}

        </section>


      </div>







      {/* Save confirmation modal */}
      {saveConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-green-100/60 backdrop-blur-sm px-4">
          <div className="bg-white/95 border border-green-200 rounded-xl p-6 shadow-xl">
            <div className="text-green-700 font-semibold text-lg">
              ✅ Changes saved successfully!
            </div>
          </div>
        </div>
      )}

      {/* Fixed Save All (bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50">
      </div>
    </div>
  );

}

function TrackDetails({
  eventId,          // ✅ ADD THIS
  trackId,
  local,
  studentCoordinator,
  sessionChairs,
  onToggleAssessmentLock,
}) {



  const tracks = Array.isArray(local?.tracks) ? local.tracks : [];
  const track = tracks.find((t) => t.id === trackId);
  const criteriaList = local?.criteria?.length ? local.criteria : ASSESSMENT_CRITERIA.map(name => ({ name, maxMarks: 10 }));
  const maxTotalMarks = criteriaList.reduce((sum, c) => sum + (Number(c.maxMarks) || 10), 0);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const [filterInstitute, setFilterInstitute] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [marksRange, setMarksRange] = useState([0, 50]);
  const [topLimit, setTopLimit] = useState(0); // 0 = no limit
  const [editingAssessment, setEditingAssessment] = useState(false);
  const isAdmin = sessionStorage.getItem("care_role") === "admin";
  const [assessmentMode, setAssessmentMode] = useState("criteria");
  // "criteria" | "total"

  const [adminAssessmentForm, setAdminAssessmentForm] = useState({
    criteria: [],
    comments: [],
    total: 0,
    notes: "",
  });



  const handleAdminSaveMarks = async () => {
    const isCriteriaMode =
      selectedParticipant.assessment?.criteria?.length > 0;

    const payload = isCriteriaMode
      ? {
        assessment: {
          criteria: adminAssessmentForm.criteria,
          comments: adminAssessmentForm.comments,
          total: adminAssessmentForm.criteria.reduce(
            (s, v) => s + Number(v || 0),
            0
          ),
        },
      }
      : {
        assessment: {
          total: adminAssessmentForm.total,
          notes: adminAssessmentForm.notes,
        },
      };

    await fetch(
      `${API_BASE}/api/admin/participants/${selectedParticipant._id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );


    setEditingAssessment(false);
  };



  const chairs = (sessionChairs || []).filter(
    (c) => String(c.trackId) === String(trackId)
  );
  const trackSessionChairs = sessionChairs.filter(
    (c) => String(c.trackId) === String(trackId)
  );

  useEffect(() => {
    if (!selectedParticipant) return;

    const a = selectedParticipant.assessment || {};
    const isCriteriaMode =
      Array.isArray(a.criteria) && a.criteria.length > 0;

    setAssessmentMode(isCriteriaMode ? "criteria" : "total");

    let parsedComments = isCriteriaMode ? [...(a.comments || [])] : [];
    let parsedNotes = a.notes || "";
    if (parsedNotes.startsWith("JSON:")) {
      try {
        parsedComments = JSON.parse(parsedNotes.substring(5));
        parsedNotes = "";
      } catch (e) { }
    }

    setAdminAssessmentForm({
      criteria: isCriteriaMode ? [...a.criteria] : [],
      comments: parsedComments,
      total: a.total ?? 0,
      notes: parsedNotes,
    });

    setEditingAssessment(false);
  }, [selectedParticipant]);


  useEffect(() => {
    if (!eventId || !trackId) return;

    const fetchParticipants = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/participants/by-track?eventId=${eventId}&trackId=${trackId}`
        );

        const data = await res.json();

        if (data.success) {
          const mapped = data.participants.map(p => {
            const leader = p.members?.find(m => m.isLeader) || p.members?.[0] || {};
            return {
              ...p,
              paperId: p.teamId || p._id,
              teamName: p.teamName || "",
              problemStatement: p.problemStatement || "",
              presenterName: leader.name || "Unknown",
              email: leader.email || "",
              phone: leader.mobile || "",
              institute: leader.organisation || "",
              branch: leader.domain || leader.specialization || ""
            };
          });
          setParticipants(mapped);
        } else {
          setParticipants([]);
        }
      } catch (err) {
        console.error("Failed to fetch participants", err);
        setParticipants([]);
      }
    };

    fetchParticipants();
  }, [eventId, trackId]);






  const filteredParticipants = participants
    .filter((p) => {
      const instituteMatch =
        !filterInstitute ||
        p.institute?.toLowerCase().includes(filterInstitute.toLowerCase());

      const branchMatch =
        !filterBranch ||
        p.branch?.toLowerCase().includes(filterBranch.toLowerCase());

      const marks = p.assessment?.total ?? -1;
      const marksMatch =
        marks === -1 ||
        (marks >= marksRange[0] && marks <= marksRange[1]);

      return instituteMatch && branchMatch && marksMatch;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;

      let valA, valB;

      if (sortBy === "paperId") {
        valA = a.paperId;
        valB = b.paperId;
      }

      if (sortBy === "marks") {
        valA = a.assessment?.total ?? -1;
        valB = b.assessment?.total ?? -1;
      }

      if (sortOrder === "asc") {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    })
    .slice(0, topLimit > 0 ? topLimit : participants.length);

  const exportParticipantsCSV = () => {
    if (!filteredParticipants.length) {
      alert("No participants to export");
      return;
    }

    const headers = [
      "S.No",
      "Team ID",
      "Team Name",
      "Presenter Name",
      "Problem Statement",
      "Track Name",
      "Institute",
      "Branch",
      "Email",
      "Phone",
      "Marks",
    ];


    const rows = filteredParticipants.map((p, index) => [
      index + 1,
      p.paperId,
      p.teamName,
      p.presenterName,
      p.problemStatement,
      track.title,
      p.institute || "",
      p.branch || "",
      p.email || "",
      p.phone || "",
      p.status === "EVALUATED"
        ? p.assessment.total
        : "Pending",
    ]);


    const csvContent =
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) =>
              `"${String(cell).replace(/"/g, '""')}"`
            )
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `IKIGAI_2026_Participants_Track_${trackId}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };



  const exportParticipantsXLSX = () => {
    if (!filteredParticipants.length) {
      alert("No participants to export");
      return;
    }

    const rows = filteredParticipants.map((p, index) => ({
      "S.No": index + 1,
      "Team ID": p.paperId,
      "Team Name": p.teamName,
      "Problem Statement": p.problemStatement,
      "Track Name": track.title,    // ✅ ADD
      "Presenter Name": p.presenterName,
      "Email": p.email,
      "Phone": p.phone,
      "Institute": p.institute,
      "Branch": p.branch,
      "Marks": p.assessment?.total ?? "Pending",
      "Remarks": p.assessment?.remarks ?? "",
      "Submission Link": p.submissionLink ?? "",
      "Co-Authors": p.coAuthors?.map(
        (c) => `${c.name} (${c.email})`
      ).join("; "),
    }));


    const worksheet = XLSX.utils.json_to_sheet(rows);

    // ✅ AUTO COLUMN WIDTH (KEY REQUIREMENT)
    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch: Math.max(
        key.length,
        ...rows.map((r) => String(r[key] ?? "").length)
      ) + 2,
    }));

    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Participants"
    );

    XLSX.writeFile(
      workbook,
      `IKIGAI_2026_Participants_Track_${track.id}.xlsx`
    );
  };


  const exportParticipantsPDF = () => {
    if (!filteredParticipants || filteredParticipants.length === 0) {
      alert("No participants to export");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");

    /* =========================
       GLOBAL FONT SETUP
    ========================= */
    doc.setFont("helvetica", "normal");

    /* =========================
       HEADER (IKIGAI 2026)
    ========================= */
    doc.setFillColor(250, 245, 255); // purple-50
    doc.rect(0, 0, 210, 34, "F");

    // Add the IKIGAI logo (left aligned, aspect ratio maintained)
    doc.addImage(ikigaiLogo, "PNG", 14, 8, 45, 15);

    // Add Assessment Report header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(107, 33, 168); // purple-800
    doc.text("Assessment Report", 105, 20, { align: "center" });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 196, 32);

    /* =========================
       META INFORMATION
    ========================= */
    let y = 40;

    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);

    doc.text(`Event: ${local?.title || "-"}`, 14, y);
    y += 6;

    doc.text(`Track: ${track?.id || "-"} – ${track?.title || "-"}`, 14, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Session Chairs:", 14, y);
    doc.setFont("helvetica", "normal");

    const trackSessionChairs = (sessionChairs || []).filter(
      (c) => String(c.trackId) === String(trackId)
    );

    const chairText =
      trackSessionChairs.length > 0
        ? trackSessionChairs.map((c) => `${c.name} (${c.type})`).join(", ")
        : "Not Assigned";

    doc.text(chairText, 45, y, { maxWidth: 140 });
    y += 12;

    /* =========================
       PARTICIPANT TABLE
    ========================= */
    const tableRows = filteredParticipants.map((p, index) => {
      let marks = "Pending";
      let isAbsent = false;

      if (typeof p?.assessment?.total === "number") {
        if (p.assessment.total === 0) {
          marks = "Absent";
          isAbsent = true;
        } else {
          marks = p.assessment.total;
        }
      }

      const leaderName = p.members?.find(m => m.isLeader)?.name || p.members?.[0]?.name || p.presenterName || "";

      return [
        index + 1,
        p.paperId || "",
        p.teamName || "",
        p.problemStatement || "",
        leaderName,
        p.phone || "",
        p.email || "",
        {
          content: marks,
          styles: isAbsent
            ? { textColor: [220, 38, 38], fontStyle: "bold" }
            : {},
        },
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [[
        "S.No",
        "Team ID",
        "Team Name",
        "Problem Statement",
        "Team Leader",
        "Phone",
        "Email",
        "Marks",
      ]],
      body: tableRows,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3,
        valign: "middle",
      },
      headStyles: {
        fillColor: [107, 33, 168], // purple-800
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 15 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 22 },
        6: { cellWidth: 35 },
        7: { cellWidth: 20 },
      },
      margin: { left: 14, right: 14 },
      pageBreak: "auto",
    });

    /* =========================
       FOOTER
    ========================= */
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Generated for Ikigai 2026 • Page ${i} of ${pageCount}`,
        105,
        290,
        { align: "center" }
      );
    }

    /* =========================
       SAVE FILE
    ========================= */
    doc.save(
      `IKIGAI_2026_Report_Track_${track?.id || "Unknown"}.pdf`
    );
  };


  const submissionUrl =
    selectedParticipant?.submissionLink
      ? selectedParticipant.submissionLink.startsWith("http")
        ? selectedParticipant.submissionLink
        : `https://${selectedParticipant.submissionLink}`
      : "";

  if (!track) return null;

  return (
    <div className="space-y-8">

      {/* TRACK INFO */}
      {/* TRACK INFO */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-green-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start gap-6">

          {/* LEFT: Track details */}
          <div className="flex-1 md:pr-4">
            <h2 className="text-2xl font-bold text-green-700">
              {track.title}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Track ID: {track.id}
            </p>

            <p className="
        mt-4 text-sm text-gray-700
        text-justify leading-relaxed indent-6
      ">
              {track.description}
            </p>
          </div>

          {/* RIGHT / BELOW (mobile): Student Coordinator */}
          {studentCoordinator && (
            <div className="
        w-full md:w-64
        bg-green-50 border border-green-100
        rounded-xl p-4
        text-sm text-gray-700
        shrink-0
      ">
              <div className="font-semibold text-green-700 mb-2">
                Student Coordinator
              </div>

              <ul className="space-y-1">
                <li className="break-words">
                  {studentCoordinator.name}
                </li>

                <li className="flex items-center gap-1 min-w-0">
                  <span className="truncate" title={studentCoordinator.email}>
                    {studentCoordinator.email}
                  </span>
                </li>

                <li>
                  {studentCoordinator.phone}
                </li>
              </ul>
            </div>
          )}

        </div>
      </div>


      {/* ===== TRACK CONTROLS: LOCK ===== */}
      <div
        className="
    mt-5
    flex items-center justify-center
    rounded-xl border border-green-100
    bg-white p-4
  "
      >
        {/* 🔒 Assessment Lock */}
        <button
          onClick={() => onToggleAssessmentLock(trackId)}
          className={`px-5 py-2 rounded-md font-semibold w-full max-w-xs ${track.assessmentLocked
            ? "bg-red-600 text-white"
            : "bg-green-600 text-white"
            }`}
        >
          {track.assessmentLocked
            ? "Assessment Locked 🔒"
            : "Assessment Unlocked 🔓"}
        </button>
      </div>
      {/* EVALUATORS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {chairs.map((c) => (
          <div
            key={c._id}
            className="rounded-xl border border-green-100 p-4 bg-white shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-gray-800">
                  {c.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {c.type} Evaluator
                </div>
              </div>

              <span
                className={`px-2 py-1 text-xs rounded-full ${c.type === "Internal"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700"
                  }`}
              >
                {c.type}
              </span>
            </div>

            <div className="text-sm text-gray-600 mt-3">
              {c.email}
            </div>
            <div className="text-sm text-gray-600">
              {c.phone}
            </div>

            {/* ✅ RESEND INVITATION BUTTON */}
            <button
              onClick={async () => {
                if (!window.confirm("Resend invitation email to this chair?")) return;

                const res = await fetch(
                  `${API_BASE}/api/admin/session-chairs/${c._id}/resend-invite`,
                  { method: "POST" }
                );

                const data = await res.json();

                if (data.success) {
                  alert("Invitation email resent successfully.");
                } else {
                  alert(data.message || "Failed to resend invitation");
                }
              }}
              className="mt-3 text-sm text-green-700 hover:underline"
            >
              Resend Invitation
            </button>
          </div>
        ))}
      </div>




      {/* PARTICIPANTS SECTION */}
      <div className="bg-white rounded-2xl border border-green-100 p-5 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-green-700">
            Participants
          </h3>
          <span className="text-sm text-gray-500">
            Total: {filteredParticipants.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportParticipantsCSV}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
          >
            Export CSV
          </button>

          <button
            onClick={exportParticipantsXLSX}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
          >
            Export XLSX
          </button>

          <button
            onClick={exportParticipantsPDF}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition"
          >
            Export PDF
          </button>
        </div>


        {/* Controls */}
        <div className="flex flex-col gap-4">

          {/* ================= SORTING ================= */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">
              Sort
            </span>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">Select field</option>
              <option value="paperId">Team ID</option>
              <option value="marks">Total Marks</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>

            {/* Merit Limit */}
            <select
              value={topLimit}
              onChange={(e) => setTopLimit(Number(e.target.value))}
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value={0}>Show all</option>
              <option value={2}>Top 2</option>
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
            </select>
          </div>

          {/* ================= FILTERING ================= */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">
              Filter
            </span>

            {/* Institute */}
            <input
              type="text"
              placeholder="Institute"
              value={filterInstitute}
              onChange={(e) => setFilterInstitute(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
            />

            {/* Branch */}
            <input
              type="text"
              placeholder="Branch"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
            />

            {/* Marks Range */}
            <input
              type="number"
              placeholder="Min marks"
              className="border rounded-lg px-2 py-1.5 text-sm w-24"
              value={marksRange[0]}
              onChange={(e) =>
                setMarksRange([Number(e.target.value), marksRange[1]])
              }
            />

            <span className="text-gray-400 text-sm">–</span>

            <input
              type="number"
              placeholder="Max marks"
              className="border rounded-lg px-2 py-1.5 text-sm w-24"
              value={marksRange[1]}
              onChange={(e) =>
                setMarksRange([marksRange[0], Number(e.target.value)])
              }
            />
          </div>
        </div>


        {/* Participants List */}
        <div className="space-y-2">
          {/*PARTICIPANTS LIST */}
          <div className="space-y-2">
            {filteredParticipants.map((p, index) => (
              <div
                key={p._id}
                className="bg-white border border-green-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4 hover:shadow-sm transition"
              >
                {/* LEFT CONTENT */}
                <div className="flex-1 min-w-0">
                  {/* Top row */}
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1">

                    {/* Serial */}
                    <span className="text-xs text-gray-400">
                      #{index + 1}
                    </span>

                    {/* Team ID Tag */}
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      {p.paperId}
                    </span>

                    {/* Presenter Name */}
                    <span className="font-semibold text-gray-900">
                      {p.presenterName}
                    </span>
                  </div>

                  {/* Problem Statement and Team Name */}
                  <div className="mt-1 text-sm text-gray-700 truncate">
                    <b>Team:</b> {p.teamName} &nbsp;|&nbsp; <b>Problem:</b> {p.problemStatement}
                  </div>

                  {/* Institute + Branch */}
                  <div className="mt-0.5 text-xs text-gray-500 italic">
                    {p.institute} • {p.branch}
                  </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Marks */}
                  {p.status === "EVALUATED" ? (
                    <span className="font-semibold text-gray-800 flex items-center gap-1">
                      {sortBy === "marks" && sortOrder === "desc" && index === 0 && "🥇"}
                      {sortBy === "marks" && sortOrder === "desc" && index === 1 && "🥈"}
                      {sortBy === "marks" && sortOrder === "desc" && index === 2 && "🥉"}
                      {p.assessment?.total ?? "N/A"}
                    </span>
                  ) : (
                    <span className="text-xs italic text-gray-500">Pending</span>
                  )}


                  {/* View details */}
                  <button
                    onClick={() => setSelectedParticipant(p)}
                    className="text-xs font-medium text-green-700 hover:underline"
                  >
                    View details
                  </button>
                </div>
              </div>
            ))}
          </div>
          {selectedParticipant && (() => {
            const displayMembers = selectedParticipant.members?.length > 0
              ? selectedParticipant.members
              : [
                {
                  name: selectedParticipant.presenterName || "Unknown",
                  email: selectedParticipant.email,
                  mobile: selectedParticipant.phone,
                  institute: selectedParticipant.institute,
                  course: selectedParticipant.branch,
                  isLeader: true,
                  candidateRole: 'Presenter'
                },
                ...(selectedParticipant.coAuthors || []).map(c => ({
                  name: c.name,
                  email: c.email,
                  candidateRole: 'Co-Author',
                  isLeader: false
                }))
              ];

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                  {/* Modal Header */}
                  <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/80 px-6 py-5 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-purple-500"></div>
                    <button
                      onClick={() => setSelectedParticipant(null)}
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                    <div className="flex items-start justify-between pr-10">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight truncate">
                            {selectedParticipant.teamName || "Unnamed Team"}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 font-mono text-xs font-bold shadow-sm">
                            {selectedParticipant.paperId}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1.5 font-medium text-gray-700">
                            <CheckCircle size={15} className="text-emerald-500" />
                            {selectedParticipant.trackName || selectedParticipant.track || track?.title || "No Track"}
                          </span>
                          {(selectedParticipant.status || selectedParticipant.regStatus) && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="uppercase tracking-wider text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {selectedParticipant.status || selectedParticipant.regStatus}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Body (Scrollable) */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column (Project Details) */}
                        <div className="lg:col-span-1">
                          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 h-full">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <FileText size={16} className="text-violet-500" /> Project Details
                            </h3>

                            <div className="space-y-4 text-sm text-gray-700">
                              <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Problem Statement</span>
                                <p className="font-medium text-gray-900 leading-relaxed">{selectedParticipant.problemStatement || selectedParticipant.problemStatement || "—"}</p>
                              </div>

                              {selectedParticipant.description && (
                                <div>
                                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Description</span>
                                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedParticipant.description}</p>
                                </div>
                              )}

                              {(selectedParticipant.pptLink || selectedParticipant.submissionLink) && (
                                <div>
                                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Presentation</span>
                                  <a
                                    href={
                                      (selectedParticipant.pptLink || selectedParticipant.submissionLink).includes('drive.google.com') || (selectedParticipant.pptLink || selectedParticipant.submissionLink).includes('docs.google.com')
                                        ? (selectedParticipant.pptLink || selectedParticipant.submissionLink)
                                        : `https://docs.google.com/viewer?url=${encodeURIComponent(selectedParticipant.pptLink || selectedParticipant.submissionLink)}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-sm font-semibold transition-colors border border-violet-200"
                                  >
                                    <Link2 size={15} /> View PPT
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Column (Evaluation Tables) */}
                        <div className="lg:col-span-2">
                          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 h-full flex flex-col overflow-y-auto max-h-[600px] custom-scrollbar">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <CheckCircle size={16} className="text-emerald-500" /> Evaluation Records
                            </h3>

                            <div className="flex-1 space-y-6">
                              {selectedParticipant.assessments?.length > 0 ? (
                                selectedParticipant.assessments.map((assessment, aIdx) => {
                                  // Find evaluator name
                                  const evalIdToMatch = typeof assessment.evaluatorId === 'object' && assessment.evaluatorId ? assessment.evaluatorId._id : assessment.evaluatorId;
                                  const evaluator = selectedParticipant.assignedEvaluators?.find(e => String(e._id) === String(evalIdToMatch));
                                  const evaluatorName = assessment.evaluatorId?.name || evaluator?.name || assessment.evaluatedBy || `Evaluator ${aIdx + 1}`;

                                  let parsedComments = [];
                                  if (assessment.comments) {
                                    parsedComments = assessment.comments;
                                  } else if (assessment.notes?.startsWith("JSON:")) {
                                    try {
                                      parsedComments = JSON.parse(assessment.notes.substring(5));
                                    } catch (e) { }
                                  }

                                  return (
                                    <div key={aIdx} className="border border-violet-100 rounded-lg overflow-hidden shadow-sm">
                                      <div className="bg-violet-50 border-b border-violet-200 px-4 py-2.5 flex justify-between items-center">
                                        <div className="font-semibold text-violet-900 text-sm flex items-center gap-2">
                                          <span className="bg-violet-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{aIdx + 1}</span>
                                          {evaluatorName}
                                        </div>
                                        <div className="text-xs font-bold bg-white text-violet-700 px-2 py-1 rounded shadow-sm border border-violet-200">
                                          Total: {assessment.criteria?.reduce((s, v, idx) => s + (criteriaList[idx]?.inputType !== "text" && criteriaList[idx]?.inputType !== "boolean" ? Number(v || 0) : 0), 0) || assessment.total || 0}
                                        </div>
                                      </div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                          <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                              <th className="px-4 py-2 font-bold text-gray-700 whitespace-nowrap">Criteria</th>
                                              <th className="px-4 py-2 font-bold text-gray-700 text-center w-20">Marks</th>
                                              <th className="px-4 py-2 font-bold text-gray-700">Comments</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 bg-white">
                                            {criteriaList.map((c, idx) => (
                                              <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-2.5 text-gray-600 font-medium whitespace-nowrap">{c.name}</td>
                                                <td className="px-4 py-2.5 text-center font-bold text-gray-900">
                                                  {c.inputType === "boolean"
                                                    ? ((assessment.criteria?.[idx] === true || assessment.criteria?.[idx] === "true") ? "Shortlisted / Yes" : "No")
                                                    : c.inputType === "text"
                                                      ? (assessment.criteria?.[idx] || "-")
                                                      : (assessment.criteria?.[idx] ?? 0)}
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-600 text-xs italic">
                                                  {parsedComments[idx] || "No comment"}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 h-full min-h-[200px]">
                                  <span className="text-gray-400 mb-2">No assessments completed yet</span>
                                  <span className="text-xl text-violet-700 font-extrabold">Pending</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row (Team Members) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayMembers.map((m, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-violet-200 hover:shadow-md transition-all">
                            <div className={`absolute top-0 left-0 w-1 h-full ${m.isLeader ? 'bg-violet-500' : 'bg-gray-300 group-hover:bg-violet-300'}`}></div>

                            <div className="flex items-start justify-between mb-3">
                              <div className="min-w-0 pr-2">
                                <h4 className="font-bold text-gray-900 text-base truncate" title={m.name}>{m.name || "Unknown"}</h4>
                                <span className={`inline-block mt-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${m.isLeader ? 'text-violet-700 bg-violet-50 border border-violet-100' : 'text-gray-500 bg-gray-100'}`}>
                                  {m.candidateRole || (m.isLeader ? "Team Leader" : "Team Member")}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2.5 text-sm text-gray-600">
                              {m.email && (
                                <div className="flex items-center gap-2.5 truncate" title={m.email}>
                                  <Mail size={15} className="text-gray-400 flex-shrink-0" /> <span className="truncate">{m.email}</span>
                                </div>
                              )}
                              {m.mobile && (
                                <div className="flex items-center gap-2.5">
                                  <Phone size={15} className="text-gray-400 flex-shrink-0" /> <span>{m.mobile}</span>
                                </div>
                              )}
                              {m.location && (
                                <div className="flex items-center gap-2.5 truncate" title={m.location}>
                                  <MapPin size={15} className="text-gray-400 flex-shrink-0" /> <span className="truncate">{m.location}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                              {(m.institute || m.organisation) && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 truncate" title={m.institute || m.organisation}>
                                  <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                                  <span className="truncate font-medium">{m.institute || m.organisation}</span>
                                </div>
                              )}
                              {(m.course || m.branch || m.domain || m.specialization) && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 truncate" title={`${m.course || ''} ${m.branch || m.specialization || m.domain || ''}`}>
                                  <BookOpen size={13} className="text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{(m.course || '') + ((m.course && (m.branch || m.specialization || m.domain)) ? ' - ' : '') + (m.branch || m.specialization || m.domain || '')}</span>
                                </div>
                              )}
                              {m.userType && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <GraduationCap size={13} className="text-gray-400 flex-shrink-0" />
                                  <span>{m.userType}</span>
                                </div>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ------------------------ Session Chair Console ------------------------- */
/* Reused your full SessionChair.jsx logic (preserved). It expects backend route:
   GET /api/session/:email  => { success:true, chair, track, participants }
   PUT /api/admin/events/:eventId => update event participants/tracks
*/


function ProfileCard({ chair, onLogout }) {
  if (!chair) return null;
  return (
    <div className="w-full mt-6 px-6">
      <div className="flex items-center gap-4 bg-white/95 border border-green-100 rounded-2xl p-4">
        <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-2xl">
          {chair.name ? chair.name[0].toUpperCase() : "S"}
        </div>
        <div className="flex-1">
          <div className="text-lg font-semibold text-gray-800">
            {chair.name}
          </div>
          <div className="text-sm text-gray-600">Role: Session Chair</div>
          <div className="text-sm text-gray-600">Email: {chair.email}</div>
          <div className="text-sm text-gray-600">
            Phone: {chair.phone || "—"}
          </div>
        </div>
        <div>
          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-md border text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function TrackCard({
  track,
  chairs,
  participants,
  collapsed,
  onToggleCollapse,
  onStartAssessment,
  onReorderParticipant,
  onOpenParticipant,
}) {
  const totalSubs = participants?.length || 0;
  const [copied, setCopied] = useState(false);


  const totalAssessed = participants.filter(
    (p) => p.assessment && typeof p.assessment.total === "number"
  ).length;


  const progressPercent =
    totalSubs > 0 ? Math.round((totalAssessed / totalSubs) * 100) : 0;

  const handleCopyMeetingLink = async () => {
    try {
      await navigator.clipboard.writeText(normalizedMeetingLink);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const normalizedMeetingLink =
    track?.meetingLink
      ? track.meetingLink.startsWith("http")
        ? track.meetingLink
        : `https://${track.meetingLink}`
      : "";


  return (
    <div className="w-full mt-6 px-6">
      <div className="bg-white/95 border border-green-100 rounded-2xl p-4">

        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div
            className="flex-1 pr-6 cursor-pointer"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

              {/* Track Title */}
              <div className="text-xl font-semibold text-green-700">
                {track.id} — {track.title}
              </div>

              {/* Start Assessment Button */}
              <button
                onClick={onStartAssessment}
                disabled={track.assessmentLocked}
                className={`px-4 py-2 rounded-md text-sm font-semibold w-fit ${track.assessmentLocked
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700 transition"
                  }`}
              >
                {track.assessmentLocked ? "Assessment Locked" : "Start Assessment"}
              </button>

            </div>


            <div className="text-sm text-justify text-gray-600 mt-1">
              {track.description}
            </div>

            <div className="text-sm text-gray-500 mt-2">
              Chairs:{" "}
              {chairs.internal ? `${chairs.internal.name} (Internal)` : "—"},{" "}
              {chairs.external ? `${chairs.external.name} (External)` : "—"}
            </div>

            {/* ===== Online Meeting Link ===== */}
            {track?.meetingLink && (
              <div
                className="
      mt-3 inline-flex items-center gap-3
      max-w-[520px]
      rounded-lg border border-emerald-200
      bg-emerald-50 px-3 py-2
    "
              >
                {/* Link text */}
                <a
                  href={normalizedMeetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
    text-sm text-emerald-900
    truncate max-w-[260px]
    hover:underline
  "
                  title={normalizedMeetingLink}
                >
                  {normalizedMeetingLink}
                </a>

                {/* Join button */}
                <a
                  href={normalizedMeetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-md
             bg-emerald-600 text-white
             text-xs font-semibold
             hover:bg-emerald-700 transition"
                >
                  Join
                </a>


                {/* Copy button */}
                <button
                  onClick={handleCopyMeetingLink}
                  className="
        px-2 py-1 rounded-md
        border border-emerald-300
        bg-white text-emerald-700
        text-xs font-semibold
        hover:bg-emerald-100 transition
        whitespace-nowrap
      "
                  title="Copy meeting link"
                >
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
            )}


            <div className="text-sm text-gray-500 mt-1">
              Submissions: {totalSubs} • Assessed:{" "}
              <span className="font-semibold text-green-700">
                {totalAssessed}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 w-full bg-gray-200 rounded h-2">
              <div
                className="bg-green-500 h-2 rounded"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

        </div>

        {/* LEGEND */}
        {!collapsed && (
          <div className="mt-4 flex gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-200 border"></span> Assessed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-white border"></span> Pending
            </span>
          </div>
        )}

        {/* PARTICIPANTS */}
        {!collapsed && (
          <div className="mt-4 border-t pt-4 space-y-3">
            {!participants || participants.length === 0 ? (
              <div className="text-gray-600">
                No participants assigned yet.
              </div>
            ) : (
              participants.map((p, idx) => {
                const isAssessed = p.assessment && typeof p.assessment.total === "number";

                return (
                  <div
                    key={p._id}
                    className={`rounded-xl border p-4 shadow-sm transition hover:shadow-md ${isAssessed
                      ? "bg-green-50 border-green-300"
                      : "bg-white border-gray-200"
                      }`}
                  >
                    <div className="flex justify-between items-start">

                      {/* LEFT */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                            Team ID: {p.paperId}
                          </span>


                          {isAssessed && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-600 text-white">
                              ✔ Assessed
                            </span>
                          )}
                        </div>

                        <div className="text-lg font-semibold text-green-700">
                          {p.presenterName}
                        </div>

                        <div className="text-sm text-gray-700 font-medium">
                          {p.problemStatement}
                        </div>

                        <div className="text-sm text-gray-600">
                          {p.institute} • {p.branch}
                        </div>

                        <div className="text-xs text-gray-500">
                          {p.mode} • {p.email}
                        </div>
                      </div>

                      {/* RIGHT */}
                      <div className="flex items-center gap-2">
                        <button
                          disabled={track.assessmentLocked}
                          onClick={() => onOpenParticipant(idx)}
                          className={`px-4 py-2 rounded-lg text-sm ${track.assessmentLocked
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 text-white"
                            }`}
                        >
                          Assess
                        </button>
                      </div>

                    </div>
                  </div>

                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
const MemberInfoField = ({ label, value, fullWidth }) => {
  if (!value) return null;
  return (
    <div className={`flex flex-col gap-0.5 ${fullWidth ? 'col-span-1 sm:col-span-2' : ''} min-w-0`}>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-gray-800 truncate" title={value}>{value}</span>
    </div>
  );
};

/* ------------------------ Member Assessment Card ------------------------ */
const MemberAssessmentCard = ({ m, index, total }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative w-full h-full min-h-[56px]">
      <div className={`bg-white p-4 rounded-xl shadow-sm border overflow-hidden transition-all duration-300 flex flex-col ${open
        ? 'absolute top-0 left-[-2%] sm:left-[-5%] w-[104%] sm:w-[110%] shadow-2xl shadow-purple-500/20 border-purple-300 z-50'
        : 'relative w-full h-full border-gray-200 hover:shadow-md z-10'
        }`}>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between font-semibold text-gray-800 text-sm border-b border-gray-100 pb-2 focus:outline-none"
        >
          <span className="flex items-center gap-2 truncate pr-2">
            <span className="truncate">{m.name}</span>
            {m.isLeader && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Leader</span>}
          </span>
          <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider shrink-0">{open ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {open && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4 mt-3 pt-3 border-t border-gray-50 bg-gray-50/30 rounded-b-lg px-1 pb-1">
            <MemberInfoField label="Org / Institute" value={m.organisation || m.institute} fullWidth />
            <MemberInfoField label="Email" value={m.email} fullWidth />
            <MemberInfoField label="Phone" value={m.mobile || m.phone} />
            <MemberInfoField label="Location" value={m.location} />
            <MemberInfoField label="Type" value={m.userType} />
            <MemberInfoField label="Domain" value={m.domain || m.category} />
            <MemberInfoField label="Course" value={m.course || m.degree} />
            <MemberInfoField label="Specialization" value={m.specialization || m.branch} />
            <MemberInfoField label="Course Type" value={m.courseType} />
            <MemberInfoField label="Duration" value={m.courseDuration ? `${m.courseDuration} ${!isNaN(m.courseDuration) ? 'yrs' : ''}` : null} />
            <MemberInfoField label="Grad Year" value={m.gradYear} />
            <MemberInfoField label="Designation" value={m.designation} />
            <MemberInfoField label="Experience" value={m.workExperience} />
            <MemberInfoField label="Diff. Abled" value={m.differentlyAbled !== undefined && m.differentlyAbled !== "" ? (String(m.differentlyAbled) === "true" ? "Yes" : "No") : null} />
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------ Assessment Modal ------------------------ */
function AssessmentModal({
  open,
  onClose,
  participants,
  currentIndex,
  onSaveAndNext,
  track,
  event,
  isSaved,
  onNext,
  onPrev,
  onScheduleToLast,
  persistParticipants,
}) {
  const [savedMsg, setSavedMsg] = React.useState(false);


  const [assessmentMode, setAssessmentMode] = React.useState("criteria");
  const [isDirty, setIsDirty] = React.useState(false);

  /* ---------- TIMER (SESSION CHAIR ONLY) ---------- */
  const PRESENTATION_TIME = 5 * 60; // 5 minutes
  const TOTAL_TIME = 7 * 60;        // 7 minutes

  const [secondsLeft, setSecondsLeft] = React.useState(TOTAL_TIME);
  const [timerRunning, setTimerRunning] = React.useState(false);
  const timerRef = React.useRef(null);
  const [timersByIndex, setTimersByIndex] = React.useState({});
  const [activeTimerIndex, setActiveTimerIndex] = React.useState(null);

  // Accordion state
  const [openSection, setOpenSection] = React.useState(1);
  const [showPptModal, setShowPptModal] = React.useState(false);

  const criteriaList = event?.criteria?.length ? event.criteria : ASSESSMENT_CRITERIA.map(name => ({ name, maxMarks: 10, inputType: "number" }));
  const maxTotalMarks = criteriaList.reduce((sum, c) => sum + (c.inputType !== "text" && c.inputType !== "boolean" ? (Number(c.maxMarks) || 10) : 0), 0);

  const DEFAULT_FORM = {
    present: true,
    criteria: Array(criteriaList.length).fill(0),
    justifications: Array(criteriaList.length).fill(""),
    total: 0,
    notes: "",
  };
  const [form, setForm] = React.useState(DEFAULT_FORM);


  React.useEffect(() => {
    if (!participants?.length) return;

    const p = participants[currentIndex];
    if (!p) return;

    let nextForm = { ...DEFAULT_FORM };
    let mode = "criteria";

    if (p.assessment) {
      mode = p.assessment.mode === "direct" ? "direct" : "criteria";

      const criteria = Array(criteriaList.length).fill(0);
      if (Array.isArray(p.assessment.criteria)) {
        p.assessment.criteria.forEach((val, idx) => {
          if (idx < criteria.length) criteria[idx] = val;
        });
      }

      let justifications = Array(criteriaList.length).fill("");
      let notes = p.assessment.notes ?? "";

      if (notes.startsWith("JSON:")) {
        try {
          justifications = JSON.parse(notes.substring(5));
          notes = "";
        } catch (e) {
          console.error("Failed to parse justifications", e);
        }
      }

      const total = mode === "direct"
        ? p.assessment.total ?? 0
        : criteria.reduce((a, b, idx) => a + (criteriaList[idx]?.inputType !== "text" && criteriaList[idx]?.inputType !== "boolean" ? Number(b || 0) : 0), 0);

      nextForm = {
        present: p.present ?? true,
        criteria,
        justifications,
        total,
        notes,
        slideTimings: p.assessment?.slideTimings || [],
        totalPptTime: p.assessment?.totalPptTime || 0,
      };
    }

    setAssessmentMode(mode);
    setForm(nextForm);
    setIsDirty(false);
    setOpenSection(1);
  }, [participants, currentIndex]);

  React.useEffect(() => {
    if (activeTimerIndex === currentIndex) return;
    setSecondsLeft(TOTAL_TIME);
  }, [currentIndex]);

  const handleTimingUpdate = useCallback((timings, total) => {
    setForm(f => ({ ...f, slideTimings: timings, totalPptTime: total }));
    setIsDirty(true);
  }, []);

  const handleAiQuery = useCallback((query) => {
    setForm(f => ({
      ...f,
      aiQueries: [...(f.aiQueries || []), { query, timestamp: new Date().toISOString() }]
    }));
    setIsDirty(true);
  }, []);

  if (!open || !participants?.length) return null;

  const p = participants[currentIndex];
  const isLast = currentIndex === participants.length - 1;

  const setCriteria = (i, value) => {
    if (assessmentMode !== "criteria") return;
    setIsDirty(true);
    const arr = [...form.criteria];
    arr[i] = value === "" ? "" : value;
    setForm((f) => ({ ...f, criteria: arr }));
  };

  const setJustification = (i, value) => {
    setIsDirty(true);
    const arr = [...form.justifications];
    arr[i] = value;
    setForm((f) => ({ ...f, justifications: arr }));
  };

  if (track?.assessmentLocked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[60]">
        <div className="bg-white p-6 rounded-xl shadow-xl">
          <h3 className="text-lg font-semibold text-red-600">Assessment Locked</h3>
          <p className="text-sm text-gray-600 mt-2">The admin has locked this assessment.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 border rounded">Close</button>
        </div>
      </div>
    );
  }

  const handleSaveMarks = async () => {
    if (track?.assessmentLocked) {
      alert("Assessment is locked by admin.");
      return;
    }

    const missingMarks = form.criteria.some(c => c === "" || c === null || c === undefined);
    const missingJustifs = form.justifications.some(j => !j || j.trim() === "");

    if (assessmentMode === "criteria" && (missingMarks || missingJustifs)) {
      alert("Please fill all the marks and their justifications before saving.");
      return;
    }

    if (assessmentMode === "direct" && (!form.notes || form.notes.trim() === "")) {
      alert("Please provide an overall justification for the direct marks.");
      return;
    }

    const assessmentPayload = {
      criteria: assessmentMode === "criteria" ? form.criteria.map((val, idx) => {
        if (criteriaList[idx]?.inputType === "text" || criteriaList[idx]?.inputType === "boolean") return val;
        return Number(val);
      }) : [],
      total: Number(form.total),
      notes: assessmentMode === "criteria" ? "JSON:" + JSON.stringify(form.justifications) : form.notes,
      mode: assessmentMode,
      slideTimings: form.slideTimings,
      totalPptTime: form.totalPptTime,
      aiQueries: form.aiQueries || [],
    };

    await onSaveAndNext(currentIndex, {
      present: form.present,
      assessment: assessmentPayload,
    });

    setSavedMsg(true);
    setIsDirty(false);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const setDirectTotal = (value) => {
    if (assessmentMode !== "direct") return;
    setIsDirty(true);
    setForm((f) => ({
      ...f,
      total: Math.max(0, Math.min(maxTotalMarks, Number(value) || 0)),
      criteria: Array(criteriaList.length).fill(0),
    }));
  };

  const startTimer = () => {
    if (timerRunning && activeTimerIndex !== currentIndex) {
      alert("A timer is already running for another participant. Please stop it first.");
      return;
    }
    if (timerRunning && activeTimerIndex === currentIndex) return;

    setTimerRunning(true);
    setActiveTimerIndex(currentIndex);

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setTimerRunning(false);
          setActiveTimerIndex(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    setTimerRunning(false);
    setActiveTimerIndex(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    const progress = (TOTAL_TIME - secondsLeft) / TOTAL_TIME;
    const p = Math.min(1, Math.max(0, progress));
    let r, g, b;
    if (p < 0.5) {
      const t = p / 0.5;
      r = Math.round(34 + (234 - 34) * t);
      g = Math.round(197 + (179 - 197) * t);
      b = Math.round(94 + (8 - 94) * t);
    } else {
      const t = (p - 0.5) / 0.5;
      r = Math.round(234 + (239 - 234) * t);
      g = Math.round(179 + (68 - 179) * t);
      b = Math.round(8 + (68 - 8) * t);
    }
    return `rgb(${r}, ${g}, ${b})`;
  };

  const elapsed = TOTAL_TIME - secondsLeft;
  const showPresentationOver = elapsed >= PRESENTATION_TIME && elapsed < TOTAL_TIME;
  const showSessionOver = secondsLeft === 0;

  const handleMarkAbsent = () => {
    if (track?.assessmentLocked) {
      alert("Assessment is locked by admin.");
      return;
    }
    if (!window.confirm("Are you sure you want to mark this participant as ABSENT? This action will clear all marks.")) {
      return;
    }
    onSaveAndNext(currentIndex, {
      present: false,
      assessment: {
        criteria: [],
        total: 0,
        notes: "Marked absent",
        mode: "direct",
      },
    });
    setIsDirty(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const handleScheduleToLast = () => {
    if (!window.confirm("Schedule this participant to the end of the assessment list?")) return;
    onScheduleToLast(currentIndex);
  };

  const guardedPrev = () => {
    if (isDirty) {
      alert("You have unsaved marks. Please click 'Save Marks' first.");
      return;
    }
    setTimersByIndex((t) => ({ ...t, [currentIndex]: secondsLeft }));
    onPrev();
  };

  const guardedNext = () => {
    if (isDirty) {
      alert("You have unsaved marks. Please click 'Save Marks' first.");
      return;
    }
    setTimersByIndex((t) => ({ ...t, [currentIndex]: secondsLeft }));
    onNext();
  };

  const normalizeCriteriaValue = (raw, max = 10) => {
    if (raw === "" || raw === null || raw === undefined) return 0;
    const str = String(raw);
    if (!str.includes(".") && Number(str) > max) {
      const firstDigit = Number(str[0]);
      if (!isNaN(firstDigit)) return Math.min(max, firstDigit);
    }
    const num = Number(str);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(max, num));
  };

  const activeInput = "border border-gray-300 rounded text-center py-2 bg-white focus:ring-2 focus:ring-green-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-100/60 backdrop-blur-sm px-4 py-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-green-600 text-white rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-xl font-bold">{p.presenterName}</h2>
            <div className="text-sm text-green-100">{p.institute} • {p.branch}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-white text-green-700 text-sm font-semibold">
              Team ID: {p.paperId}
            </span>
            <button onClick={onClose} className="text-white hover:bg-green-700 p-2 rounded-full font-bold transition-colors w-8 h-8 flex items-center justify-center">✕</button>
          </div>
        </div>



        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">

          {/* Section 1: About Team */}
          <div className={`border border-gray-200 rounded-xl shadow-sm bg-white ${openSection === 1 ? '' : 'overflow-hidden'}`}>
            <button
              onClick={() => setOpenSection(openSection === 1 ? null : 1)}
              className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left font-semibold text-gray-800"
            >
              <span className="flex items-center gap-2">
                1. About Team
                {openSection !== 1 && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{p.mode}</span>}
              </span>
              <span className="text-gray-400">{openSection === 1 ? "▲" : "▼"}</span>
            </button>
            {openSection === 1 && (
              <div className="p-5 border-t border-gray-100">
                <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-700 mb-5 bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex flex-col"><span className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Team Name</span> <span className="font-medium text-gray-900">{p.teamName || p.presenterName}</span></div>
                  <div className="flex flex-col"><span className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Track</span> <span className="font-medium text-gray-900">{p.track || p.trackId || "—"}</span></div>
                  <div className="flex flex-col"><span className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Contact Email</span> <span className="font-medium text-gray-900">{p.email || "—"}</span></div>
                  <div className="flex flex-col"><span className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Contact Phone</span> <span className="font-medium text-gray-900">{p.phone || "—"}</span></div>
                </div>

                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Team Members ({p.members?.length || 0})</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(p.members || []).map((m, idx) => (
                    <MemberAssessmentCard key={idx} m={m} index={idx} total={(p.members || []).length} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Problem Statement */}
          <div className={`border border-gray-200 rounded-xl shadow-sm bg-white ${openSection === 2 ? '' : 'overflow-hidden'}`}>
            <button
              onClick={() => setOpenSection(openSection === 2 ? null : 2)}
              className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left font-semibold text-gray-800"
            >
              <span className="flex items-center gap-2">
                2. Problem Statement
                {openSection !== 2 && <span className="text-gray-500 font-normal text-sm ml-2 truncate max-w-xs">{p.problemStatement}</span>}
              </span>
              <span className="text-gray-400">{openSection === 2 ? "▲" : "▼"}</span>
            </button>
            {openSection === 2 && (
              <div className="p-5 border-t border-gray-100">
                <div className="mb-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Title</div>
                  <div className="text-gray-800 font-medium text-sm md:text-base">{p.problemStatement}</div>
                </div>
                {p.description && (
                  <div className="mb-5">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Description</div>
                    <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 p-4 rounded-xl shadow-sm">{p.description}</div>
                  </div>
                )}

                <div className="mt-4 pt-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Presentation (PPT/PDF)</div>
                    <div className="text-sm font-medium text-gray-700">
                      {p.pptLink ? <span className="text-green-600 flex items-center gap-1">✔ Available for review</span> : <span className="text-gray-400 italic">Not uploaded</span>}
                    </div>
                  </div>
                  {p.pptLink && (
                    <button onClick={() => setShowPptModal(true)} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-purple-700 text-sm shadow-sm transition-all hover:shadow">
                      Open Presentation Modal
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Assessment */}
          <div className={`border border-green-200 rounded-xl shadow-sm bg-white ring-1 ring-green-50 ${openSection === 3 ? '' : 'overflow-hidden'}`}>
            <button
              onClick={() => setOpenSection(openSection === 3 ? null : 3)}
              className="w-full flex justify-between items-center p-4 bg-green-50 hover:bg-green-100 transition-colors text-left font-semibold text-green-900"
            >
              <span>3. Assessment</span>
              <span className="text-green-600">{openSection === 3 ? "▲" : "▼"}</span>
            </button>
            {openSection === 3 && (
              <div className="p-5 border-t border-green-100">
                <div className="flex gap-4 mb-6 bg-gray-50 p-2 rounded-lg border border-gray-100 inline-flex">
                  <label className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2"><input type="radio" checked={assessmentMode === "criteria"} onChange={() => setAssessmentMode("criteria")} className="text-green-600 focus:ring-green-500" /> Criteria-wise</label>
                  {event?.allowDirectTotal !== false && (
                    <label className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2"><input type="radio" checked={assessmentMode === "direct"} onChange={() => setAssessmentMode("direct")} className="text-green-600 focus:ring-green-500" /> Direct total</label>
                  )}
                </div>

                {assessmentMode === "criteria" && (
                  <div className="space-y-4 mb-6">
                    {criteriaList.map((c, i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-[1fr_90px_2fr] gap-4 items-start shadow-sm hover:border-green-300 transition-colors">
                        <div className="text-sm font-semibold text-gray-800 mt-1 md:pr-4">{i + 1}. {c.name}</div>
                        <div className="flex flex-col gap-1 relative">
                          {(!c.inputType || c.inputType === "number") && (
                            <>
                              <input
                                type="number"
                                min={0} max={c.maxMarks}
                                value={form.criteria[i] ?? ""}
                                onChange={(e) => setCriteria(i, e.target.value)}
                                onBlur={() => {
                                  const arr = [...form.criteria];
                                  arr[i] = normalizeCriteriaValue(arr[i], c.maxMarks);
                                  const total = arr.reduce((a, b, idx) => a + (criteriaList[idx]?.inputType !== "text" && criteriaList[idx]?.inputType !== "boolean" ? Number(b || 0) : 0), 0);
                                  setForm((f) => ({ ...f, criteria: arr, total }));
                                }}
                                onFocus={(e) => e.target.select()}
                                className={`${activeInput} w-full text-lg font-bold text-green-700`}
                                placeholder="0"
                              />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Max {c.maxMarks}</span>
                            </>
                          )}
                          {c.inputType === "text" && (
                            <input
                              type="text"
                              value={form.criteria[i] || ""}
                              onChange={(e) => setCriteria(i, e.target.value)}
                              className={`${activeInput} w-full text-sm font-medium text-gray-800`}
                              placeholder="Enter text..."
                            />
                          )}
                          {c.inputType === "boolean" && (
                            <label className="flex items-center justify-center gap-2 cursor-pointer h-full border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors">
                              <input
                                type="checkbox"
                                checked={form.criteria[i] === true || form.criteria[i] === "true"}
                                onChange={(e) => {
                                  setCriteria(i, e.target.checked);
                                }}
                                className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                              />
                              <span className="text-sm font-bold text-gray-700">Selected</span>
                            </label>
                          )}
                        </div>
                        <div>
                          {(event?.allowComments ?? true) && (
                            <textarea
                              rows="2"
                              placeholder="Justification / Reason for marks..."
                              value={form.justifications[i] || ""}
                              onChange={(e) => setJustification(i, e.target.value)}
                              required={event?.requireComments ?? false}
                              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition-shadow resize-none"
                            ></textarea>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between bg-green-50 p-5 rounded-xl border border-green-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-green-900 uppercase tracking-wide">Total Score</label>
                    <div className="flex items-baseline gap-2">
                      <input
                        type="number"
                        min={0} max={maxTotalMarks}
                        value={form.total}
                        disabled={assessmentMode === "criteria"}
                        onChange={(e) => setDirectTotal(e.target.value)}
                        className={`${assessmentMode === "direct" ? "border-green-400 bg-white shadow-inner focus:ring-2 focus:ring-green-400" : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"} border-2 rounded-lg px-3 py-2 w-[100px] text-center font-bold text-2xl outline-none`}
                      />
                      <span className="text-green-700 font-bold text-lg">/ {maxTotalMarks}</span>
                    </div>
                  </div>

                </div>

                {assessmentMode === "direct" && (
                  <div className="mt-4 bg-green-50 p-5 rounded-xl border border-green-200 shadow-sm">
                    <label className="text-sm font-bold text-green-900 uppercase tracking-wide block mb-2">Overall Justification</label>
                    <textarea
                      rows="3"
                      placeholder="Please provide a justification for the overall direct score..."
                      value={form.notes || ""}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full border border-green-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition-shadow resize-none bg-white"
                    ></textarea>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 md:px-6 bg-white border-t border-gray-200 shrink-0 flex flex-wrap justify-between items-center rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex gap-2 items-center order-2 md:order-1 mt-4 md:mt-0">
            <button onClick={guardedPrev} disabled={currentIndex === 0} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">◀ Prev</button>
            <div className="text-xs font-bold text-gray-400 tracking-widest px-2">{currentIndex + 1} OF {participants.length}</div>
            <button onClick={guardedNext} disabled={currentIndex === participants.length - 1} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next ▶</button>
          </div>

          <div className="text-center w-full md:w-auto order-1 md:order-2 flex justify-center min-h-[30px]">
            {savedMsg && <span className="text-green-700 font-bold text-sm bg-green-100 px-4 py-1.5 rounded-full shadow-sm animate-pulse border border-green-200">✔ Marks saved successfully</span>}
          </div>

          <div className="flex gap-3 justify-end order-3 w-full md:w-auto mt-4 md:mt-0">
            <button onClick={handleMarkAbsent} className="text-sm font-bold text-red-600 border border-red-200 bg-white hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">Mark Absent</button>
            <button onClick={handleSaveMarks} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-6 py-2 rounded-lg shadow-sm hover:shadow transition-all">Save & Continue</button>
          </div>
        </div>
      </div>

      {/* PPT Modal */}
      {showPptModal && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col p-2 md:p-6 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4 text-white px-2">
            <div className="font-bold text-lg truncate pr-4">{p.problemStatement} - Presentation</div>
            <button onClick={() => setShowPptModal(false)} className="bg-white/20 hover:bg-white/40 p-2 rounded-lg font-bold px-4 transition-colors text-sm flex items-center gap-2">Close ✕</button>
          </div>
          <div className="flex-1 w-full bg-white rounded-xl overflow-hidden shadow-2xl relative border border-gray-800">
            <SlideViewer fileUrl={p.pptLink} onTimingUpdate={handleTimingUpdate} onAiQuery={handleAiQuery} />
          </div>
        </div>
      )}
    </div>
  );
}
function AssessmentSummary({ participants, onClose, event }) {
  const criteriaList = event?.criteria?.length ? event.criteria : ASSESSMENT_CRITERIA.map(name => ({ name, maxMarks: 10 }));
  // sort by total marks (descending)
  const sorted = [...participants].sort((a, b) => {
    const ta = a.assessment?.total ?? 0;
    const tb = b.assessment?.total ?? 0;
    return tb - ta;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white max-w-6xl w-full rounded-xl shadow-xl p-6 overflow-auto max-h-[90vh]">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Assessment Summary
          </h2>
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded"
          >
            Close
          </button>
        </div>

        {/* TABLE */}
        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">S.No.</th>
              <th className="border px-2 py-1">Presenter Name</th>
              <th className="border px-2 py-1">Team ID</th>
              <th className="border px-2 py-1">Title</th>
              {criteriaList.map((c, i) => (
                <th key={i} className="border px-2 py-1 text-xs">
                  {c.name}
                </th>
              ))}

              <th className="border px-2 py-1">Total</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((p, idx) => {
              const assessment = p.assessment || {};
              const mode = assessment.mode || "criteria";
              const criteria = Array(criteriaList.length).fill(0);
              if (Array.isArray(assessment.criteria)) {
                assessment.criteria.forEach((val, idx) => {
                  if (idx < criteria.length) criteria[idx] = val;
                });
              }


              return (
                <tr key={p._id || p.paperId}>

                  <td className="border px-2 py-1 text-center">
                    {idx + 1}
                  </td>
                  <td className="border px-2 py-1">
                    {p.presenterName}
                  </td>
                  <td className="border px-2 py-1">
                    {p.paperId}
                  </td>

                  <td className="border px-2 py-1">
                    {p.problemStatement}
                  </td>

                  {mode === "direct" ? (
                    <td
                      colSpan={5}
                      className="border px-2 py-1 text-center italic text-gray-600"
                    >
                      Direct marking
                    </td>
                  ) : (
                    criteria.map((val, i) => {
                      const cType = criteriaList[i]?.inputType;
                      const displayVal = cType === "boolean"
                        ? ((val === true || val === "true") ? "Yes" : "No")
                        : (cType === "text" ? (val || "-") : val);
                      return (
                        <td
                          key={i}
                          className="border px-2 py-1 text-center"
                        >
                          {displayVal}
                        </td>
                      );
                    })
                  )}

                  <td className="border px-2 py-1 text-center font-semibold">
                    {assessment.total ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}



function SessionChairConsole() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [chair, setChair] = useState(null);
  const [track, setTrack] = useState(null);
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentIndex, setAssessmentIndex] = useState(0);
  const [error, setError] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const normalizeParticipants = (list, evaluatorId) =>
    list
      .map((p) => {
        const institute = p.members?.[0]?.organisation || p.institute;
        const branch = p.members?.[0]?.specialization || p.branch;

        let currentAssessment = null;
        if (evaluatorId && p.assessments) {
          currentAssessment = p.assessments.find(a => String(a.evaluatorId) === String(evaluatorId));
        }
        if (!currentAssessment) currentAssessment = p.assessment;

        return {
          ...p,
          _id: p._id,
          paperId: p.teamId || p.paperId || "N/A",
          presenterName: p.teamName || p.presenterName || "Unnamed Team",
          problemStatement: p.problemStatement || p.description || p.problemStatement || "No problem statement provided",
          institute: (institute && institute.trim()) ? institute : "Unknown Institute",
          branch: (branch && branch.trim()) ? branch : "Unknown Branch",
          mode: p.members?.length ? `${p.members.length} members` : p.mode || "Unknown",
          email: p.members?.[0]?.email || p.email || "Unknown",
          phone: p.members?.[0]?.mobile || p.phone || "Unknown",
          assessment: currentAssessment || null,
          assessments: p.assessments || [],
        };
      })
      .filter((p) => p.paperId !== "N/A" || p.presenterName !== "Unnamed Team");



  // ✅ ADDED: profile visibility control
  const [showProfile, setShowProfile] = useState(false);

  const storedEmail = sessionStorage.getItem("care_email");

  /* ---------------- LOAD SESSION DATA (UNCHANGED LOGIC) ---------------- */
  useEffect(() => {
    if (!storedEmail) {
      setError("Session expired. Please login again.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/session/${encodeURIComponent(storedEmail)}`
        );
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || "Failed to load session data.");
          return;
        }

        setChair(data.chair || {});
        setTrack(data.track || {});
        setEvent(data.event || {});

        const pRes = await fetch(
          `${API_BASE}/api/participants/by-track?eventId=${data.chair.eventId}&trackId=${data.chair.trackId}&evaluatorId=${data.chair._id}`
        );

        const pData = await pRes.json();
        setParticipants(normalizeParticipants(pData.participants || [], data.chair._id));
        setError(null);
      } catch (err) {
        console.error("Failed loading session data:", err);
        setError("Unable to reach server.");
      } finally {
        setLoading(false);
      }
    };

    load();

  }, []);

  useEffect(() => {
    if (!chair?.eventId || !chair?.trackId) return;

    refreshTrackLock();
    const i = setInterval(refreshTrackLock, 10000);

    return () => clearInterval(i);
  }, [chair]);


  /* ---------------- LOGOUT (FIXED) ---------------- */
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  /* ---------------- ASSESSMENT HELPERS (UNCHANGED) ---------------- */
  const openAssessmentFromIndex = async (i) => {
    const locked = await refreshTrackLock();

    if (locked) {
      alert("Assessment is locked by admin.");
      return;
    }

    setAssessmentIndex(i);
    setAssessmentOpen(true);
  };




  const startAssessment = async () => {
    const locked = await refreshTrackLock();

    if (locked) {
      alert("Assessment is locked by admin.");
      return;
    }

    setAssessmentIndex(0);
    setAssessmentOpen(true);
  };





  const reorderParticipant = (from, to) => {
    if (to < 0 || to >= participants.length) return;
    const arr = [...participants];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setParticipants(arr);
  };

  const refreshTrackLock = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/session/track-status?eventId=${chair.eventId}&trackId=${chair.trackId}`
      );

      if (!res.ok) {
        console.error("Track lock fetch failed");
        return false; // ✅ NEVER assume locked
      }

      const data = await res.json();

      if (data.success) {
        setTrack((prev) => ({
          ...prev,
          assessmentLocked: data.assessmentLocked,
        }));
        return data.assessmentLocked;
      }

      return false;
    } catch (err) {
      if (!err.message.includes("Failed to fetch")) {
        console.error("Track lock fetch error:", err);
      }
      return false;
    }
  };



  const persistParticipants = async ({ participantId, present, assessment }) => {
    const res = await fetch(
      `${API_BASE}/api/session/participants/${participantId}/assessment`,
      {
        method: "PATCH", // ✅ MUST MATCH BACKEND
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ present, assessment, evaluatorId: chair?._id }),
      }
    );

    if (res.status === 403) {
      return { locked: true };
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error("Assessment save failed:", data);
      return { success: false };
    }

    return { success: true, participant: data.participant };
  };



  const saveAssessmentAndProceed = async (idx, assessmentObj) => {
    if (track.assessmentLocked) {
      alert("Assessment is locked by admin.");
      return;
    }

    const result = await persistParticipants({
      participantId: participants[idx]._id, // Mongo _id ONLY
      present: assessmentObj.present,
      assessment: assessmentObj.assessment,
    });


    if (result?.locked) {
      alert("Assessment is locked by admin.");
      return;
    }

    if (result?.success && result.participant) {
      setParticipants((prev) =>
        prev.map((p) =>
          p._id === result.participant._id
            ? normalizeParticipants([result.participant], chair._id)[0]   // ✅ backend is truth, but must be normalized!
            : p
        )
      );
    }

  };


  const handleFinalSubmit = async () => {
    if (
      !window.confirm(
        "Final submission will lock assessment permanently. Continue?"
      )
    ) {
      return;
    }

    const res = await fetch(
      `${API_BASE}/api/admin/tracks/${chair.eventId}/${chair.trackId}/lock`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: true }),
      }
    );

    const data = await res.json();

    if (data.success) {
      alert("Assessment submitted and locked.");

      // 🔒 HARD LOCK LOCALLY (instant UI update)
      setTrack((prev) => ({
        ...prev,
        assessmentLocked: true,
      }));

      await refreshTrackLock(); // backend confirmation
    } else {
      alert("Failed to lock assessment");
    }
  };


  const handlePrev = () => {
    setAssessmentIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setAssessmentIndex((i) =>
      Math.min(participants.length - 1, i + 1)
    );
  };

  const handleScheduleToLast = (idx) => {
    setParticipants((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(idx, 1);
      arr.push(moved);
      return arr;
    });

    // keep index valid
    setAssessmentIndex((i) =>
      i >= participants.length - 1 ? participants.length - 2 : i
    );
  };



  /* ---------------- LOADING / ERROR UI (UNCHANGED) ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading session chair console…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow">
          <div className="text-red-600 mb-3">{error}</div>
          <button
            onClick={() => {
              sessionStorage.clear();
              navigate("/login");
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition flex items-center justify-center gap-2"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- RENDER ---------------- */
  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-green-100 to-green-200 text-gray-800">
      <Header
        user={{
          name: chair?.name || "Session Chair",
          role: "sessionChair",
          email: chair?.email
        }}
        onLogout={handleLogout}
        onProfileClick={() => setShowProfile((v) => !v)} // ✅ FIXED
      />
      <TrackCard
        track={track || { id: "—", title: "No Track", description: "—" }}
        chairs={{
          internal: chair || null,
          external: null,
        }}
        participants={participants}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)} // ✅ FIXED: arrow only
        onStartAssessment={startAssessment}
        onReorderParticipant={reorderParticipant}
        onOpenParticipant={openAssessmentFromIndex}
      />

      <AssessmentModal
        open={assessmentOpen}
        onClose={() => setAssessmentOpen(false)}
        participants={participants}
        currentIndex={assessmentIndex}
        onSaveAndNext={saveAssessmentAndProceed}
        track={track}
        event={event}
        persistParticipants={persistParticipants}
        onNext={() => {
          if (assessmentIndex < participants.length - 1) {
            setAssessmentIndex((i) => i + 1);
          } else {
            setAssessmentOpen(false);
          }
        }}
        onPrev={handlePrev}
        onScheduleToLast={handleScheduleToLast}
      />


      {showSummary && (
        <AssessmentSummary
          participants={participants}
          onClose={() => setShowSummary(false)}
          event={event}
        />
      )}

      <div className="mt-6 flex justify-between items-center px-6 py-4 bg-white border-t shadow-sm">
        <button
          onClick={() => setShowSummary(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
        >
          View Summary
        </button>
      </div>

      {showSummary && (
        <AssessmentSummary
          participants={participants}
          onClose={() => setShowSummary(false)}
        />
      )}


    </div>
  );
}


/* ----------------------------- App Routes ------------------------------ */
/* IMPORTANT: useLocation() must be used inside BrowserRouter context, so
   we create AppRoutes which uses that hook and is rendered inside BrowserRouter.
*/
function EditEventWrapper({ events, setEvents }) {
  const { id } = useParams();

  return (
    <CreateEvent
      isEdit={true}
      editEventId={id}
      events={events}
      setEvents={setEvents}
      onEventSaved={() => { }}
    />
  );
}

function AppRoutes({ events, setEvents, refreshEvents }) {
  const location = useLocation();
  const hideHeader =
    location.pathname === "/login" ||
    location.pathname.startsWith("/session") ||
    location.pathname.startsWith("/student");

  const [user, setUser] = useState({ name: "Admin", role: "admin" });

  const navigate = useNavigate();

  useEffect(() => {
    const role = sessionStorage.getItem("care_role");
    const email = sessionStorage.getItem("care_email");
    const careName = sessionStorage.getItem("care_name");

    if (role === "sessionChair") {
      setUser({ name: careName || (email ? email.split("@")[0] : "Evaluator"), role, email });
    } else if (role === "studentCoordinator") {
      setUser({ name: careName || "Student Coordinator", role, email });
    } else if (role === "studentVolunteer") {
      setUser({ name: careName || "Student Volunteer", role, email });
    } else if (role === "teamLeader") {
      setUser({ name: careName || "Team Leader", role, email });
    } else {
      setUser({ name: "Admin", role: "admin", email });
    }
  }, [location]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };


  function ProtectedRoutes({ allowedRoles }) {
    const role = sessionStorage.getItem("care_role");
    const email = sessionStorage.getItem("care_email");

    // Not logged in
    if (!role || !email) {
      sessionStorage.clear();
      return <Navigate to="/login" replace />;
    }

    // Role not allowed
    if (allowedRoles && !allowedRoles.includes(role)) {
      sessionStorage.clear();
      return <Navigate to="/login" replace />;
    }

    return <Outlet />;
  }





  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-green-100 to-green-200 text-gray-800 flex flex-col">
      {!hideHeader && <Header user={user} onLogout={handleLogout} />}

      <Routes>
        {/* ENTRY */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/update-password" element={<UpdatePassword />} />


        {/* ADMIN */}
        <Route element={<ProtectedRoutes allowedRoles={["admin"]} />}>

          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<EventsView events={events} refreshEvents={refreshEvents} />} />
            <Route path="/progress" element={<ProgressView events={events} />} />
            <Route path="/shortlist" element={<AdminShortlist events={events} />} />
            <Route path="/users" element={<UsersView />} />
            <Route path="/round2" element={<AdminRound2 />} />
            <Route path="/problem-statements" element={<AdminProblemStatements events={events} />} />
            <Route path="/assign-tracks" element={<AdminAssignTracks events={events} />} />
            <Route path="/entry-verification" element={<AdminEntryVerification />} />
            <Route path="/mailing" element={<AdminMailingService events={events} />} />
            <Route path="/close-registration" element={<AdminCloseRegistration />} />
            <Route path="/event/:id" element={<EventDetails events={events} setEvents={setEvents} />} />
          </Route>

          <Route path="/create" element={<CreateEvent onEventSaved={(ev) => setEvents((prev) => [ev, ...prev])} events={events} setEvents={setEvents} />} />
          <Route path="/edit/:id" element={<EditEventWrapper events={events} setEvents={setEvents} />} />
          <Route path="/admin/events/:eventId/participants" element={<AdminEventParticipants />} />

        </Route>

        {/* SESSION CHAIR */}
        <Route element={<ProtectedRoutes allowedRoles={["sessionChair"]} />}>
          <Route path="/session" element={<SessionChairConsole />} />
        </Route>

        {/* STUDENT */}
        <Route element={<ProtectedRoutes allowedRoles={["studentCoordinator"]} />}>
          <Route path="/student" element={<StudentDashboard />} />
        </Route>

        {/* VOLUNTEER */}
        <Route element={<ProtectedRoutes allowedRoles={["studentVolunteer"]} />}>
          <Route path="/volunteer" element={<VolunteerConsole />} />
        </Route>

        {/* TEAM LEADER */}
        <Route element={<ProtectedRoutes allowedRoles={["teamLeader"]} />}>
          <Route path="/team" element={<TeamLayout />}>
            <Route index element={<TeamHome />} />
            <Route path="myteam" element={<TeamMyTeam />} />
          </Route>
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>


    </div>
  );
}

/* ------------------------------- Root App ------------------------------- */
export default function App() {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // fetch events from backend on load
  const fetchEventsFromBackend = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/events`);
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        console.error("Unexpected response shape:", data);
        setEvents([]);
      }
    } catch (err) {
      if (!err.message.includes("Failed to fetch")) {
        console.error("Error fetching events:", err);
      }
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };
  useEffect(() => {
    fetchEventsFromBackend();
  }, []);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppRoutes
        events={events}
        setEvents={setEvents}
        refreshEvents={fetchEventsFromBackend}
      />
    </BrowserRouter>
  );
}
