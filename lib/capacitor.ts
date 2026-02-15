/**
 * Capacitor Platform Detection Utilities
 * 
 * Use these utilities to detect if the app is running in Capacitor
 * (iOS/Android app) vs web browser, and conditionally render different UI.
 */

// Safely import Capacitor - it may not be available in all environments
let Capacitor: any = null;
try {
  Capacitor = require('@capacitor/core').Capacitor;
} catch (e) {
  // Capacitor not available - this is fine for web-only deployments
  Capacitor = null;
}

/**
 * Check if the app is running in a native Capacitor environment (iOS/Android)
 * @returns true if running in Capacitor, false if in web browser
 */
export const isCapacitor = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    // Method 1: Check Capacitor.isNativePlatform() (primary method)
    if (Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) {
      return true;
    }
    
    // Method 2: Check window.Capacitor (fallback)
    const win = window as any;
    if (win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform()) {
      return true;
    }
    
    // Method 3: Check for Capacitor in user agent or window properties
    const ua = navigator.userAgent || '';
    if (ua.includes('Capacitor') || ua.includes('ionic')) {
      return true;
    }
    
    // Method 4: Check if we're in a WebView (iOS/Android apps use WebView)
    // iOS WebView doesn't have Safari in user agent
    const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua);
    // Android WebView has "wv" in user agent
    const isAndroidWebView = /Android.*wv/i.test(ua);
    
    if (isIOSWebView || isAndroidWebView) {
      // Additional check: if we're loading from a server URL in a WebView,
      // it's likely a Capacitor app
      if (window.location.href.includes('192.168.') || window.location.href.includes('localhost')) {
        return true;
      }
    }
    
    return false;
  } catch (e) {
    // Silently fail - this is expected in web-only environments
    return false;
  }
};

/**
 * Check if running on iOS
 * @returns true if iOS, false otherwise
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor && typeof Capacitor.getPlatform === 'function') {
      return Capacitor.getPlatform() === 'ios';
    }
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * Check if running on Android
 * @returns true if Android, false otherwise
 */
export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor && typeof Capacitor.getPlatform === 'function') {
      return Capacitor.getPlatform() === 'android';
    }
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * Check if running on web browser
 * @returns true if web, false if native app
 */
export const isWeb = (): boolean => {
  return !isCapacitor();
};

/**
 * Get the current platform name
 * @returns 'ios' | 'android' | 'web'
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'web';
};
