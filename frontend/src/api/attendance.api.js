// frontend/src/api/attendance.api.js
// Adjust the import below to match your existing axios instance
// from Phase 0/1 (the one that already attaches the JWT header).
import axios from './client';

export const checkIn = () => axios.post('/attendance/check-in');
export const checkOut = () => axios.post('/attendance/check-out');
export const getMyAttendance = (params) => axios.get('/attendance/me', { params });
export const getAllAttendance = (params) => axios.get('/attendance', { params });
export const correctAttendance = (id, data) => axios.patch(`/attendance/${id}`, data);