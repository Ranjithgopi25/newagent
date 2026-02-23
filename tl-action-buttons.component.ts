import { Component, Input, Output, EventEmitter } from '@angular/core';

import { EditorOption } from '../../../../core/models';

@Component({
    selector: 'app-editor-selection',
    imports: [],
    templateUrl: './editor-selection.component.html',
    styleUrl: './editor-selection.component.scss'
})
export class EditorSelectionComponent {
  @Input() editors: EditorOption[] = [];
  @Output() selectionChanged = new EventEmitter<EditorOption[]>();
  @Output() submitted = new EventEmitter<string[]>();
  @Output() cancelled = new EventEmitter<void>();

  toggleEditor(editor: EditorOption): void {
    // Prevent toggling brand-alignment as it's always required
    if (editor.id === 'brand-alignment' || editor.alwaysSelected || editor.disabled) {
      return;
    }

    const updatedEditors = this.editors.map(e => {
      if (e.id === editor.id) {
        return { ...e, selected: !e.selected };
      }
      return e;
    });
    
    // Ensure brand-alignment is always selected
    const editorsWithBrand = updatedEditors.map(e => {
      if (e.id === 'brand-alignment') {
        return { ...e, selected: true };
      }
      return e;
    });
    
    this.editors = editorsWithBrand;
    this.selectionChanged.emit(editorsWithBrand);
  }

  isSelected(editorId: string): boolean {
    return this.editors.find(e => e.id === editorId)?.selected || false;
  }

  /**
   * Get selectable editors (excluding brand-alignment which is always enabled)
   */
  get selectableEditors(): EditorOption[] {
    return this.editors.filter(editor => editor.id !== 'brand-alignment');
  }

  /**
   * Get brand alignment editor info
   */
  get brandAlignmentEditor(): EditorOption | undefined {
    return this.editors.find(editor => editor.id === 'brand-alignment');
  }

  submitSelection(): void {
    // Always include brand-alignment in the submitted list
    const selectedIds = this.editors.filter(e => e.selected).map(e => e.id);
    if (!selectedIds.includes('brand-alignment')) {
      selectedIds.push('brand-alignment');
    }
    this.submitted.emit(selectedIds);
  }

  cancelSelection(): void {
    this.cancelled.emit();
  }

  get canSubmit(): boolean {
    return this.editors.some(e => e.selected);
  }

  get selectedCount(): number {
    return this.editors.filter(e => e.selected).length;
  }
}
