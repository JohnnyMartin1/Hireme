/**
 * React Hook for Platform Detection
 * 
 * Use this hook in components to detect if running in Capacitor
 * and conditionally render different UI.
 * 
 * @example
 * ```tsx
 * const { isApp, isWeb, platform } = usePlatform();
 * 
 * if (isApp) {
 *   return <MobileComponent />;
 * }
 * return <WebComponent />;
 * ```
 */

import { useMemo } from 'react';
import { isCapacitor, isIOS, isAndroid, getPlatform } from '@/lib/capacitor';

export function usePlatform() {
  const platform = useMemo(() => getPlatform(), []);
  const isApp = useMemo(() => isCapacitor(), []);
  const isWeb = useMemo(() => !isCapacitor(), []);
  const ios = useMemo(() => isIOS(), []);
  const android = useMemo(() => isAndroid(), []);

  return {
    platform,      // 'ios' | 'android' | 'web'
    isApp,         // true if running in Capacitor
    isWeb,         // true if running in web browser
    isIOS: ios,    // true if iOS
    isAndroid: android, // true if Android
  };
}
