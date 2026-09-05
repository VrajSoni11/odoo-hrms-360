export const ROLES = {
  EMPLOYEE: 'Employee',
  HR_MANAGER: 'HR Manager',
  HR_PAYROLL_USER: 'HR Payroll User',
  HR_PAYROLL_MANAGER: 'HR Payroll Manager',
  ADMIN: 'Admin',
};

// Roles that can manage Employees, Departments, Contracts, etc.
export const HR_MANAGE_ROLES = [
  ROLES.HR_MANAGER,
  ROLES.HR_PAYROLL_USER,
  ROLES.HR_PAYROLL_MANAGER,
  ROLES.ADMIN,
];

// Roles that can see the Payroll section at all
export const PAYROLL_ROLES = [ROLES.HR_PAYROLL_USER, ROLES.HR_PAYROLL_MANAGER, ROLES.ADMIN];

export const ADMIN_ONLY = [ROLES.ADMIN];
