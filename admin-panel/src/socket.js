import { io } from 'socket.io-client';

let rawURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
rawURL = rawURL.replace(/\/+$/, '').replace(/\/api$/, '');

export const socket = io(rawURL, {
  autoConnect: false,
  withCredentials: true,
});
