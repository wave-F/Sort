import { registerPlugin } from '@capacitor/core';
import type { CustomHapticsPlugin } from './definitions';

const CustomHaptics = registerPlugin<CustomHapticsPlugin>('CustomHaptics', {
  web: () => import('./web').then(m => new m.CustomHapticsWeb()),
});

export * from './definitions';
export { CustomHaptics };
