import { BandeauLive } from '../domains/bandeau-live/BandeauLive';
import { registerWidget } from './widget-registry';

/**
 * Module métier Epic 4 — clé **`bandeau-live`** alignée sur CREOS (`widgets-catalog-bandeau-live.json`).
 */
export function registerBandeauLiveWidgets(): void {
  registerWidget('bandeau-live', BandeauLive);
}
