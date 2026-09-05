import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppShell from "./components/AppShell.jsx";

import Login from "./pages/Login.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";
import MyProfile from "./pages/MyProfile.jsx";
import AttendancePage from "./pages/Attendance/AttendancePage.jsx";
import EmployeesPage from "./pages/Employees/EmployeesPage.jsx";
import EmployeeDetail from "./pages/Employees/EmployeeDetail.jsx";
import DepartmentsPage from "./pages/Departments/DepartmentsPage.jsx";
import UsersPage from "./pages/Users/UsersPage.jsx";
import SchedulesPage from "./pages/Schedules/SchedulesPage.jsx";
import ContractsPage from "./pages/Contracts/ContractsPage.jsx";
import MyTimeOffRequests from "./pages/TimeOff/MyTimeOffRequests.jsx";
import TimeOffApprovals from "./pages/TimeOff/TimeOffApprovals.jsx";
import TimeOffAllocations from "./pages/TimeOff/TimeOffAllocations.jsx";
import TimeOffTypes from "./pages/TimeOff/TimeOffTypes.jsx";

const MANAGE_ROLES = [
  "Admin",
  "HR Manager",
  "HR Payroll User",
  "HR Payroll Manager",
];

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (MANAGE_ROLES.includes(user.role))
    return <Navigate to="/employees" replace />;
  return <Navigate to="/my-profile" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/time-off/my-requests" element={<MyTimeOffRequests />} />
        <Route
          path="/time-off/approvals"
          element={
            <ProtectedRoute allowedRoles={["Admin", "HR Manager"]}>
              <TimeOffApprovals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-off/allocations"
          element={
            <ProtectedRoute allowedRoles={["Admin", "HR Manager"]}>
              <TimeOffAllocations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-off/types"
          element={
            <ProtectedRoute allowedRoles={["Admin", "HR Manager"]}>
              <TimeOffTypes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={MANAGE_ROLES}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute allowedRoles={MANAGE_ROLES}>
              <EmployeeDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/departments"
          element={
            <ProtectedRoute allowedRoles={MANAGE_ROLES}>
              <DepartmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <ProtectedRoute allowedRoles={MANAGE_ROLES}>
              <SchedulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <ProtectedRoute allowedRoles={MANAGE_ROLES}>
              <ContractsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
