import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FocalEntityGroup, FocalEntity } from '../../risk-mitigation/models/alert-focal-entity.model';

@Component({
  selector: 'app-entity-disambiguation-focal-entity',
  templateUrl: './entity-disambiguation-focal-entity.component.html',
  styleUrls: ['./entity-disambiguation-focal-entity.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EntityDisambiguationFocalEntityComponent implements OnInit, OnChanges {

  // Full group data (used for flag quality, save, etc.)
  @Input() focalEntityData: FocalEntityGroup | null = null;

  // FIX: entities bucketed from the left panel — drives the middle table rows
  // Parent pushes selectedFocalEntities here; each left-panel checkbox adds a row
  @Input() bucketedEntities: FocalEntity[] = [];

  @Output() selectedEntityChange = new EventEmitter<FocalEntity | null>();
  @Output() flagQualityIssueChange = new EventEmitter<boolean>();
  @Output() markAsParentChange = new EventEmitter<FocalEntity>();

  identityTypes = ['LEI', 'FENERGO', 'CRDS'];

  // FIX: single selected entity — set by middle-panel checkbox
  // Drives the right panel in the parent via selectedEntityChange emission
  selectedEntity: FocalEntity | null = null;

  // Action menu state
  showActionMenu = false;
  activeEntity: FocalEntity | null = null;
  menuPosition: { top: number; left: number } | null = null;

  // Modal state
  showAddEntityModal = false;
  showDQIModal = false;

  newEntity: any = {
    name: '',
    peId: '',
    identityType: 'LEI',
    identity: '',
    isParent: false
  };

  dqiReason: string = '';
  isDragOver = false;
  selectedFileName: string = '';

  ngOnInit(): void {
    // No auto-selection on init — user drives selection via left panel checkboxes
    this.selectedEntity = null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When bucketedEntities changes, if the currently selected entity
    // was removed from the bucket, clear the right panel
    if (changes['bucketedEntities']) {
      const stillExists = this.bucketedEntities?.some(
        e => e.peId === this.selectedEntity?.peId
      );
      if (!stillExists) {
        this.selectedEntity = null;
        this.selectedEntityChange.emit(null);
      }
    }
  }

  // ── Row checkbox toggle ───────────────────────────────────────────────────
  // Checking a middle-panel row sets selectedEntity → parent shows right panel
  // Unchecking clears selectedEntity → parent shows "Choose Entity"
  toggleSelection(entity: FocalEntity, event: Event): void {
    event.stopPropagation();

    if (this.selectedEntity?.peId === entity.peId) {
      // Uncheck: deselect and clear right panel
      this.selectedEntity = null;
    } else {
      // Check: select this entity for right panel
      this.selectedEntity = { ...entity };
    }

    this.selectedEntityChange.emit(this.selectedEntity);
  }

  // ── Row click (optional row-level selection without checkbox) ─────────────
  selectEntity(entity: FocalEntity): void {
    if (this.selectedEntity?.peId === entity.peId) {
      this.selectedEntity = null;
    } else {
      this.selectedEntity = { ...entity };
    }
    this.selectedEntityChange.emit(this.selectedEntity);
  }

  // ── TrackBy ──────────────────────────────────────────────────────────────
  trackByPeId(index: number, item: FocalEntity): string {
    return item.peId;
  }

  // ── Select all (for completeness — wires to header checkbox if added) ─────
  isAllSelected(): boolean {
    if (!this.bucketedEntities?.length) return false;
    return this.bucketedEntities.every(e => e.peId === this.selectedEntity?.peId);
  }

  // ── Flag quality ──────────────────────────────────────────────────────────
  updateFlagQualityIssue(event: Event): void {
    if (this.focalEntityData) {
      this.focalEntityData.flagQualityIssue =
        (event.target as HTMLInputElement).checked;
      this.flagQualityIssueChange.emit(this.focalEntityData.flagQualityIssue);
    }
  }

  // ── Mark as parent checkbox inside table row ──────────────────────────────
  toggleParent(entity: FocalEntity, event: Event): void {
    event.stopPropagation();
    entity.isParent = (event.target as HTMLInputElement).checked;
    if (entity.isParent) {
      this.onMarkAsParent(entity, event);
    }
  }

  // ── Action menu ───────────────────────────────────────────────────────────
  onActionMenu(event: Event, entity: FocalEntity): void {
    event.stopPropagation();
    if (this.showActionMenu && this.activeEntity?.peId === entity.peId) {
      this.closeMenu();
      return;
    }
    const button = event.target as HTMLElement;
    const rect = button.getBoundingClientRect();
    this.menuPosition = {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    };
    this.activeEntity = entity;
    this.showActionMenu = true;
  }

  onMarkAsParent(entity: FocalEntity, event: Event): void {
    event.stopPropagation();
    this.markAsParentChange.emit(entity);
    this.closeMenu();
  }

  closeMenu(): void {
    this.showActionMenu = false;
    this.activeEntity = null;
    this.menuPosition = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeMenu();
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  onReset(): void {
    this.selectedEntity = null;
    this.selectedEntityChange.emit(null);
  }

  // ── Add Entity modal ──────────────────────────────────────────────────────
  onAddEntity(): void {
    this.showAddEntityModal = true;
  }

  onMarkDQI(): void {
    this.showDQIModal = true;
  }

  closeModal(): void {
    this.showAddEntityModal = false;
    this.showDQIModal = false;
  }

  saveEntity(): void {
    if (this.focalEntityData?.focalEntities) {
      const newEntity: FocalEntity = {
        name: this.newEntity.name,
        peId: this.newEntity.peId,
        identityType: this.newEntity.identityType,
        identity: this.newEntity.identity,
        isSelected: false,
        totalTransactionCount: 0,
        totalAmount: '0',
        addresses: [],
        country: '',
        isParent: this.newEntity.isParent || false,
        transactions: []
      };
      this.focalEntityData.focalEntities.push(newEntity);
    }
    this.resetNewEntity();
    this.closeModal();
  }

  resetNewEntity(): void {
    this.newEntity = {
      name: '',
      peId: '',
      identityType: 'LEI',
      identity: '',
      isParent: false
    };
  }

  submitDQI(): void {
    if (this.focalEntityData) {
      this.focalEntityData.flagQualityIssue = true;
      this.flagQualityIssueChange.emit(true);
    }
    this.dqiReason = '';
    this.closeModal();
  }

  resetDQI(): void {
    this.dqiReason = '';
  }

  // ── File drag and drop ────────────────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFileName = file.name;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFileName = file.name;
    }
  }

  onSave(): void {
    // Save logic to be implemented
  }
}

