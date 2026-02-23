<div class="editor-selection">
  <div class="editor-chips">
    <!-- Selectable Editors (Development, Content, Line, Copy) -->
    @for (editor of selectableEditors; track editor; let i = $index) {
      <button
        class="editor-chip"
        [class.selected]="isSelected(editor.id)"
        (click)="toggleEditor(editor)"
        type="button">
        <span class="editor-number">{{i + 1}}</span>
        <span class="editor-icon">{{editor.icon}}</span>
        <div class="editor-info">
          <span class="editor-name">{{editor.name}}</span>
          <span class="editor-description">{{editor.description}}</span>
        </div>
        @if (isSelected(editor.id)) {
          <span class="check-mark">✓</span>
        }
      </button>
    }

    <!-- PwC Brand Alignment Editor (Disabled, Always ON) -->
    @if (brandAlignmentEditor) {
      <button
        class="editor-chip selected disabled"
        type="button"
        disabled>
        <span class="editor-number">{{selectableEditors.length + 1}}</span>
        <span class="editor-icon">{{brandAlignmentEditor.icon}}</span>
        <div class="editor-info">
          <span class="editor-name">{{brandAlignmentEditor.name}}</span>
          <span class="editor-description">{{brandAlignmentEditor.description}}</span>
        </div>
        <span class="check-mark">✓</span>
      </button>
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
