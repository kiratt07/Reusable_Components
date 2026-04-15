//alert

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ── Services ──────────────────────────────────────────────────────────────────
import { EntityDisambiguationService } from '../services/entity-disambiguation.service';
import { NotificationService } from '../services/notification.service';
import {
  SamplingService,
  SamplingDisplayItem,
  PartyDetailResult,
  PartyDetailsRequestTransaction,
  SamplingTransaction
} from '../services/sampling.service';

// ── Models ────────────────────────────────────────────────────────────────────
import { FocalEntityGroup, FocalEntity } from '../risk-mitigation/models/alert-focal-entity.model';
import { CounterPartyGroup, CounterParty } from '../risk-mitigation/models/counter-party.model';

// ── Child components ──────────────────────────────────────────────────────────
import { EntityDisambiguationFocalEntityComponent } from './entity-disambiguation-focal-entity/entity-disambiguation-focal-entity.component';
import { EntityDisambiguationCounterPartyComponent } from './entity-disambiguation-counter-party/entity-disambiguation-counter-party.component';

@Component({
  selector: 'app-alert-entity-disambiguation',
  templateUrl: './alert-entity-disambiguation.component.html',
  styleUrls: ['./alert-entity-disambiguation.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EntityDisambiguationFocalEntityComponent,
    EntityDisambiguationCounterPartyComponent
  ]
})
export class AlertEntityDisambiguationComponent implements OnInit, OnDestroy {

  // ── Tab state ─────────────────────────────────────────────────────────────
  activeTab: 'focal' | 'counter' = 'focal';

  selectedDataKey: string = '';
  selectedParentKey: string = '';
  parentOptions: { value: string; label: string }[] = [];
  selectedCounterDropdownId: string = '';

  counterParentOptions: { value: string; label: string }[] = [];
  allCounterParties: { [key: string]: CounterParty } = {};
  focalEntityData: { [key: string]: FocalEntityGroup } = {};
  counterPartyData: { [key: string]: CounterPartyGroup } = {};

  // ── Loading / error state ─────────────────────────────────────────────────
  isSamplingLoading: boolean = false;
  samplingError: string | null = null;

  // ── Selection state ───────────────────────────────────────────────────────
  selectedFocalEntities: FocalEntity[] = [];
  selectedCounterParties: CounterParty[] = [];

  // ── Party details state ───────────────────────────────────────────────────
  focalPartyDetails: PartyDetailResult[] = [];
  counterPartyDetails: PartyDetailResult[] = [];
  isPartyDetailsLoading: boolean = false;
  partyDetailsError: string | null = null;

  // ── Right-panel visibility guard (set by middle-panel checkbox) ───────────
  // dev_new contribution: drives *ngIf on the right panel
  selectedEntity: any = null;

  showActionMenu: { [key: string]: boolean } = {};
  currentActionEntity: any = null;
  currentActionType: 'focal' | 'counter' | null = null;
  actionMenuPosition: { top: number; left: number } | null = null;
  currentParent: { type: 'focal' | 'counter'; id: string; name: string } | null = null;

  private originalValues: { [key: string]: any } = {};
  private changedEntities: any[] = [];
  private currentAlertId: string = '';
  private alertIdNumeric: number = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private entityDisambiguationService: EntityDisambiguationService,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private samplingService: SamplingService
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const routeAlertId =
      this.route.snapshot.params['alertId'] ||
      this.route.snapshot.params['id'] ||
      '';

    this.currentAlertId = String(routeAlertId);
    this.alertIdNumeric = Number(routeAlertId) || 0;

    this.samplingService.samplingLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => (this.isSamplingLoading = loading));

    this.samplingService.samplingError$
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => (this.samplingError = err));

    this.loadSamplingData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.samplingService.clearSamplingData();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadSamplingData(): void {
    this.samplingService.fetchSamplingData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (samplingItems: SamplingDisplayItem[]) => {
          this.mapToEntityModels(samplingItems);

          const keys = Object.keys(this.focalEntityData);
          if (keys.length > 0) {
            this.selectedDataKey = keys[0];
            this.selectedParentKey = keys[0];
          }

          // dev_save: auto-select first focal entity and fetch its details
          this.loadDefaultFocalEntity();
          this.storeOriginalValues();
        },
        error: (err: Error) => {
          console.warn(
            '[EntityDisambiguation] Sampling API failed, falling back to empty data.',
            err.message
          );
          this.focalEntityData = {};
          this.counterPartyData = {};
          this.buildParentOptions();
          this.buildCounterParentOptions();
          this.loadDefaultFocalEntity();
          this.storeOriginalValues();
        }
      });
  }

  private mapToEntityModels(samplingItems: SamplingDisplayItem[]): void {
    const focalMap: { [key: string]: FocalEntityGroup } = {};
    const counterMap: { [key: string]: CounterPartyGroup } = {};
    const groupedByKey: { [key: string]: SamplingDisplayItem[] } = {};

    samplingItems.forEach((item: SamplingDisplayItem) => {
      const key = item.focalPartyKey;
      if (!groupedByKey[key]) groupedByKey[key] = [];
      groupedByKey[key].push(item);
    });

    Object.entries(groupedByKey).forEach(([key, items]) => {
      const pinnedName = items[0].focalPartyName;

      const seenFocalNames = new Set<string>();
      const focalEntities: FocalEntity[] = [];

      items.forEach((item: SamplingDisplayItem) => {
        if (!seenFocalNames.has(item.focalPartyName)) {
          seenFocalNames.add(item.focalPartyName);
          focalEntities.push({
            name: item.focalPartyName,
            peId: item.focalPartyKey,
            identityType: '',
            identity: '',
            isSelected: false,
            totalTransactionCount: item.transactionCount,
            totalAmount: item.totalAmount.toString(),
            addresses: [],
            country: '',
            isParent: false,
            transactions: [...item.transactions]
          });
        } else {
          const existing = focalEntities.find(e => e.name === item.focalPartyName)!;
          existing.totalTransactionCount = (existing.totalTransactionCount ?? 0) + item.transactionCount;
          existing.totalAmount = (parseFloat(existing.totalAmount) + item.totalAmount).toString();
          existing.transactions = [...(existing.transactions ?? []), ...item.transactions];
        }
      });

      focalMap[key] = {
        parentName: pinnedName,
        parentPeId: key,
        flagQualityIssue: false,
        focalEntities,
        selectedFocalEntity: null
      };

      counterMap[key] = {
        parentName: pinnedName,
        parentPeId: key,
        counterParties: [],
        flagQualityIssue: false,
        selectedCounterParty: undefined
      };

      items.forEach((item: SamplingDisplayItem) => {
        const counterPartyExists = counterMap[key].counterParties.some(
          (cp: CounterParty) => cp.peId === item.counterPartyKey
        );

        if (!counterPartyExists) {
          counterMap[key].counterParties.push({
            name: item.counterPartyName,
            peId: item.counterPartyKey,
            identityType: '',
            identity: '',
            isSelected: false,
            totalTransactionCount: item.transactionCount,
            totalAmount: item.totalAmount.toString(),
            addresses: [],
            isParent: false,
            country: '',
            transactions: [...item.transactions]
          });
        } else {
          const existing = counterMap[key].counterParties.find(
            (cp: CounterParty) => cp.peId === item.counterPartyKey
          )!;
          existing.totalTransactionCount = (existing.totalTransactionCount ?? 0) + item.transactionCount;
          existing.totalAmount = (parseFloat(existing.totalAmount) + item.totalAmount).toString();
          existing.transactions = [...(existing.transactions ?? []), ...item.transactions];
        }
      });
    });

    this.focalEntityData = focalMap;
    this.counterPartyData = counterMap;
    this.buildParentOptions();
    this.buildCounterParentOptions();
  }

  private buildParentOptions(): void {
    const focalOptions = Object.keys(this.focalEntityData).map(key => ({
      value: key,
      label: this.focalEntityData[key].parentName
    }));
    const counterOptions = Object.keys(this.counterPartyData).map(key => ({
      value: key,
      label: this.counterPartyData[key].parentName
    }));
    this.parentOptions = [...focalOptions, ...counterOptions];
  }

  private buildCounterParentOptions(): void {
    this.counterParentOptions = [];
    this.allCounterParties = {};
    Object.values(this.counterPartyData).forEach(group => {
      group.counterParties.forEach(cp => {
        if (!this.counterParentOptions.some(opt => opt.value === cp.peId)) {
          this.counterParentOptions.push({ value: cp.peId, label: cp.name });
          this.allCounterParties[cp.peId] = cp;
        }
      });
    });
  }

  // ── Tab switching ─────────────────────────────────────────────────────────

  setActiveTab(tab: 'focal' | 'counter'): void {
    this.activeTab = tab;

    if (tab === 'counter') {
      if (this.counterParentOptions.length > 0 && !this.selectedCounterDropdownId) {
        this.selectedCounterDropdownId = this.counterParentOptions[0].value;
      }
      // dev_new: carry focal details into counter right panel on tab switch
      if (this.focalPartyDetails.length > 0) {
        this.selectedEntity = this.selectedFocalEntities[this.selectedFocalEntities.length - 1] ?? null;
        this.counterPartyDetails = [...this.focalPartyDetails];
      }
    } else {
      // Switching back to focal — restore selectedEntity from focal selection
      this.selectedEntity = this.selectedFocalEntities.length > 0
        ? this.selectedFocalEntities[this.selectedFocalEntities.length - 1]
        : null;
    }
  }

  // ── Selection helpers ─────────────────────────────────────────────────────

  selectFocalEntity(entity: FocalEntity): void {
    entity.isSelected = !entity.isSelected;

    if (entity.isSelected) {
      if (!this.selectedFocalEntities.some(e => e.peId === entity.peId)) {
        this.selectedFocalEntities = [...this.selectedFocalEntities, entity];
      }
    } else {
      this.selectedFocalEntities = this.selectedFocalEntities.filter(e => e.peId !== entity.peId);
      // dev_new: clear right panel if the removed entity was displayed there
      if (this.selectedEntity?.peId === entity.peId) {
        this.selectedEntity = null;
        this.focalPartyDetails = [];
      }
    }
  }

  selectCounterParty(entity: CounterParty): void {
    entity.isSelected = !entity.isSelected;

    if (entity.isSelected) {
      if (!this.selectedCounterParties.some(e => e.peId === entity.peId)) {
        this.selectedCounterParties.push(entity);
      }
    } else {
      this.selectedCounterParties = this.selectedCounterParties.filter(e => e.peId !== entity.peId);
    }
    this.fetchPartyDetails(this.selectedCounterParties, 'counterparty');
  }

  // ── Emitter handlers from child components ────────────────────────────────

  /**
   * dev_new focal child emits FocalEntity[] (from middle-panel checkbox).
   * This drives the right-panel visibility via selectedEntity and fetches details.
   */
  onMiddleSelected(entities: FocalEntity[]): void {
    if (entities && entities.length > 0) {
      this.selectedEntity = entities[entities.length - 1];
      this.fetchPartyDetails(entities, 'focalparty');
    } else {
      this.selectedEntity = null;
      this.focalPartyDetails = [];
    }
  }

  /**
   * onFocalEntityAdded (updated dev_save): the focal child emits this after
   * a successful Add & Save so the parent writes the confirmed entity into
   * focalEntityData[selectedDataKey].focalEntities. Without this, the entity
   * disappears on every tab switch because bootstrap() re-copies from
   * focalEntityData which never had the new row.
   */
  onFocalEntityAdded(entity: FocalEntity): void {
    const group = this.focalEntityData[this.selectedDataKey];
    if (group && !group.focalEntities.some(e => e.peId === entity.peId && e.name === entity.name)) {
      group.focalEntities.push(entity);
    }
  }

  onFocalEntitySelected(entity: FocalEntity | null): void {
    if (entity) {
      entity.isSelected = true;
      if (!this.selectedFocalEntities.some(e => e.peId === entity.peId)) {
        this.selectedFocalEntities.push(entity);
      }
      this.fetchPartyDetails(this.selectedFocalEntities, 'focalparty');
    } else {
      this.selectedFocalEntities = [];
      this.focalPartyDetails = [];
    }
  }

  onCounterPartySelected(entity: CounterParty | null): void {
    if (entity) {
      entity.isSelected = true;
      if (!this.selectedCounterParties.some(e => e.peId === entity.peId)) {
        this.selectedCounterParties.push(entity);
      }
      this.fetchPartyDetails(this.selectedCounterParties, 'counterparty');
    } else {
      this.selectedCounterParties = [];
      this.counterPartyDetails = [];
    }
  }

  // ── Party details fetch ───────────────────────────────────────────────────

  private fetchPartyDetails(
    entities: (FocalEntity | CounterParty)[],
    partyType: 'focalparty' | 'counterparty'
  ): void {
    this.isPartyDetailsLoading = true;
    this.partyDetailsError = null;

    if (partyType === 'focalparty') {
      this.focalPartyDetails = [];
    } else {
      this.counterPartyDetails = [];
    }

    if (!entities || entities.length === 0) {
      this.isPartyDetailsLoading = false;
      return;
    }

    const transactionPayload: PartyDetailsRequestTransaction[] = [];
    const seenTxIds = new Set<string>();

    entities.forEach(entity => {
      const transactions = ((entity as any).transactions as SamplingTransaction[]) ?? [];
      transactions.forEach((t: SamplingTransaction) => {
        if (!seenTxIds.has(t.transactionId)) {
          seenTxIds.add(t.transactionId);
          transactionPayload.push({
            transactionId: t.transactionId,
            // dev_new: typed cast for role; dev_save: string fallback — both preserved
            role: (t.role ? t.role.toLowerCase() : 'originator') as any
          });
        }
      });
    });

    if (transactionPayload.length === 0) {
      this.partyDetailsError = 'No transactions available for the selected entities';
      this.isPartyDetailsLoading = false;
      return;
    }

    this.samplingService.fetchPartyDetailsFor(partyType, transactionPayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (partyType === 'focalparty') {
            this.focalPartyDetails = response.transactions;
          } else {
            this.counterPartyDetails = response.transactions;
          }
          this.isPartyDetailsLoading = false;
        },
        error: (err: Error) => {
          this.partyDetailsError = err.message;
          this.isPartyDetailsLoading = false;
        }
      });
  }

  // ── Dropdown changes ──────────────────────────────────────────────────────

  changeParentEntity(event: Event): void {
    this.selectedDataKey = (event.target as HTMLSelectElement).value;
    this.loadDefaultFocalEntity();
  }

  onCounterDropdownChange(peId: string): void {
    this.selectedCounterDropdownId = peId;
    // dev_new: update selectedCounterParties to match dropdown selection
    const selectedCp = this.allCounterParties[peId];
    if (selectedCp) {
      this.selectedCounterParties = [selectedCp];
      this.fetchPartyDetails(this.selectedCounterParties, 'counterparty');
    }
  }

  onCounterParentKeyChange(event: Event): void {
    this.onCounterParentChange(event);
  }

  onCounterParentChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedParentKey = selectElement.value;
    const counterData = this.counterPartyData[this.selectedParentKey];
    if (counterData?.counterParties?.length > 0) {
      counterData.counterParties.forEach(e => (e.isSelected = false));
      this.selectedCounterParties = [];
      this.counterPartyDetails = [];
    }
  }

  // ── Default focal entity loader (dev_save) ────────────────────────────────

  loadDefaultFocalEntity(): void {
    const focalData = this.focalEntityData[this.selectedDataKey];
    if (focalData?.focalEntities?.length > 0) {
      focalData.focalEntities.forEach(e => (e.isSelected = false));
      const firstEntity = focalData.focalEntities[0];
      firstEntity.isSelected = true;
      this.selectedFocalEntities = [firstEntity];
      this.fetchPartyDetails(this.selectedFocalEntities, 'focalparty');
    }
  }

  // ── Checkbox toggles ──────────────────────────────────────────────────────

  toggleFocalSelection(entity: FocalEntity, event: Event): void {
    event.stopPropagation();
    const isChecked = (event.target as HTMLInputElement).checked;
    entity.isSelected = isChecked;

    if (isChecked) {
      // dev_new: auto-include the pinned parent entity when bucketing a child
      const parentEntity = this.focalEntityData[this.selectedDataKey]?.focalEntities[0];
      const parentAlreadyAdded = this.selectedFocalEntities.some(e => e.name === parentEntity?.name);

      if (parentEntity && !parentAlreadyAdded) {
        this.selectedFocalEntities = [parentEntity, ...this.selectedFocalEntities, entity];
      } else {
        if (!this.selectedFocalEntities.some(e => e.name === entity.name)) {
          this.selectedFocalEntities = [...this.selectedFocalEntities, entity];
        }
      }

      // Keep selectedDataKey in sync with the checked entity
      const matchedKey = Object.keys(this.focalEntityData).find(
        key => key.trim() === entity.peId?.trim()
      );
      this.selectedDataKey = matchedKey || this.selectedDataKey;

    } else {
      this.selectedFocalEntities = this.selectedFocalEntities.filter(e => e.name !== entity.name);

      // If no non-parent entities remain, clear everything
      const parentEntity = this.focalEntityData[this.selectedDataKey]?.focalEntities[0];
      const nonParentSelected = this.selectedFocalEntities.filter(e => e.name !== parentEntity?.name);
      if (nonParentSelected.length === 0) {
        this.selectedFocalEntities = [];
        this.selectedDataKey = Object.keys(this.focalEntityData)[0] || '';
        this.selectedEntity = null;
        this.focalPartyDetails = [];
      }

      if (this.selectedEntity?.name === entity.name) {
        this.selectedEntity = null;
        this.focalPartyDetails = [];
      }
    }

    this.fetchPartyDetails(this.selectedFocalEntities, 'focalparty');
  }

  toggleCounterSelection(entity: CounterParty, event: Event): void {
    event.stopPropagation();
    const isChecked = (event.target as HTMLInputElement).checked;
    entity.isSelected = isChecked;

    if (isChecked) {
      if (!this.selectedCounterParties.some(e => e.peId =
