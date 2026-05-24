import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

/**
 * Singleton Socket.IO client with reconnection support
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

/** Resolves when the socket is connected (connects if needed). */
export function waitForSocket(timeoutMs = 12000) {
  const s = getSocket();
  if (s.connected) return Promise.resolve(s);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Could not connect to server'));
    }, timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve(s);
    };

    const onError = (err) => {
      cleanup();
      reject(err || new Error('Connection failed'));
    };

    const cleanup = () => {
      clearTimeout(timer);
      s.off('connect', onConnect);
      s.off('connect_error', onError);
    };

    s.once('connect', onConnect);
    s.once('connect_error', onError);
    if (!s.connected) s.connect();
  });
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}

export function emitWithAck(event, data) {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    if (!s.connected) {
      reject(new Error('Not connected to server'));
      return;
    }
    const timeout = setTimeout(() => reject(new Error('Request timeout')), 10000);
    s.emit(event, data, (response) => {
      clearTimeout(timeout);
      if (response?.success === false) {
        reject(new Error(response.error || 'Request failed'));
      } else {
        resolve(response);
      }
    });
  });
}
