import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { isNativePlatform } from '../services/nativeApp';

export function useNetworkStatus() {
  const [status, setStatus] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    let networkListener = null;

    const checkInitial = async () => {
      try {
        const netStatus = await Network.getStatus();
        setStatus({
          isOnline: netStatus.connected,
          connectionType: netStatus.connectionType,
        });
      } catch {
        setStatus({
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
          connectionType: 'browser',
        });
      }
    };

    checkInitial();

    if (isNativePlatform()) {
      Network.addListener('networkStatusChange', (netStatus) => {
        setStatus({
          isOnline: netStatus.connected,
          connectionType: netStatus.connectionType,
        });
      }).then((handle) => {
        networkListener = handle;
      });
    } else {
      const handleOnline = () => setStatus((prev) => ({ ...prev, isOnline: true }));
      const handleOffline = () => setStatus((prev) => ({ ...prev, isOnline: false }));

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (networkListener && typeof networkListener.remove === 'function') {
          networkListener.remove();
        }
      };
    }

    return () => {
      if (networkListener && typeof networkListener.remove === 'function') {
        networkListener.remove();
      }
    };
  }, []);

  return status;
}
