// frontend/src/pages/AttendanceGlobalList.jsx
// Global list, HR Manager+ only. Filters by date range + employee,
// and supports inline manual correction (source becomes MANUAL).
// Gate this route the same way you gated Contracts/Users in Phase 0/1
// (role-based nav item + requireRole check on the backend already
// enforces it — this page is a convenience, not the security boundary).

import { useState, useEffect } from "react";
import { getAllAttendance, correctAttendance } from "../../api/attendance.api";

export default function AttendanceGlobalList() {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    checkIn: "",
    checkOut: "",
    note: "",
  });

  async function load() {
    try {
      const { data } = await getAllAttendance(filters);
      setRecords(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(r) {
    setEditingId(r.id);
    setEditValues({
      checkIn: r.checkIn ? r.checkIn.slice(0, 16) : "",
      checkOut: r.checkOut ? r.checkOut.slice(0, 16) : "",
      note: r.note || "",
    });
  }

  async function saveEdit(id) {
    try {
      await correctAttendance(id, editValues);
      setEditingId(null);
      load();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to save correction");
    }
  }

  return (
    <div className="page">
      <h2>Attendance (All Employees)</h2>

      <div className="filters">
        <label>
          From:{" "}
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </label>
        <label>
          To:{" "}
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </label>
        <button onClick={load}>Filter</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Hours</th>
            <th>Source</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{r.employee?.name}</td>
              {editingId === r.id ? (
                <>
                  <td>
                    <input
                      type="datetime-local"
                      value={editValues.checkIn}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          checkIn: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="datetime-local"
                      value={editValues.checkOut}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          checkOut: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td>{r.workedHours ?? "—"}</td>
                  <td>{r.source}</td>
                  <td>{r.status}</td>
                  <td>
                    <button onClick={() => saveEdit(r.id)}>Save</button>
                    <button onClick={() => setEditingId(null)}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{new Date(r.checkIn).toLocaleString()}</td>
                  <td>
                    {r.checkOut ? new Date(r.checkOut).toLocaleString() : "—"}
                  </td>
                  <td>{r.workedHours ?? "—"}</td>
                  <td>{r.source}</td>
                  <td>{r.status}</td>
                  <td>
                    <button onClick={() => startEdit(r)}>Correct</button>
                  </td>
                </>
              )}
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={7}>No attendance records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
