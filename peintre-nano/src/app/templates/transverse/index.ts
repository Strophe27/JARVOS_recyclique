/**
 * Patrons de mise en page transverse (Epic 5) — gabarits CSS + zones sémantiques ;
 * le contenu métier reste injecté via PageManifest → registre de widgets.
 */
export {
  resolveTransverseHubFamily,
  resolveTransverseMainLayoutMode,
  type TransverseHubFamily,
  type TransverseMainLayoutMode,
} from './resolve-transverse-main-layout';
export { TransverseConsultationLayout } from './TransverseConsultationLayout';
export { TransverseHubLayout } from './TransverseHubLayout';
export { TransverseMainLayout } from './TransverseMainLayout';
