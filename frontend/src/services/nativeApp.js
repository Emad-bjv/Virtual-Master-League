import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { KeepAwake } from '@capacitor-community/keep-awake';

/**
 * Checks if the app is running in a native Capacitor mobile container (Android/iOS)
 */
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Initialize all native device features for mobile
 */
export const initNativeApp = async () => {
  if (!isNativePlatform()) {
    return;
  }

  try {
    // 1. Configure Dark Themed Status Bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#05080e' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn('[NativeApp] StatusBar init error:', err);
  }

  try {
    // 2. Lock screen orientation to Portrait for sports companion ergonomics
    await ScreenOrientation.lock({ orientation: 'portrait' });
  } catch (err) {
    console.warn('[NativeApp] ScreenOrientation lock error:', err);
  }

  try {
    // 3. Request Local Notification permissions if needed
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (err) {
    console.warn('[NativeApp] LocalNotifications permission error:', err);
  }

  try {
    // 4. Hide Native Splash Screen smoothly once UI is loaded
    await SplashScreen.hide({ fadeOutDuration: 400 });
  } catch (err) {
    console.warn('[NativeApp] SplashScreen hide error:', err);
  }
};

/**
 * Screen WakeLock Controller for Live Broadcast
 */
export const setScreenKeepAwake = async (enabled) => {
  if (!isNativePlatform()) return;
  try {
    if (enabled) {
      await KeepAwake.keepAwake();
    } else {
      await KeepAwake.allowSleep();
    }
  } catch (err) {
    console.warn('[NativeApp] KeepAwake toggle error:', err);
  }
};

/**
 * Trigger a native local notification for match events
 */
export const sendNativeNotification = async ({ id = Date.now(), title, body, extra = {} }) => {
  if (!isNativePlatform()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: typeof id === 'number' ? id : Date.now(),
          title: title || 'Virtual Master League',
          body: body || '',
          smallIcon: 'ic_stat_vml',
          iconColor: '#00ff87',
          extra,
        },
      ],
    });
  } catch (err) {
    console.warn('[NativeApp] LocalNotification schedule error:', err);
  }
};
