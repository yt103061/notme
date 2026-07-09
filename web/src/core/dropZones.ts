// ドラッグ中のカードを受け止めるスロットの登録簿+簡易イベントバス。
// BoardSlot はここへ自分の矩形と受け入れ条件を登録し、ドラッグの進行を購読して「受け入れ姿勢」を表示する。

export interface DropZone {
  id: string;
  rect: DOMRect;
  accepts: (uid: string) => boolean;
}

const zones = new Map<string, DropZone>();

export function registerDropZone(zone: DropZone) {
  zones.set(zone.id, zone);
}

export function unregisterDropZone(id: string) {
  zones.delete(id);
}

export function findDropZoneAt(x: number, y: number, uid: string): string | null {
  for (const zone of zones.values()) {
    const r = zone.rect;
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && zone.accepts(uid)) {
      return zone.id;
    }
  }
  return null;
}

export function listAcceptingZones(uid: string): string[] {
  return Array.from(zones.values())
    .filter((z) => z.accepts(uid))
    .map((z) => z.id);
}

type DragListener = (state: DragBusState) => void;

export interface DragBusState {
  active: boolean;
  uid: string | null;
  x: number;
  y: number;
  overZoneId: string | null;
  validZoneIds: string[];
}

let state: DragBusState = { active: false, uid: null, x: 0, y: 0, overZoneId: null, validZoneIds: [] };
const listeners = new Set<DragListener>();

export function subscribeDragBus(fn: DragListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function publishDragStart(uid: string, x: number, y: number) {
  state = { active: true, uid, x, y, overZoneId: findDropZoneAt(x, y, uid), validZoneIds: listAcceptingZones(uid) };
  listeners.forEach((fn) => fn(state));
}

export function publishDragMove(x: number, y: number) {
  if (!state.active || !state.uid) return;
  state = { ...state, x, y, overZoneId: findDropZoneAt(x, y, state.uid) };
  listeners.forEach((fn) => fn(state));
}

export function publishDragEnd() {
  state = { active: false, uid: null, x: 0, y: 0, overZoneId: null, validZoneIds: [] };
  listeners.forEach((fn) => fn(state));
}

export function getDragBusState(): DragBusState {
  return state;
}
