
<div class="editor-selection">
  <p class="section-title">Choose the editing service(s) to apply</p>
  <div class="services-checklist">
    @for (editor of selectableEditors; track editor.id) {
      <label
        class="service-card"
        [class.selected]="isSelected(editor.id)"
        [for]="'editor-' + editor.id">
        <input
          type="checkbox"
          [id]="'editor-' + editor.id"
          [checked]="isSelected(editor.id)"
          (change)="toggleEditor(editor)"
          [attr.aria-label]="editor.name">
        <span class="service-card-toggle"></span>
        <span class="service-label" [innerHTML]="getEditorNameHtml(editor.name)"></span>
      </label>
    }
    @if (brandAlignmentEditor) {
      <label class="service-card selected disabled" for="editor-brand-alignment">
        <input
          type="checkbox"
          id="editor-brand-alignment"
          checked
          disabled
          [attr.aria-label]="brandAlignmentEditor.name">
        <span class="service-card-toggle"></span>
        <span class="service-label" [innerHTML]="getEditorNameHtml(brandAlignmentEditor.name)"></span>
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
      Continue with {{selectedCount}} {{selectedCount === 1 ? 'Editor' : 'Editors'}}
    </button>
  </div>
</div>
