import { addTicker } from "./ticker";
import { Spring, SPRINGS, type SpringConfig } from "./spring";
import { getMotionMode } from "./settings";

export interface CardRefs {
  body: HTMLElement | null;
  shadow: HTMLElement | null;
  glare: HTMLElement | null;
  holo: HTMLElement | null;
  ring: HTMLElement | null;
}

export interface CardPhysicsSnapshot {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
  elevation: number; // 0=置かれている 〜 1=完全に持ち上げた
  flip: number; // 0 or 180 (中間値も取り得る)
}

/**
 * カード1枚分の物理状態。位置・回転・拡大・高度・表裏をスプリングで保持し、
 * 毎フレーム DOM へ transform を直接書き込む(Reactの再レンダーを経由しない)。
 */
export class CardPhysicsEngine {
  x: Spring;
  y: Spring;
  rx: Spring;
  ry: Spring;
  rz: Spring;
  scale: Spring;
  elevation: Spring;
  flip: Spring;

  private refs: CardRefs = { body: null, shadow: null, glare: null, holo: null, ring: null };
  private stop: (() => void) | null = null;
  private onSettleCbs: Array<() => void> = [];
  private wasSettled = true;

  constructor(initial?: Partial<CardPhysicsSnapshot>) {
    this.x = new Spring(initial?.x ?? 0, SPRINGS.settle);
    this.y = new Spring(initial?.y ?? 0, SPRINGS.settle);
    this.rx = new Spring(initial?.rx ?? 0, SPRINGS.tilt);
    this.ry = new Spring(initial?.ry ?? 0, SPRINGS.tilt);
    this.rz = new Spring(initial?.rz ?? 0, SPRINGS.tilt);
    this.scale = new Spring(initial?.scale ?? 1, SPRINGS.follow);
    this.elevation = new Spring(initial?.elevation ?? 0, SPRINGS.follow);
    this.flip = new Spring(initial?.flip ?? 0, SPRINGS.flip);
  }

  setRefs(refs: Partial<CardRefs>) {
    Object.assign(this.refs, refs);
    this.applyImmediate();
  }

  start() {
    if (this.stop) return;
    this.stop = addTicker((dt) => this.tick(dt));
  }

  destroy() {
    this.stop?.();
    this.stop = null;
  }

  onSettle(cb: () => void) {
    this.onSettleCbs.push(cb);
  }

  get springs(): Spring[] {
    return [this.x, this.y, this.rx, this.ry, this.rz, this.scale, this.elevation, this.flip];
  }

  private get allSettled(): boolean {
    return this.springs.every((s) => s.settled);
  }

  private tick(dt: number) {
    const reduced = getMotionMode() === "reduced";
    const clampedDt = reduced ? Math.min(dt, 1 / 60) : dt;
    for (const s of this.springs) s.step(clampedDt);
    this.applyImmediate();

    const settled = this.allSettled;
    if (settled && !this.wasSettled) {
      this.onSettleCbs.forEach((cb) => cb());
    }
    this.wasSettled = settled;
  }

  private applyImmediate() {
    const snap = this.snapshot();
    writeCardStyles(this.refs, snap);
  }

  snapshot(): CardPhysicsSnapshot {
    return {
      x: this.x.value,
      y: this.y.value,
      rx: this.rx.value,
      ry: this.ry.value,
      rz: this.rz.value,
      scale: this.scale.value,
      elevation: this.elevation.value,
      flip: this.flip.value,
    };
  }

  jumpTo(snap: Partial<CardPhysicsSnapshot>) {
    if (snap.x !== undefined) this.x.jump(snap.x);
    if (snap.y !== undefined) this.y.jump(snap.y);
    if (snap.rx !== undefined) this.rx.jump(snap.rx);
    if (snap.ry !== undefined) this.ry.jump(snap.ry);
    if (snap.rz !== undefined) this.rz.jump(snap.rz);
    if (snap.scale !== undefined) this.scale.jump(snap.scale);
    if (snap.elevation !== undefined) this.elevation.jump(snap.elevation);
    if (snap.flip !== undefined) this.flip.jump(snap.flip);
    this.applyImmediate();
  }

  setTarget(snap: Partial<CardPhysicsSnapshot>, config?: SpringConfig) {
    if (snap.x !== undefined) { this.x.set(snap.x); if (config) this.x.config = config; }
    if (snap.y !== undefined) { this.y.set(snap.y); if (config) this.y.config = config; }
    if (snap.rx !== undefined) { this.rx.set(snap.rx); if (config) this.rx.config = config; }
    if (snap.ry !== undefined) { this.ry.set(snap.ry); if (config) this.ry.config = config; }
    if (snap.rz !== undefined) { this.rz.set(snap.rz); if (config) this.rz.config = config; }
    if (snap.scale !== undefined) { this.scale.set(snap.scale); if (config) this.scale.config = config; }
    if (snap.elevation !== undefined) { this.elevation.set(snap.elevation); if (config) this.elevation.config = config; }
    if (snap.flip !== undefined) { this.flip.set(snap.flip); if (config) this.flip.config = config; }
  }
}

/** elevation(0〜1)から影のオフセット・ぼかし・不透明度を導出する(派生値) */
export function shadowFromElevation(elevation: number) {
  const e = Math.max(0, Math.min(1.4, elevation));
  return {
    offsetY: 2 + e * 22,
    blur: 6 + e * 34,
    opacity: 0.25 + e * 0.1,
    scale: 1 - e * 0.08,
  };
}

/** チルト角(rx, ry)から光沢(グレア)の位置を導出する(角度と逆方向に光が移動する) */
export function glarePositionFromTilt(rx: number, ry: number) {
  const px = 50 - ry * 2.2;
  const py = 50 + rx * 2.2;
  return { px: clampPct(px), py: clampPct(py) };
}

function clampPct(v: number) {
  return Math.max(-20, Math.min(120, v));
}

function writeCardStyles(refs: CardRefs, snap: CardPhysicsSnapshot) {
  const { body, shadow, glare, holo, ring } = refs;
  const flipRy = snap.flip; // 0〜180

  if (body) {
    body.style.transform =
      `translate3d(${snap.x}px, ${snap.y - snap.elevation * 14}px, 0) ` +
      `rotateX(${snap.rx}deg) rotateY(${snap.ry + flipRy}deg) rotateZ(${snap.rz}deg) ` +
      `scale(${snap.scale})`;
  }
  if (shadow) {
    const s = shadowFromElevation(snap.elevation);
    shadow.style.transform = `translate3d(${snap.x}px, ${snap.y + s.offsetY}px, 0) scale(${s.scale})`;
    shadow.style.filter = `blur(${s.blur}px)`;
    shadow.style.opacity = String(s.opacity);
  }
  if (glare) {
    const g = glarePositionFromTilt(snap.rx, snap.ry);
    glare.style.background = `radial-gradient(circle at ${g.px}% ${g.py}%, rgba(255,255,255,0.55), rgba(255,255,255,0) 45%)`;
  }
  if (holo) {
    const hue = (snap.ry * 6 + snap.rx * 4 + 180) % 360;
    holo.style.opacity = String(Math.min(0.55, (Math.abs(snap.rx) + Math.abs(snap.ry)) / 26));
    holo.style.filter = `hue-rotate(${hue}deg)`;
  }
  if (ring) {
    ring.style.opacity = ring.dataset.forceOpacity ?? "";
  }
}
