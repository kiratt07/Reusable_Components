// entity-disambiguation-focal-entity.component.ts
import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FocalEntityGroup, FocalEntity } from '../../risk-mitigation/models/alert-focal-entity.model'; // update path as needed

@Component({
  selector: 'app-entity-disambiguation-focal-entity',
  templateUrl: './entity-disambiguation-focal-entity.component.html',
  styleUrls: ['./entity-disambiguation-focal-entity.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EntityDisambiguationFocalEntityComponent implements OnInit {

  @Input() focalEntityData!: FocalEntityGroup;

  @Output() selectedEntityChange = new EventEmitter<FocalEntity | null>();
  @Output() flagQualityIssueChange = new EventEmitter<boolean>();
  @Output() markAsParentChange = new EventEmitter<FocalEntity>();

  identityTypes = ['LEI', 'FENERGO', 'CRDS'];
  selectedEntity: FocalEntity | null = null;

  // Action menu state
  showActionMenu = false;
  activeEntity: FocalEntity | null = null;
  menuPosition: { top: number; left: number } | null = null;
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

  ngOnInit() {
    // No entity pre-selected — start with empty state (Disambiguation! screen)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Returns only the entities the user has checked on the left panel */
  getSelectedEntities(): FocalEntity[] {
    return this.focalEntityData?.focalEntities?.filter(e => e.isSelected) ?? [];
  }

  /** Returns true once at least one entity has been marked as parent */
  hasParentSelected(): boolean {
    return this.focalEntityData?.focalEntities?.some(e => e.isParent) ?? false;
  }

  // ─── Row selection ────────────────────────────────────────────────────────

  selectEntity(entity: FocalEntity) {
    if (this.focalEntityData?.focalEntities) {
      this.focalEntityData.focalEntities.forEach(e => e.isSelected = false);
      entity.isSelected = true;
      this.selectedEntity = entity;
      this.emitSelectedEntity();
    }
  }

  toggleSelection(entity: FocalEntity, event: Event) {
    event.stopPropagation();
    entity.isSelected = !entity.isSelected;
    this.selectedEntity = entity.isSelected ? entity : null;
    this.emitSelectedEntity();
  }

  onToggleParent(entity: FocalEntity, event: Event) {
    event.stopPropagation();
    // Only one entity can be parent at a time
    if (this.focalEntityData?.focalEntities) {
      this.focalEntityData.focalEntities.forEach(e => e.isParent = false);
    }
    entity.isParent = (event.target as HTMLInputElement).checked;
    if (entity.isParent) {
      this.markAsParentChange.emit(entity);
    }
  }

  // ─── Select all ───────────────────────────────────────────────────────────

  isAllSelected(): boolean {
    return this.focalEntityData?.focalEntities?.every(e => e.isSelected) ?? false;
  }

  toggleAllSelection(event: Event) {
    if (this.focalEntityData?.focalEntities) {
      const shouldSelect = !this.isAllSelected();
      this.focalEntityData.focalEntities.forEach(e => e.isSelected = shouldSelect);
      this.selectedEntity = shouldSelect
        ? this.focalEntityData.focalEntities[0]
        : null;
      this.emitSelectedEntity();
    }
  }

  // ─── Flag quality ─────────────────────────────────────────────────────────

  updateFlagQualityIssue(event: Event) {
    if (this.focalEntityData) {
      this.focalEntityData.flagQualityIssue =
        (event.target as HTMLInputElement).checked;
      this.flagQualityIssueChange.emit(this.focalEntityData.flagQualityIssue);
    }
  }

  // ─── Action menu ──────────────────────────────────────────────────────────

  onActionMenu(event: Event, entity: FocalEntity) {
    event.stopPropagation();
    if (this.showActionMenu && this.activeEntity?.peId === entity.peId) {
      this.closeMenu();
      return;
    }
    const button = event.target as HTMLElement;
    const rect = button.getBoundingClientRect();
    this.menuPosition = { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX };
    this.activeEntity = entity;
    this.showActionMenu = true;
  }

  onMarkAsParent(entity: FocalEntity, event: Event) {
    event.stopPropagation();
    if (this.focalEntityData?.focalEntities) {
      this.focalEntityData.focalEntities.forEach(e => e.isParent = false);
    }
    entity.isParent = true;
    this.markAsParentChange.emit(entity);
    this.closeMenu();
  }

  closeMenu() {
    this.showActionMenu = false;
    this.activeEntity = null;
    this.menuPosition = null;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeMenu();
  }

  // ─── Emit ─────────────────────────────────────────────────────────────────

  private emitSelectedEntity() {
    this.selectedEntityChange.emit(this.selectedEntity);
  }

  // ─── Toolbar actions ──────────────────────────────────────────────────────

  onReset() {
    if (this.focalEntityData?.focalEntities) {
      this.focalEntityData.focalEntities.forEach(e => {
        e.isSelected = false;
        e.isParent = false;
      });
      this.selectedEntity = null;
      this.emitSelectedEntity();
    }
  }

  onAddEntity() {
    this.showAddEntityModal = true;
  }

  onMarkDQI() {
    this.showDQIModal = true;
  }

  closeModal() {
    this.showAddEntityModal = false;
    this.showDQIModal = false;
  }

  saveEntity() {
    if (this.focalEntityData?.focalEntities) {
      const newEntity: FocalEntity = {
        name: this.newEntity.name,
        peId: this.newEntity.peId,
        identityType: this.newEntity.identityType,
        identity: this.newEntity.identity,
        isSelected: false,
        isParent: this.newEntity.isParent ?? false
      };
      this.focalEntityData.focalEntities.push(newEntity);
    }
    this.resetNewEntity();
    this.closeModal();
  }

  resetNewEntity() {
    this.newEntity = {
      name: '',
      peId: '',
      identityType: 'LEI',
      identity: '',
      isParent: false
    };
  }

  submitDQI() {
    if (this.focalEntityData) {
      this.focalEntityData.flagQualityIssue = true;
      this.flagQualityIssueChange.emit(true);
    }
    this.dqiReason = '';
    this.closeModal();
  }

  resetDQI() {
    this.dqiReason = '';
  }

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

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
        }
    
