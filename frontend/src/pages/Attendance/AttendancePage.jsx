import { useAuth } from "../../context/AuthContext.jsx";
import AttendanceGlobalList from "./AttendanceGlobalList.jsx";
import AttendanceSelfList from "../AttendanceSelfList.jsx";

const HR_ROLES = [
  "Admin",
  "HR Manager",
  "HR Payroll User",
  "HR Payroll Manager",
];

export default function AttendancePage() {
  const { user } = useAuth();
  return HR_ROLES.includes(user.role) ? (
    <AttendanceGlobalList />
  ) : (
    <AttendanceSelfList />
  );
}
