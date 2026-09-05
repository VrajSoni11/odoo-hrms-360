// frontend/src/components/AttendanceWidget.jsx
// Persistent header widget: check-in/out button + live running timer.
// Drop this into your main layout/header component (next to the nav,
// visible on every authenticated page).

import { useState, useEffect, useRef } from "react";
import { LogIn, LogOut as LogOutIcon } from "lucide-react";
import { checkIn, checkOut, getMyAttendance } from "../api/attendance.api";

function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function AttendanceWidget() {
  const [active, setActive] = useState(null); // open attendance record, or null
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  // On mount, check whether there's already an open check-in
  // (e.g. user refreshed the page mid-shift).
  useEffect(() => {
    async function loadStatus() {
      try {
        const { data } = await getMyAttendance();
        const open = data.find((r) => !r.checkOut);
        setActive(open || null);
      } catch (err) {
        console.error("Failed to load attendance status", err);
      }
    }
    loadStatus();
  }, []);

  // Client-side ticking clock only — the authoritative check-in
  // timestamp always comes from the server response, never the
  // browser clock, so the stored/worked hours can't be spoofed.
  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - new Date(active.checkIn).getTime());
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [active]);

  async function handleClick() {
    setLoading(true);
    try {
      if (active) {
        await checkOut();
        setActive(null);
      } else {
        const { data } = await checkIn();
        setActive(data);
      }
    } catch (err) {
      alert(err?.response?.data?.error || "Attendance action failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="attendance-widget">
      {active && (
        <span className="attendance-timer">{formatElapsed(elapsed)}</span>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className={active ? "btn-checkout" : "btn-checkin"}
      >
        {active ? <LogOutIcon size={14} /> : <LogIn size={14} />}
        {active ? "Check Out" : "Check In"}
      </button>
    </div>
  );
}
