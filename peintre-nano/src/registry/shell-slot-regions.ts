/**
 * Correspondance `slot_id` (PageManifest) → région du shell (`RootShell`).
 * Tout `slot_id` absent de cette liste est rendu dans la zone `main` avec
 * `data-testid="page-slot-unmapped"` (comportement explicite, story 3.3).
 */
export const SHELL_SLOT_REGION_IDS = ['header', 'nav', 'main', 'aside', 'footer'] as const;

export type ShellSlotRegionId = (typeof SHELL_SLOT_REGION_IDS)[number];

export function mapSlotIdToShellRegion(slotId: string): ShellSlotRegionId | 'unmapped' {
  return (SHELL_SLOT_REGION_IDS as readonly string[]).includes(slotId)
    ? (slotId as ShellSlotRegionId)
    : 'unmapped';
}
