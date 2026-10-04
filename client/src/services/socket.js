import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const socketUrl = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket.io] Connected to server, ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.io] Disconnected:', reason);
    });
  }
  return socket;
};

export const joinGroupRoom = (groupId) => {
  const s = getSocket();
  if (s && groupId) {
    s.emit('join:group', { groupId });
  }
};

export const leaveGroupRoom = (groupId) => {
  const s = getSocket();
  if (s && groupId) {
    s.emit('leave:group', { groupId });
  }
};
