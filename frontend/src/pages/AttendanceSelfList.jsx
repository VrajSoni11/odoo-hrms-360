// frontend/src/pages/AttendanceSelfList.jsx
// Self-service view — an employee's own attendance history.

import { useState, useEffect } from "react";
import { getMyAttendance } from "../api/attendance.api";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { SkeletonTable } from "../components/ui/Skeleton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { Clock } from "lucide-react";

export default function AttendanceSelfList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAttendance()
      .then(({ data }) => setRecords(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Time</div>
          <h1>My Attendance</h1>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : records.length === 0 ? (
        <EmptyState icon={Clock} title="No attendance records yet" description="Check in from the header to start tracking your time." />
      ) : (
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
                <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : "—"}</td>
                <td>{r.workedHours ?? "—"}</td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
