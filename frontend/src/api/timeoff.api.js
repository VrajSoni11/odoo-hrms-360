import client from './client';

export const getTimeOffTypes = () => client.get('/time-off-types');
export const createTimeOffType = (data) => client.post('/time-off-types', data);
export const deleteTimeOffType = (id) => client.delete(`/time-off-types/${id}`);
export const getAllocations = () => client.get('/time-off-allocations');
export const createAllocation = (data) => client.post('/time-off-allocations', data);
export const approveAllocation = (id) => client.patch(`/time-off-allocations/${id}/approve`);
export const getTimeOffRequests = () => client.get('/time-off-requests');
export const createTimeOffRequest = (data) => client.post('/time-off-requests', data);
export const approveTimeOffRequest = (id) => client.patch(`/time-off-requests/${id}/approve`);
export const refuseTimeOffRequest = (id) => client.patch(`/time-off-requests/${id}/refuse`);
export const cancelTimeOffRequest = (id) => client.patch(`/time-off-requests/${id}/cancel`);
