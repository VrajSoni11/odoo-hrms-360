import client from './client';

const params = (filters) => ({ params: filters });
export const getDashboardKpis = (filters) => client.get('/dashboard/kpis', params(filters));
export const getSalaryByDepartment = (filters) => client.get('/dashboard/salary-by-department', params(filters));
export const getSalaryTrend = (filters) => client.get('/dashboard/salary-trend', params(filters));
export const getAttendanceOverview = (filters) => client.get('/dashboard/attendance-overview', params(filters));
export const getTimeoffOverview = (filters) => client.get('/dashboard/timeoff-overview', params(filters));
export const getDepartmentOverview = (filters) => client.get('/dashboard/department-overview', params(filters));
export const getDashboardAlerts = (filters) => client.get('/dashboard/alerts', params(filters));
