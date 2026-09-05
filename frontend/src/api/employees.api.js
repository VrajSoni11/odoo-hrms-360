import client from './client';

export const getEmployees = () => client.get('/employees');
