import { CategoryHierarchyPickerWidget } from '../widgets/category-hierarchy-picker/CategoryHierarchyPickerWidget';
import { registerWidget } from './widget-registry';

/** Widget partagé caisse / réception — un seul `widget_type` (`category-hierarchy-picker`). */
export function registerCategoryWidgets(): void {
  registerWidget('category-hierarchy-picker', CategoryHierarchyPickerWidget);
}
