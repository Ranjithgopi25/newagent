import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type DDCFlowType = 
  | 'brand-format'
  | 'professional-polish'
  | 'sanitization'
  | 'client-customization'
  | 'rfp-response'
  | 'ddc-format-translator'
  | 'slide-creation'
  | 'slide-creation-prompt'
  | 'event-branding'
  | null;

@Injectable({
  providedIn: 'root'
})
export class DdcFlowService {
  private activeFlowSubject = new BehaviorSubject<DDCFlowType>(null);
  public activeFlow$: Observable<DDCFlowType> = this.activeFlowSubject.asObservable();

  private guidedDialogSubject = new BehaviorSubject<boolean>(false);
  public guidedDialog$: Observable<boolean> = this.guidedDialogSubject.asObservable();

  private composerPrefillSubject = new BehaviorSubject<string | null>(null);
  /** One-shot text for the chat composer when a flow hands off to chat (e.g. SOW draft). */
  public composerPrefill$: Observable<string | null> = this.composerPrefillSubject.asObservable();

  openFlow(flowType: DDCFlowType): void {
    this.activeFlowSubject.next(flowType);
  }
 
  closeFlow(): void {
    this.activeFlowSubject.next(null);
  }

  /** Clear any pending composer text (e.g. after chat consumed it). */
  clearComposerPrefill(): void {
    this.composerPrefillSubject.next(null);
  }

  /**
   * Close the active DDC modal and place markdown/text in the main chat input so the user can send or edit.
   */
  closeFlowAndPrefillComposer(text: string): void {
    const t = text?.trim() ?? '';
    if (t) {
      this.composerPrefillSubject.next(t);
    }
    this.activeFlowSubject.next(null);
  }
 
  openGuidedDialog(): void {
    this.guidedDialogSubject.next(true);
  }
 
  closeGuidedDialog(): void {
    this.guidedDialogSubject.next(false);
  }
 
  get currentFlow(): DDCFlowType {
    return this.activeFlowSubject.value;
  }
 
  get isGuidedDialogOpen(): boolean {
    return this.guidedDialogSubject.value;
  }
}
