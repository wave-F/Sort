import { WebPlugin } from '@capacitor/core';
import type { CustomHapticsPlugin } from './definitions';

export class CustomHapticsWeb extends WebPlugin implements CustomHapticsPlugin {

  private vibrate(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  }

  async impact(options?: { style?: string }): Promise<void> {
    const map: Record<string, number> = { light: 10, medium: 20, heavy: 30, rigid: 15, soft: 25 };
    this.vibrate(map[options?.style || 'medium'] || 20);
  }

  async notification(options?: { type?: string }): Promise<void> {
    const map: Record<string, number[]> = {
      success: [15, 40, 15],
      warning: [20, 30, 20, 30, 20],
      error: [25, 50, 25, 50, 25],
    };
    this.vibrate(map[options?.type || 'success'] || map.success);
  }

  async selection(): Promise<void> {
    this.vibrate(5);
  }

  async playTransient(options?: { intensity?: number }): Promise<void> {
    this.vibrate(Math.round((options?.intensity ?? 0.5) * 30));
  }

  async playContinuous(options?: { duration?: number }): Promise<void> {
    this.vibrate(Math.round((options?.duration ?? 0.3) * 1000));
  }

  async playPattern(options: { ahapJson: string }): Promise<void> {
    try {
      const ahap = JSON.parse(options.ahapJson);
      if (!ahap?.Pattern) return;

      const events = ahap.Pattern
        .filter((item: any) => item.Event)
        .map((item: any) => {
          const e = item.Event;
          const params = e.EventParameters || [];
          const intensity = params.find((p: any) => p.ParameterID === 'HapticIntensity');
          return {
            time: e.Time || 0,
            duration: e.EventDuration || 0.05,
            intensity: intensity ? intensity.ParameterValue : 0.5,
          };
        })
        .sort((a: any, b: any) => a.time - b.time);

      if (events.length === 0) return;

      const pattern: number[] = [];
      let cursor = 0;
      for (const event of events) {
        const startMs = Math.round(event.time * 1000);
        const durationMs = Math.max(Math.round(event.duration * 1000 * event.intensity), 5);
        if (startMs > cursor) pattern.push(startMs - cursor);
        pattern.push(durationMs);
        cursor = startMs + durationMs;
      }

      if (pattern.length > 0) this.vibrate(pattern);
    } catch {
      // Silent fallback
    }
  }

  async playBundled(): Promise<void> {
    this.vibrate(20);
  }

  async stop(): Promise<void> {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(0);
    }
  }

  async checkSupport(): Promise<{ haptics: boolean; audio: boolean }> {
    return {
      haptics: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
      audio: false,
    };
  }
}
