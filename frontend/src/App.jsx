import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppShell from './components/AppShell';

import LoginPage from './pages/LoginPage';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import UserManagementPage from './pages/UserManagementPage';
import AttendanceStubPage from './pages/AttendanceStubPage';
import MyProfilePage from './pages/MyProfilePage';
import UnauthorizedPage from './pages/UnauthorizedPage';

import { HR_MANAGE_ROLES, ADMIN_ONLY } from './constants/roles';

// Sends the user to the right "home" screen based on their role
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (HR_MANAGE_ROLES.includes(user.role)) return <Navigate to="/employees" replace />;
  return <Navigate to="/my-profile" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index path="/" element={<HomeRedirect />} />

            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={HR_MANAGE_ROLES}>
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments"
              element={
                <ProtectedRoute allowedRoles={HR_MANAGE_ROLES}>
                  <DepartmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ONLY}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route path="/attendance" element={<AttendanceStubPage />} />
            <Route path="/my-profile" element={<MyProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
