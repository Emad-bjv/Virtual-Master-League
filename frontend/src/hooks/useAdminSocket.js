import { useEffect, useState, useRef } from 'react';

export function useAdminSocket(token) {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_BASE_URL || `${protocol}//127.0.0.1:9000/ws`;
    
    const connect = () => {
      socketRef.current = new WebSocket(`${wsUrl}/admin/?token=${token}`);

      socketRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Admin WebSocket Connected');
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) => [...prev, data]);
        } catch (err) {
          console.error('Error parsing admin socket message:', err);
        }
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
        console.log('Admin WebSocket Disconnected, retrying in 3s...');
        setTimeout(connect, 3000);
      };

      socketRef.current.onerror = (err) => {
        console.error('Admin WebSocket Error:', err);
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.onclose = null; // prevent auto-reconnect on unmount
        socketRef.current.close();
      }
    };
  }, [token]);

  return { messages, isConnected, socket: socketRef.current };
}
