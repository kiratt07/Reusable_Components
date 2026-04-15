import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  HostListener,
  ViewChild,
  ElementRef,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, switchMap, finalize, takeUntil, forkJoin, map } from 'rxjs';

import { FocalEntityGroup, FocalEntity } from '../../risk-mitigation/models/alert-focal-entity.model';
import {
  EntityDisambiguationService,
  EntityDisambiguationRecord,
  EntityDisambiguationRequest
} from '../../services/entity-disambiguation.service';
import { NotificationService } from '../../services/notification.service';
import { SamplingService, SamplingDisplayItem } from '../../services/sampling.service';
import { AlertDetailsComponent } from '../../alert-details/alert-details.component';

@Component({
  selector: 'app-entity-disambiguation-focal-entity',
  templateUrl: './entity-disambiguation-focal-entity.component.html',
  styleUrls: ['./entity-disambiguation-focal-entity.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, AlertDetailsComponent]
})
export class EntityDisambiguationFocalEntityComponent implements OnInit, OnChanges, OnDestroy {

  // ── Inputs / Outputs ──────────────────────────────────────────────────────

  /*
   * focalEntityData: Sampling API source passed by parent.
   * The child NEVER mutates this — it copies into bucketedEntities signal
   * on bootstrap. Left-panel cards are derived from this in the parent and
   * must stay untouched.
   */
  @Input() focalEntityData: FocalEntityGroup | null = null;

  /*
   * selectedEntityChange emits FocalEntity[] (dev_new contract).
   * The middle-panel row checkbox drives this; the parent's
   * onMiddleSelected() receives the array and fetches right-panel details.
   * In practice we emit a 0 or 1-element array because the updated dev_save
   * uses single-select (one signal). This keeps the parent contract intact.
   */
  @Output() selectedEntityChange   = new EventEmitter<FocalEntity[]>();
  @Output() flagQualityIssueChange = new EventEmitter<boolean>();
  @Output() markAsParentChange     = new EventEmitter<FocalEntity>();

  /*
   * entityAdded (updated dev_save): emits the confirmed new entity after
   * Add & Save so the parent writes it into
   * focalEntityData[selectedDataKey].focalEntities.
   * Without this the entity disappears on every tab switch because
   * bootstrap() re-copies from focalEntityData which never had the new row.
   */
  @Output() entityAdded = new EventEmitter<FocalEntity>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // ── Signal state (updated dev_save) ──────────────────────────────────────

  /*
   * bucketedEntities: the middle table's display array — owned by this child.
   * Populated from backend GET on bootstrap (persisted records only).
   * This replaces dev_new's @Input() bucketedEntities fed from the parent,
   * because the updated dev_save moves ownership here and populates from
   * the backend instead of the parent's selection list.
   */
  bucketedEntities = signal<FocalEntity[]>([]);

  /*
   * selectedEntity: which row in the middle table is currently checked.
   * Single-select signal (updated dev_save).
   * dev_new used a Set<string> for multi-select; updated dev_save simplifies
   * to single-select. The emitter wraps it in an array to satisfy the
   * FocalEntity[] output contract.
   */
  selectedEntity = signal<FocalEntity | null>(null);

  isLoading = signal(false);
  isSaving  = signal(false);

  // ── Computed state ────────────────────────────────────────────────────────

  isAllSelectedComputed = computed(() => {
    const entities = this.bucketedEntities();
    return entities.length > 0 && entities.every(e => e.isSelected);
  });

  // ── Dropdown options ──────────────────────────────────────────────────────
  identityTypes = ['LEI', 'FENERGO', 'CRDS'];

  // ── Action menu ───────────────────────────────────────────────────────────
  showActionMenu = false;
  activeEntity: FocalEntity | null = null;
  menuPosition: { top: number; left: number } | null = null;

  // ── Modal / panel state ───────────────────────────────────────────────────
  showAddEntityModal = false;
  showDQIModal       = false;
  addEntitySubmitted = false;

  // ── New entity form model ─────────────────────────────────────────────────
  newEntity: {
    name: string;
    peId: string;
    identityType: string;
    identity: string;
    isParent: boolean;
  } = { name: '', peId: '', identityType: 'LEI', identity: '', isParent: false };

  // ── DQI state ─────────────────────────────────────────────────────────────
  /*
   * evidenceDisplayName + selectedFile kept from dev_new's full DQI
   * file-upload flow. The updated dev_save reverted submitDQI() to a
   * local-flag-only call, but we keep the full upload flow from dev_new
   * because it actually persists the DQI evidence to the backend.
   */
  dqiReason           = '';
  evidenceDisplayName = '';
  isDragOver          = false;
  selectedFileName    = '';
  selectedFile: File | null = null;

  // ── Internal ──────────────────────────────────────────────────────────────
  private originalEntities: any[] = [];
  private currentAlertId = '';
  private focalPartyKey  = '';

  /*
   * lastAddedPeId (updated dev_save): component-level property, NOT
   * sessionStorage. Included in GET calls only for this component session.
   * Reset to null in bootstrap() so stale peIds from previous alerts never
   * leak into a new alert's GET calls.
   */
  private lastAddedPeId: string | null = null;

  private destroy$ = new Subject<void>();

  samplingData: SamplingDisplayItem[] = [];

  constructor(
    private entityDisambiguationService: EntityDisambiguationService,
    private notificationService: NotificationService,
    private samplingService: SamplingService,
    private alertDetails: AlertDetailsComponent
  ) {
    this.samplingService.samplingData$.subscribe(data => {
      this.samplingData = data;
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.bootstrap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    /*
     * Re-bootstrap when parent passes new focalEntityData (parent key change).
     * dev_new also watched @Input() bucketedEntities changes, but since
     * bucketedEntities is now a child-owned signal, that watch is removed.
     */
    if (changes['focalEntityData'] && !changes['focalEntityData'].firstChange) {
      this.bootstrap();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  private bootstrap(): void {
    if (!this.focalEntityData?.focalEntities) return;

    const urlParts = window.location.pathname.split('/');
    this.currentAlertId = urlParts[urlParts.length - 1] || '';

    // Reset so stale peIds from a previous alert never appear in new GETs
    this.lastAddedPeId = null;

    /*
     * Copy Sampling API rows into signal state — never mutate @Input.
     * loadPersistedData() will filter this down to backend-confirmed rows only.
     */
    this.bucketedEntities.set(
      this.focalEntityData.focalEntities.map(e => ({
        ...e,
        isParent:   e.isParent ?? false,
        isSelected: false
      }))
    );

    this.selectedEntity.set(null);
    this.emitSelectedEntity();
    this.loadPersistedData();
  }

  // ── GET: load persisted records ───────────────────────────────────────────

  private loadPersistedData(): void {
    const currentEntities = this.bucketedEntities();
    if (!currentEntities.length) return;

    this.isLoading.set(true);

    const uniqueTypeValues = [
      ...new Set(
        [...currentEntities.map(e => e.peId), this.lastAddedPeId]
          .filter((id): id is string => !!id)
      )
    ];

    if (!uniqueTypeValues.length) {
      this.isLoading.set(false);
      this.bucketedEntities.set([]);
      this.snapshotOriginals();
      return;
    }

    const requests = uniqueTypeValues.map(typeValue =>
      this.entityDisambiguationService.fetchEntities(typeValue)
    );

    forkJoin(requests)
      .pipe(
        map((allResults: EntityDisambiguationRecord[][]) => allResults.flat()),
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (allRecords: EntityDisambiguationRecord[]) => {
          const focalRecords = allRecords.filter(r => r.type === 'FOCALENTITY');

          if (!focalRecords.length) {
            // No backend history — empty table, left panel untouched
            this.bucketedEntities.set([]);
            this.snapshotOriginals();
            return;
          }

          // Step 1: Sampling API rows that have a matching backend record
          const matchedFromSampling = currentEntities.filter(entity =>
            focalRecords.some(r => r.peId === entity.peId && r.peName === entity.name)
          );

          // Step 2: Backend-only rows (added via Add Entity, not in Sampling API)
          const existingKeys = new Set(currentEntities.map(e => `${e.peId}__${e.name}`));
          const newEntitiesFromBackend: FocalEntity[] = focalRecords
            .filter(r => !existingKeys.has(`${r.peId}__${r.peName}`))
            .map(r => ({
              name:                  r.peName,
              peId:                  r.peId,
              identityType:          r.identityType,
              identity:              r.identityValue,
              isSelected:            false,
              totalTransactionCount: 0,
              totalAmount:           '0',
              addresses:             [],
              country:               '',
              isParent:              r.isParent ?? false,
              transactions:          []
            }));

          // Step 3: Merge identity fields, then append backend-only rows
          const mergedSamplingRows = this.entityDisambiguationService.mergePersistedData(
            matchedFromSampling,
            focalRecords
          );

          this.bucketedEntities.set([...mergedSamplingRows, ...newEntitiesFromBackend]);
          this.snapshotOriginals();
        },
        error: (err) => {
          console.error('Failed to load entity history', err);
          this.bucketedEntities.set([]);
          this.snapshotOriginals();
        }
      });
  }

  private snapshotOriginals(): void {
    this.originalEntities = JSON.parse(JSON.stringify(this.bucketedEntities()));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  onSave(): void {
    const currentEntities = this.bucketedEntities();
    if (!currentEntities.length || this.isSaving()) return;

    const payload = this.entityDisambiguationService.preparePayload(
      currentEntities,
      this.originalEntities,
      this.selectedEntity(),
      'focal',
      this.currentAlertId
    );

    if (!payload || payload.length === 0) {
      this.notificationService.showError('No changes to save.');
      return;
    }

    this.isSaving.set(true);

    const uniqueTypeValues = [...new Set(payload.map(p => p.peId).filter(id => !!id))];

    this.entityDisambiguationService
      .saveEntities(payload)
      .pipe(
        switchMap(() => {
          const refetchRequests = uniqueTypeValues.map(typeValue =>
            this.entityDisambiguationService.fetchEntities(typeValue)
          );
          return forkJoin(refetchRequests).pipe(
            map((allResults: EntityDisambiguationRecord[][]) => allResults.flat())
          );
        }),
        takeUntil(this.destroy$),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (allRecords: EntityDisambiguationRecord[]) => {
          const focalRecords = allRecords.filter(r => r.type === 'FOCALENTITY');
          this.bucketedEntities.set(
            this.entityDisambiguationService.mergePersistedData(
              this.bucketedEntities(),
              focalRecords
            )
          );
          this.snapshotOriginals();
          this.notificationService.showSuccess();
        },
        error: (err) => {
          console.error('Save failed', err);
          this.notificationService.showError('Failed to save changes. Please try again.');
        }
      });
  }

  // ── Add Entity ────────────────────────────────────────────────────────────

  onAddEntity(): void { this.showAddEntityModal = true; }

  saveEntity(): void {
    this.addEntitySubmitted = true;
    if (!this.newEntity.name?.trim() || !this.newEntity.peId?.trim()) return;
    if (this.isSaving()) return;

    const newFocalEntity: FocalEntity & { _isOptimistic?: boolean } = {
      name:                  this.newEntity.name.trim(),
      peId:                  this.newEntity.peId.trim(),
      identityType:          this.newEntity.identityType,
      identity:              this.newEntity.identity,
      isSelected:            false,
      totalTransactionCount: 0,
      totalAmount:           '0',
      addresses:             [],
      country:               '',
      isParent:              this.newEntity.isParent || false,
      transactions:          [],
      _isOptimistic:         true
    };

    this.lastAddedPeId = newFocalEntity.peId;

    // Optimistic UI — row appears immediately
    this.bucketedEntities.update(list => [...list, newFocalEntity]);

    this.addEntitySubmitted = false;
    this.resetNewEntity();
    this.closeModal();

    const addPayload: EntityDisambiguationRequest[] = [{
      alertId:       this.currentAlertId,
      peId:          newFocalEntity.peId,
      peName:        newFocalEntity.name,
      identityType:  newFocalEntity.identityType,
      identityValue: newFocalEntity.identity,
      type:          'FOCALENTITY',
      typeValue:     newFocalEntity.peId,
      isParent:      newFocalEntity.isParent,
      parentPeId:    null,
      createdBy:     'system',
      updatedBy:     'system'
    }];

    this.isSaving.set(true);

    this.entityDisambiguationService
      .saveEntities(addPayload)
      .pipe(
        switchMap(() => this.entityDisambiguationService.fetchEntities(newFocalEntity.peId)),
        takeUntil(this.destroy$),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (records: EntityDisambiguationRecord[]) => {
          const focalRecords = records.filter(r => r.type === 'FOCALENTITY');
          const confirmed    = focalRecords.find(r => r.peName === newFocalEntity.name);

          // Immutably confirm the optimistic row
          this.bucketedEntities.update(list =>
            list.map(e =>
              (e.peId === newFocalEntity.peId && e.name === newFocalEntity.name)
                ? {
                    ...e,
                    _isOptimistic: false,
                    identityType:  confirmed?.identityType  || newFocalEntity.identityType,
                    identity:      confirmed?.identityValue || newFocalEntity.identity,
                    isParent:      confirmed?.isParent      ?? newFocalEntity.isParent
                  }
                : e
            )
          );

          // Emit to parent so the entity persists across tab switches
          const confirmedRow = this.bucketedEntities().find(
            e => e.peId === newFocalEntity.peId && e.name === newFocalEntity.name
          );
          if (confirmedRow) this.entityAdded.emit(confirmedRow);

          this.snapshotOriginals();
          this.notificationService.showSuccess();
        },
        error: (err) => {
          console.error('Failed to persist new entity', err);
          this.bucketedEntities.update(list =>
            list.filter(
              e => !(e.peId === newFocalEntity.peId && e.name === newFocalEntity.name)
            )
          );
          this.notificationService.showError('Failed to add entity. Please try again.');
        }
      });
  }

  resetNewEntity(): void {
    this.addEntitySubmitted = false;
    this.newEntity = { name: '', peId: '', identityType: 'LEI', identity: '', isParent: false };
  }

  // ── DQI ───────────────────────────────────────────────────────────────────

  onMarkDQI(): void { this.showDQIModal = true; }

  submitDQI(): void {
    if (!this.selectedFile) {
      this.notificationService.showError('Kindly select file to upload !!');
      return;
    }
    this.focalPartyKey  = this.getFocalPartyKey();
    const urlParts      = window.location.pathname.split('/');
    this.currentAlertId = urlParts[urlParts.length - 1] || '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('alertId', this.currentAlertId);
    formData.append('p2eId', this.focalPartyKey);
    formData.append('rationale', this.dqiReason || '');
    formData.append('evidenceDisplayName', this.evidenceDisplayName);
    formData.append('fileName', `${this.currentAlertId}_${this.focalPartyKey}_DQI.pdf`);
    formData.append('createdBy', 'system');

    this.entityDisambiguationService.uploadEvidenceAttachment(formData)
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('File uploaded successfully!!');
          this.resetDQI();
          if (this.focalEntityData) {
            this.focalEntityData.flagQualityIssue = true;
            this.flagQualityIssueChange.emit(true);
          }
          this.closeModal();
          this.alertDetails.updateFocalDQIFlag(true);
        },
        error: () => {
          this.notificationService.showError('Failed to save changes. Please try again.');
        }
      });
  }

  resetDQI(): void {
    this.dqiReason           = '';
    this.selectedFileName    = '';
    this.evidenceDisplayName = '';
    this.selectedFile        = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  private getFocalPartyKey(): string {
    const samplingData = this.samplingService.getSamplingDataSnapshot();
    if (!samplingData?.length) return '';
    return samplingData[0]?.focalPartyKey ?? '';
  }

  closeModal(): void {
    this.addEntitySubmitted = false;
    this.showAddEntityModal = false;
    this.showDQIModal       = false;
  }

  // ── Row selection (signal-based) ──────────────────────────────────────────

  selectEntity(entity: FocalEntity): void {
    this.bucketedEntities.update(list =>
      list.map(e => ({ ...e, isSelected: e === entity }))
    );
    this.selectedEntity.set(entity);
    this.emitSelectedEntity();
  }

  toggleSelection(entity: FocalEntity, event: Event): void {
    event.stopPropagation();
    let newlySelected: FocalEntity | null = null;

    this.bucketedEntities.update(list =>
      list.map(e => {
        if (e === entity) {
          const isSelected = !e.isSelected;
          if (isSelected) newlySelected = e;
          return { ...e, isSelected };
        }
        return e;
      })
    );

    this.selectedEntity.set(newlySelected);
    this.emitSelectedEntity();
  }

  toggleAllSelection(_event: Event): void {
    const shouldSelect = !this.isAllSelectedComputed();
    this.bucketedEntities.update(list =>
      list.map(e => ({ ...e, isSelected: shouldSelect }))
    );
    this.selectedEntity.set(shouldSelect ? (this.bucketedEntities()[0] ?? null) : null);
    this.emitSelectedEntity();
  }

  isAllSelected(): boolean {
    return this.isAllSelectedComputed();
  }

  // ── Flag quality ──────────────────────────────────────────────────────────

  updateFlagQualityIssue(event: Event): void {
    if (this.focalEntityData) {
      this.focalEntityData.flagQualityIssue = (event.target as HTMLInputElement).checked;
      this.flagQualityIssueChange.emit(this.focalEntityData.flagQualityIssue);
    }
  }

  // ── Parent toggle ─────────────────────────────────────────────────────────

  toggleParent(entity: FocalEntity, event: Event): void {
    event.stopPropagation();
    const isChecked = (event.target as HTMLInputElement).checked;
    this.bucketedEntities.update(list =>
      list.map(e => e === entity ? { ...e, isParent: isChecked } : e)
    );
    if (isChecked) this.onMarkAsParent({ ...entity, isParent: isChecked }, event);
  }

  // ── Action menu ───────────────────────────────────────────────────────────

  onActionMenu(event: Event, entity: FocalEntity): void {
    event.stopPropagation();
    if (this.showActionMenu && this.activeEntity?.peId === entity.peId) {
      this.closeMenu();
      return;
    }
    const button = event.target as HTMLElement;
    const rect   = button.getBoundingClientRect();
    this.menuPosition = { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX };
    this.activeEntity   = entity;
    this.showActionMenu = true;
  }

  onMarkAsParent(entity: FocalEntity, event: Event): void {
    event.stopPropagation();
    this.markAsParentChange.emit(entity);
    this.closeMenu();
  }

  closeMenu(): void {
    this.showActionMenu = false;
    this.activeEntity   = null;
    this.menuPosition   = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.closeMenu(); }

  // ── File upload ───────────────────────────────────────────────────────────

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragOver = true; }
  onDragLeave(): void { this.isDragOver = false; }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file && file.type === 'application/pdf') this.selectedFileName = file.name;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        this.notificationService.showError('Kindly select pdf file to upload.');
        input.value = '';
        return;
      }
      this.selectedFile     = file;
      this.selectedFileName = file.name;
    }
  }

  // ── Emitters ──────────────────────────────────────────────────────────────

  /*
   * Wraps the single-select signal in a 0/1-element array to satisfy the
   * parent's FocalEntity[] contract from dev_new.
   */
  private emitSelectedEntity(): void {
    const entity = this.selectedEntity();
    this.selectedEntityChange.emit(entity ? [entity] : []);
  }

  onReset(): void {
    this.bucketedEntities.update(list => list.map(e => ({ ...e, isSelected: false })));
    this.selectedEntity.set(null);
    this.emitSelectedEntity();
  }

  // ── TrackBy ───────────────────────────────────────────────────────────────

  trackByPeId(_index: number, item: FocalEntity): string {
    return item.peId;
  }
}
