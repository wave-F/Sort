/**
 * WebView Safety Module - TypeScript Definitions
 * iOS WebView touch safety module for HTML5 games
 * 
 * @version 1.0.0
 * @license MIT
 */

export interface WebViewSafetyConfig {
  /**
   * Prevent double-tap magnifier on iOS
   * @default true
   */
  preventDoubleTap?: boolean;
  
  /**
   * Prevent long-press context menu
   * @default true
   */
  preventLongPress?: boolean;
  
  /**
   * Prevent text selection
   * @default true
   */
  preventSelection?: boolean;
  
  /**
   * Prevent right-click/long-press context menu
   * @default true
   */
  preventContextMenu?: boolean;
  
  /**
   * Auto-inject CSS styles
   * Set to false if you're using the external webview-safety.css file
   * @default true
   */
  injectCSS?: boolean;
  
  /**
   * Double-tap detection threshold in milliseconds
   * @default 300
   */
  doubleTapThreshold?: number;
}

export interface InitResult {
  /**
   * Whether initialization was successful
   */
  initialized: boolean;
  
  /**
   * Whether the current device is detected as iOS
   */
  isIOS: boolean;
}

/**
 * WebViewSafety - iOS WebView touch safety module
 * 
 * Features:
 * - Disable double-tap magnifier
 * - Prevent long-press system menu
 * - Prevent text selection
 * - Preserve all game touch interactions
 * 
 * @example
 * ```typescript
 * import WebViewSafety from 'webview-safety-module';
 * 
 * // Initialize with default options
 * WebViewSafety.init();
 * 
 * // Or with custom options
 * WebViewSafety.init({
 *   preventDoubleTap: true,
 *   preventLongPress: true,
 *   injectCSS: false // if using external CSS file
 * });
 * ```
 */
declare class WebViewSafety {
  /**
   * Initialize the safety module
   * Should be called after DOM is ready
   * 
   * @param options - Configuration options
   * @returns Object containing initialization status and iOS detection result
   * 
   * @example
   * ```typescript
   * const result = WebViewSafety.init({ preventDoubleTap: true });
   * console.log(result.isIOS); // true on iOS devices
   * ```
   */
  static init(options?: WebViewSafetyConfig): InitResult;
  
  /**
   * Enable text selection for a specific element (e.g., input fields)
   * 
   * @param element - Target HTML element
   * 
   * @example
   * ```typescript
   * const input = document.querySelector('input');
   * WebViewSafety.enableSelectionFor(input);
   * ```
   */
  static enableSelectionFor(element: HTMLElement | null): void;
  
  /**
   * Disable all safety measures for a specific element
   * Use this for elements that need long-press or other native behaviors
   * 
   * @param element - Target HTML element
   * 
   * @example
   * ```typescript
   * const customButton = document.querySelector('.long-press-button');
   * WebViewSafety.disableFor(customButton);
   * ```
   */
  static disableFor(element: HTMLElement | null): void;
  
  /**
   * Re-enable safety measures for a specific element
   * 
   * @param element - Target HTML element
   * 
   * @example
   * ```typescript
   * const element = document.querySelector('.game-area');
   * WebViewSafety.enableFor(element);
   * ```
   */
  static enableFor(element: HTMLElement | null): void;
  
  /**
   * Check if the module has been initialized
   */
  static readonly isInitialized: boolean;
  
  /**
   * Check if the current device is iOS
   * Note: This value is only accurate after init() is called
   */
  static readonly isIOS: boolean;
  
  /**
   * Get the current configuration
   * Returns a copy of the config object
   */
  static readonly config: Readonly<Required<WebViewSafetyConfig>>;
}

export { WebViewSafety };
export default WebViewSafety;

// Global declaration for script tag usage
declare global {
  interface Window {
    WebViewSafety: typeof WebViewSafety;
  }
}
