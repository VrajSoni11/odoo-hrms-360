import client from './client';

export const getPayruns = () => client.get('/payruns');
export const getPayrun = (id) => client.get(`/payruns/${id}`);
export const getEligibleEmployees = (periodStart, periodEnd, params = {}) => client.get('/payruns/eligible-employees', { params: { periodStart, periodEnd, ...params } });
export const createPayrun = (data) => client.post('/payruns', data);
export const computePayrun = (id) => client.post(`/payruns/${id}/compute`);
export const validatePayrun = (id) => client.post(`/payruns/${id}/validate`);
export const markPayrunPaid = (id) => client.post(`/payruns/${id}/mark-paid`);
export const resolveWarning = (payrunId, warningId) => client.patch(`/payruns/${payrunId}/warnings/${warningId}/resolve`);
export const deletePayrun = (id) => client.delete(`/payruns/${id}`);
export const getPayslips = (params) => client.get('/payslips', { params });
export const getPayslip = (id) => client.get(`/payslips/${id}`);
export const downloadPayslipPdf = (id) => client.get(`/payslips/${id}/pdf`, { responseType: 'blob' });
