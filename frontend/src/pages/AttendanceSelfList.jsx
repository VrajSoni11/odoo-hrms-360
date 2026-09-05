// frontend/src/pages/AttendanceSelfList.jsx
// Self-service view — an employee's own attendance history.

import { useState, useEffect } from "react";
import { getMyAttendance } from "../api/attendance.api";

export default function AttendanceSelfList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAttendance()
      .then(({ data }) => setRecords(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="page">
      <h2>My Attendance</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Hours</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.checkIn).toLocaleDateString()}</td>
              <td>{new Date(r.checkIn).toLocaleTimeString()}</td>
              <td>
                {r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : "—"}
              </td>
              <td>{r.workedHours ?? "—"}</td>
              <td>{r.status}</td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={5}>No attendance records yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
