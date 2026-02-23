<div class="editor-selection">
  <label class="section-label">Choose the editing service(s) to apply</label>
  <div class="editor-chips">
    @for (editor of selectableEditors; track editor.id) {
      <label class="service-card" [class.selected]="isSelected(editor.id)">
        <input
          type="checkbox"
          [checked]="isSelected(editor.id)"
          (change)="toggleEditor(editor)"
          [id]="'editor-' + editor.id">
        <span class="service-label" [innerHTML]="getEditorNameHtml(editor.name)"></span>
        <span class="service-card-toggle"></span>
      </label>
    }
    @if (brandAlignmentEditor) {
      <label class="service-card selected disabled">
        <input
          type="checkbox"
          [checked]="true"
          id="editor-brand-alignment"
          disabled>
        <span class="service-label" [innerHTML]="getEditorNameHtml(brandAlignmentEditor.name)"></span>
        <span class="service-card-toggle"></span>
      </label>
    }
  </div>

  <div class="editor-actions">
    <button
      class="cancel-button"
      (click)="cancelSelection()"
      type="button">
      Cancel
    </button>
    <button
      class="submit-button"
      [disabled]="!canSubmit"
      (click)="submitSelection()"
      type="button">
      Continue with {{ selectedCount }} {{ selectedCount === 1 ? 'Editor' : 'Editors' }}
    </button>
  </div>
</div>
