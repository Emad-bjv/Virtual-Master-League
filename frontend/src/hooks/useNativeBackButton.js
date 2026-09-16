import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { isNativePlatform } from '../services/nativeApp';

/**
 * Android Hardware Back Button Hook
 * Features:
 * 1. Closes open modals/drawers first via 'vml-back-button' custom event or active overlays
 * 2. Navigates back in history if not on root screen
 * 3. Double-tap to exit app on root screen with 2-second timeout
 */
export function useNativeBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    if (!isNativePlatform()) return;

    let backListener = null;

    const setupListener = async () => {
      backListener = await App.addListener('backButton', ({ canGoBack }) => {
        const now = Date.now();

        // 1. Check if any active modal wants to intercept the back button
        const backEvent = new CustomEvent('vml-hardware-back', { cancelable: true });
        const wasIntercepted = !window.dispatchEvent(backEvent);

        if (wasIntercepted) {
          return;
        }

        // 2. Check for common modal overlays in DOM
        const activeModalCloseBtn = document.querySelector('[data-modal-close-btn]');
        if (activeModalCloseBtn) {
          activeModalCloseBtn.click();
          return;
        }

        // 3. If not on root, navigate back
        const isRootRoute = location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/coach-login';

        if (!isRootRoute && canGoBack) {
          navigate(-1);
          return;
        }

        // 4. On root screen: Double-press back within 2 seconds to exit app
        if (now - lastBackPressRef.current < 2000) {
          App.exitApp();
        } else {
          lastBackPressRef.current = now;
          // Dispatch a lightweight toast event
          window.dispatchEvent(
            new CustomEvent('vml-toast', {
              detail: { message: 'برای خروج از برنامه، دوباره دکمه برگشت را بزنید', type: 'info' },
            })
          );
        }
      });
    };

    setupListener();

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [navigate, location.pathname]);
}
