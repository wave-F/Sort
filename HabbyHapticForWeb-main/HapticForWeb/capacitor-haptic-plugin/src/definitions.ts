export interface CustomHapticsPlugin {
  /**
   * Impact feedback (UIImpactFeedbackGenerator).
   */
  impact(options?: { style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' }): Promise<void>;

  /**
   * Notification feedback (UINotificationFeedbackGenerator).
   */
  notification(options?: { type?: 'success' | 'warning' | 'error' }): Promise<void>;

  /**
   * Selection feedback (UISelectionFeedbackGenerator).
   */
  selection(): Promise<void>;

  /**
   * Play a single transient haptic event via CoreHaptics.
   */
  playTransient(options?: { intensity?: number; sharpness?: number }): Promise<void>;

  /**
   * Play a continuous haptic event via CoreHaptics.
   */
  playContinuous(options?: { intensity?: number; sharpness?: number; duration?: number }): Promise<void>;

  /**
   * Play an AHAP pattern from a JSON string.
   */
  playPattern(options: { ahapJson: string }): Promise<void>;

  /**
   * Play an AHAP/HAHAP file from iOS Bundle by name (without extension).
   */
  playBundled(options: { name: string }): Promise<void>;

  /**
   * Stop the current haptic playback.
   */
  stop(): Promise<void>;

  /**
   * Check device haptic capabilities.
   */
  checkSupport(): Promise<{ haptics: boolean; audio: boolean }>;
}
