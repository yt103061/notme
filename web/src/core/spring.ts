// 手書きスプリング。durationベースのイージングは使わず、速度を持った減衰運動のみで表現する。
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export const SPRINGS = {
  follow: { stiffness: 400, damping: 40, mass: 1 } as SpringConfig, // ポインタへの追従
  settle: { stiffness: 180, damping: 22, mass: 1 } as SpringConfig, // 手を離した後の復帰
  tilt: { stiffness: 250, damping: 18, mass: 1 } as SpringConfig, // チルトの戻り
  flip: { stiffness: 200, damping: 26, mass: 1 } as SpringConfig, // フリップ
  deal: { stiffness: 150, damping: 20, mass: 1 } as SpringConfig, // 配る/並ぶ
};

const EPSILON = 0.01;

export class Spring {
  value: number;
  velocity = 0;
  target: number;
  config: SpringConfig;

  constructor(initial: number, config: SpringConfig) {
    this.value = initial;
    this.target = initial;
    this.config = config;
  }

  set(target: number) {
    this.target = target;
  }

  jump(value: number) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  addVelocity(v: number) {
    this.velocity += v;
  }

  step(dt: number): number {
    const { stiffness, damping, mass } = this.config;
    const force = -stiffness * (this.value - this.target);
    const dampingForce = -damping * this.velocity;
    const acceleration = (force + dampingForce) / mass;
    this.velocity += acceleration * dt;
    this.value += this.velocity * dt;
    return this.value;
  }

  get settled(): boolean {
    return Math.abs(this.velocity) < EPSILON && Math.abs(this.value - this.target) < EPSILON;
  }
}
