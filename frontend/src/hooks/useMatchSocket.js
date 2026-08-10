import { useEffect, useState, useRef } from 'react';

export function useMatchSocket(matchId) {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!matchId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_BASE_URL || `${protocol}//127.0.0.1:9000/ws`;
    
    const connect = () => {
      socketRef.current = new WebSocket(`${wsUrl}/match/${matchId}/`);

      socketRef.current.onopen = () => {
        setIsConnected(true);
        console.log(`Match ${matchId} WebSocket Connected`);
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, data]);
        } catch (err) {
          console.error('Error parsing match socket message:', err);
        }
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
        console.log(`Match ${matchId} WebSocket Disconnected, retrying in 3s...`);
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.onclose = null; // prevent auto-reconnect on unmount
        socketRef.current.close();
      }
    };
  }, [matchId]);

  return { events, isConnected, socket: socketRef.current };
}
