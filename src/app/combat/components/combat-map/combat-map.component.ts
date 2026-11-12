import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import Konva from 'konva';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { faCompress, faMagnifyingGlassMinus, faMagnifyingGlassPlus } from '@fortawesome/free-solid-svg-icons';

import type { Combatant } from '../../models/combatant';
import type { AuthUser } from '../../../auth/models/auth-user';
import { AuthService } from '../../../core/services/auth.service';
import { CombatMap, CombatMapService, MAP_IMAGE_TYPES } from '../../services/combat-map.service';
import {
  BLANK_MAP,
  DEFAULT_GRID,
  GRID_SIZE_LIMITS,
  type Grid,
  type Point,
  type Size,
  clampToMap,
  dropPosition,
  fitToView,
  gridLines,
  initials,
  stagingPosition,
  zoomAt,
} from '../../map/geometry';

type TokenKind = 'pc' | 'npc' | 'enemy';

interface TokenNode {
  group: Konva.Group;
  /** Everything that changes how the token looks; position aside. */
  look: string;
}

/**
 * The battle map: the session's map image (or a blank area), a square grid,
 * and a token per combatant. Everyone sees it live and can pan and zoom
 * their own view; only the GM drags tokens and sets up the map.
 *
 * Konva runs outside Angular's zone: pointer events on the canvas would
 * otherwise trigger change detection for the whole page dozens of times a
 * second while dragging.
 */
@Component({
  selector: 'app-combat-map',
  templateUrl: './combat-map.component.html',
  styleUrls: ['./combat-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CombatMapComponent implements OnInit, OnChanges, OnDestroy {
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private maps = inject(CombatMapService);
  private zone = inject(NgZone);

  @Input() combatants: Combatant[] | null = [];
  @ViewChild('stageHost', { static: true }) host: ElementRef<HTMLDivElement>;

  readonly acceptedTypes = MAP_IMAGE_TYPES.join(',');
  readonly gridLimits = GRID_SIZE_LIMITS;
  icons = { fit: faCompress, zoomIn: faMagnifyingGlassPlus, zoomOut: faMagnifyingGlassMinus };
  map: CombatMap | null = null;
  /** Grid as shown in the GM's inputs; ahead of the database while typing. */
  gridDraft: Grid = { ...DEFAULT_GRID };
  busy = false;
  message = '';
  user: AuthUser | null = null;

  private positions = new Map<string, Point>();
  private stage: Konva.Stage | null = null;
  private mapLayer: Konva.Layer;
  private tokenLayer: Konva.Layer;
  private mapLook = '';
  private tokens = new Map<string, TokenNode>();
  private dragging = new Set<string>();
  private images = new Map<string, HTMLImageElement | null>();
  private fittedSize = '';
  private gridEdits = new Subject<Partial<Grid>>();
  /** Bumped per grid edit; the inputs lead the database until a save catches up. */
  private gridVersion = 0;
  private savedGridVersion = 0;
  private resizeObserver: ResizeObserver | null = null;
  private subscription = new Subscription();


  get isGM(): boolean {
    return !!this.user?.isGM;
  }

  private get gridPending(): boolean {
    return this.gridVersion !== this.savedGridVersion;
  }

  private get size(): Size {
    return this.map?.size ?? BLANK_MAP;
  }

  private get grid(): Grid {
    return this.gridPending ? this.gridDraft : (this.map?.grid ?? DEFAULT_GRID);
  }


  // The stage host is a static view child, so it already exists here; setting
  // up in ngOnInit keeps the first check of the template consistent.
  ngOnInit() {
    this.subscription.add(this.auth.user$.subscribe(user => {
      this.user = user;
      this.render();
      this.cdr.markForCheck();
    }));

    this.zone.runOutsideAngular(() => this.createStage());

    this.subscription.add(
      combineLatest([this.maps.getMap(), this.maps.getTokenPositions()]).subscribe(([map, positions]) => {
        this.map = map;
        this.positions = new Map(positions);
        if (!this.gridPending) {
          this.gridDraft = { ...(map?.grid ?? DEFAULT_GRID) };
        }
        this.render();
        this.cdr.markForCheck();
      })
    );

    // Typing a cell size previews at once and saves once the typing stops.
    this.subscription.add(
      this.gridEdits.pipe(debounceTime(400)).subscribe(async () => {
        const version = this.gridVersion;
        const saved = { ...this.gridDraft };
        if (await this.maps.updateGrid(saved)) {
          // Show what was saved until the realtime echo brings the same.
          if (this.map) {
            this.map = { ...this.map, grid: saved };
          }
        } else {
          this.message = 'Das Raster konnte nicht gespeichert werden.';
        }
        // Newer edits keep the draft in charge until their own save.
        if (version === this.gridVersion) {
          this.savedGridVersion = version;
        }
        this.cdr.markForCheck();
      })
    );
  }


  ngOnChanges() {
    this.render();
  }


  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.resizeObserver?.disconnect();
    this.stage?.destroy();
  }


  // ── GM controls ───────────────────────────────────────────────────────

  editGrid(changes: Partial<Grid>) {
    const next = { ...this.gridDraft, ...changes };
    if (!Number.isFinite(next.size) || next.size < GRID_SIZE_LIMITS.min || next.size > GRID_SIZE_LIMITS.max
      || !Number.isFinite(next.offsetX) || !Number.isFinite(next.offsetY)) {
      return;
    }
    this.gridDraft = next;
    this.gridVersion += 1;
    this.render();
    this.gridEdits.next(changes);
  }


  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!MAP_IMAGE_TYPES.includes(file.type)) {
      this.message = 'Bitte ein Bild als PNG, JPEG, GIF oder WebP wählen.';
      return;
    }
    await this.whileBusy(() => this.maps.uploadImage(file), 'Die Karte konnte nicht hochgeladen werden.');
  }


  async removeImage() {
    if (!window.confirm('Kartenbild entfernen? Die Figuren bleiben, wo sie sind.')) {
      return;
    }
    await this.whileBusy(() => this.maps.removeImage(), 'Das Kartenbild konnte nicht entfernt werden.');
  }


  // ── View ─────────────────────────────────────────────────────────────

  fit() {
    if (!this.stage) {
      return;
    }
    const view = fitToView(this.size, { width: this.stage.width(), height: this.stage.height() });
    this.applyView(view);
  }


  zoom(factor: number) {
    if (!this.stage) {
      return;
    }
    const centre = { x: this.stage.width() / 2, y: this.stage.height() / 2 };
    this.applyView(zoomAt(this.currentView(), centre, factor));
  }


  private currentView() {
    return { scale: this.stage!.scaleX(), x: this.stage!.x(), y: this.stage!.y() };
  }


  private applyView(view: { scale: number; x: number; y: number }) {
    this.stage!.scale({ x: view.scale, y: view.scale });
    this.stage!.position({ x: view.x, y: view.y });
    this.stage!.batchDraw();
  }


  private createStage() {
    const element = this.host.nativeElement;
    Konva.hitOnDragEnabled = true;
    this.stage = new Konva.Stage({
      container: element,
      width: element.clientWidth || 300,
      height: element.clientHeight || 300,
      draggable: true,
    });
    this.mapLayer = new Konva.Layer({ listening: false });
    this.tokenLayer = new Konva.Layer();
    this.stage.add(this.mapLayer, this.tokenLayer);

    this.stage.on('wheel', event => {
      event.evt.preventDefault();
      const pointer = this.stage!.getPointerPosition();
      if (pointer) {
        this.applyView(zoomAt(this.currentView(), pointer, event.evt.deltaY < 0 ? 1.1 : 1 / 1.1));
      }
    });
    this.setUpPinchZoom();

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.stage) return;
      this.stage.size({ width: element.clientWidth, height: element.clientHeight });
      this.fit();
    });
    this.resizeObserver.observe(element);
    this.render();
  }


  /** Two fingers zoom around their midpoint; the stage stops panning meanwhile. */
  private setUpPinchZoom() {
    let lastDistance = 0;
    let lastCentre: Point | null = null;
    this.stage!.on('touchmove', event => {
      const touches = event.evt.touches;
      if (touches.length !== 2) {
        return;
      }
      event.evt.preventDefault();
      if (this.stage!.isDragging()) {
        this.stage!.stopDrag();
      }
      const rect = this.host.nativeElement.getBoundingClientRect();
      const a = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
      const b = { x: touches[1].clientX - rect.left, y: touches[1].clientY - rect.top };
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const centre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (lastDistance > 0 && lastCentre) {
        const view = zoomAt(this.currentView(), centre, distance / lastDistance);
        view.x += centre.x - lastCentre.x;
        view.y += centre.y - lastCentre.y;
        this.applyView(view);
      }
      lastDistance = distance;
      lastCentre = centre;
    });
    this.stage!.on('touchend touchcancel', () => {
      lastDistance = 0;
      lastCentre = null;
    });
  }


  // ── Drawing ──────────────────────────────────────────────────────────

  private render() {
    if (!this.stage) {
      return;
    }
    const size = this.size;
    const sizeKey = `${size.width}x${size.height}`;
    if (this.fittedSize !== sizeKey) {
      this.fittedSize = sizeKey;
      this.fit();
    }
    this.drawMap();
    this.drawTokens();
  }


  private drawMap() {
    const grid = this.grid;
    const size = this.size;
    const url = this.map?.imageUrl ?? null;
    const image = url ? this.image(url) : null;
    const look = JSON.stringify([size, grid, url, !!image]);
    if (look === this.mapLook) {
      return;
    }
    this.mapLook = look;
    this.mapLayer.destroyChildren();

    const colors = themeColors();
    this.mapLayer.add(new Konva.Rect({
      width: size.width, height: size.height,
      fill: colors.background,
      stroke: colors.primary, strokeWidth: 1, strokeScaleEnabled: false,
    }));
    if (image) {
      this.mapLayer.add(new Konva.Image({ image, width: size.width, height: size.height }));
    }
    if (grid.enabled) {
      const { xs, ys } = gridLines(grid, size);
      const line = (points: number[]) => new Konva.Line({
        points, stroke: colors.grid, strokeWidth: 1, strokeScaleEnabled: false, perfectDrawEnabled: false,
      });
      xs.forEach(x => this.mapLayer.add(line([x, 0, x, size.height])));
      ys.forEach(y => this.mapLayer.add(line([0, y, size.width, y])));
    }
    this.mapLayer.batchDraw();
  }


  private drawTokens() {
    const grid = this.grid;
    const size = this.size;
    const fighters = this.combatants ?? [];
    const seen = new Set<string>();
    let staged = 0;

    for (const combatant of fighters) {
      seen.add(combatant.id);
      const placed = this.positions.get(combatant.id);
      const position = clampToMap(placed ?? stagingPosition(staged++, grid, size), size);
      const name = this.displayName(combatant);
      const portrait = combatant.person?.image ? this.image(combatant.person.image) : null;
      const kind: TokenKind = !combatant.person ? 'enemy' : combatant.person.pc ? 'pc' : 'npc';
      const look = JSON.stringify([name, kind, !!portrait, combatant.active, grid.size, this.isGM]);

      let node = this.tokens.get(combatant.id);
      if (node && node.look !== look) {
        node.group.destroy();
        node = undefined;
      }
      if (!node) {
        node = { group: this.createToken(combatant.id, name, kind, portrait, combatant.active, grid.size), look };
        node.group.position(position);
        this.tokenLayer.add(node.group);
        this.tokens.set(combatant.id, node);
      } else if (!this.dragging.has(combatant.id)) {
        const { x, y } = node.group.position();
        if (x !== position.x || y !== position.y) {
          node.group.to({ x: position.x, y: position.y, duration: 0.2 });
        }
      }
    }

    for (const [id, node] of this.tokens) {
      if (!seen.has(id)) {
        node.group.destroy();
        this.tokens.delete(id);
      }
    }
    this.tokenLayer.batchDraw();
  }


  private createToken(id: string, name: string, kind: TokenKind, portrait: HTMLImageElement | null, active: boolean, cell: number): Konva.Group {
    const colors = themeColors();
    const radius = cell * 0.42;
    const ring = { pc: colors.primary, npc: colors.gray, enemy: colors.enemy }[kind];
    const group = new Konva.Group({ id, draggable: this.isGM, opacity: active ? 1 : 0.45, name: 'token' });

    group.add(new Konva.Circle({ radius, fill: colors.background }));
    if (portrait) {
      const clip = new Konva.Group({
        clipFunc: context => { context.arc(0, 0, radius, 0, Math.PI * 2, false); },
      });
      const scale = Math.max((radius * 2) / portrait.width, (radius * 2) / portrait.height);
      clip.add(new Konva.Image({
        image: portrait,
        width: portrait.width * scale,
        height: portrait.height * scale,
        x: -(portrait.width * scale) / 2,
        y: -(portrait.height * scale) / 2,
      }));
      group.add(clip);
    } else {
      group.add(new Konva.Text({
        text: initials(name),
        fontSize: radius * 0.8,
        fontStyle: 'bold',
        fill: ring,
        width: radius * 2,
        height: radius * 2,
        x: -radius,
        y: -radius,
        align: 'center',
        verticalAlign: 'middle',
      }));
    }
    group.add(new Konva.Circle({ radius, stroke: ring, strokeWidth: Math.max(2, radius * 0.12) }));
    group.add(new Konva.Text({
      text: name,
      fontSize: Math.max(10, radius * 0.38),
      fill: '#ffffff',
      shadowColor: '#000000',
      shadowBlur: 3,
      shadowOpacity: 1,
      width: radius * 4,
      x: -radius * 2,
      y: radius + 3,
      align: 'center',
      wrap: 'none',
      ellipsis: true,
    }));

    if (this.isGM) {
      group.on('mouseenter', () => { this.stage!.container().style.cursor = 'grab'; });
      group.on('mouseleave', () => { this.stage!.container().style.cursor = ''; });
      group.on('dragstart', () => {
        this.dragging.add(id);
        group.moveToTop();
      });
      group.on('dragend', async () => {
        const position = dropPosition(group.position(), this.grid, this.size);
        group.position(position);
        this.tokenLayer.batchDraw();
        // Optimistic: the realtime echo will agree.
        this.positions.set(id, position);
        this.dragging.delete(id);
        const ok = await this.maps.moveToken(id, position);
        if (!ok) {
          this.zone.run(() => this.message = 'Die Figur konnte nicht bewegt werden.');
        }
      });
    }
    return group;
  }


  /** Same rule as the combatant list: first name only, unless allowed more. */
  private displayName(combatant: Combatant): string {
    const person = combatant.person;
    if (!person) {
      return combatant.name ?? '';
    }
    const user = this.user as (AuthUser & Record<string, unknown>) | null;
    const full = !!user && (user.isGM || !!user['viewName'] || user.id === person.owner);
    return full ? person.name : person.name.split(' ')[0];
  }


  /** Loads an image once; redraws when it arrives. null until then. */
  private image(url: string): HTMLImageElement | null {
    if (!this.images.has(url)) {
      this.images.set(url, null);
      const element = new Image();
      element.onload = () => {
        this.images.set(url, element);
        this.mapLook = '';
        this.render();
      };
      element.src = url;
    }
    return this.images.get(url) ?? null;
  }


  private async whileBusy(action: () => Promise<boolean>, failure: string) {
    this.busy = true;
    this.message = '';
    try {
      if (!await action()) {
        this.message = failure;
      }
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }
}


function themeColors() {
  const style = getComputedStyle(document.body);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const primaryRgb = read('--color-primary-rgb', '239, 220, 89');
  return {
    primary: read('--color-primary', '#efdc59'),
    gray: read('--color-gray', '#aaaaaa'),
    enemy: read('--color-high', '#dd0000'),
    background: read('--color-dark', '#000000'),
    grid: `rgba(${primaryRgb}, 0.35)`,
  };
}
