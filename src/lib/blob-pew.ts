import { BlobSimulation, type Point, type Vector } from "./blob-physics.ts";

export const PELLET_INTERVAL = .1;
export const PELLET_SPEED = 9;
export const PELLET_LIFETIME = 1.4;
export const MAX_PELLETS = 16;

export type Pellet = { position: Vector; velocity: Vector; age: number };

/** Ephemeral input and projectiles, deliberately separate from saved blob state. */
export class PewMode {
  active = false;
  firing = false;
  readonly pellets: Pellet[] = [];
  private home = false;
  private typed = "";
  private aim: Point = [0, 0];
  private untilShot = PELLET_INTERVAL;
  private simulation: BlobSimulation;

  constructor(simulation: BlobSimulation) { this.simulation = simulation; }

  setHome(home: boolean) {
    this.home = home;
    if (!home) this.reset();
  }

  type(key: string) {
    if (!this.home) return;
    if (key === "Escape") { this.reset(); return; }
    if (key.length !== 1) return;
    this.typed = (this.typed + key.toLowerCase()).slice(-3);
    if (this.typed === "pew") this.active = true;
  }

  setAim(aim: Point) { this.aim = aim; }

  start() {
    if (!this.home || !this.active || this.firing) return;
    this.firing = true;
    this.untilShot = PELLET_INTERVAL;
    this.shoot();
  }

  stop() { this.firing = false; }

  private reset() {
    this.active = false;
    this.typed = "";
    this.stop();
    this.pellets.length = 0;
  }

  private shoot() {
    if (this.pellets.length >= MAX_PELLETS) return;
    // Converge from just below the camera onto its crosshair ray's visible surface.
    const target = this.simulation.raycast([0, 0, 4], [this.aim[0], this.aim[1], -4])?.point
      ?? [this.aim[0], this.aim[1], 0];
    const position: Vector = [0, -.28, 3.65];
    const direction = target.map((axis, i) => axis - position[i]);
    const length = Math.hypot(...direction);
    const velocity = direction.map((axis) => axis / length * PELLET_SPEED) as Vector;
    this.pellets.push({ position, velocity, age: 0 });
  }

  private advance(elapsed: number) {
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const pellet = this.pellets[i];
      const next = pellet.position.map((axis, j) => axis + pellet.velocity[j] * elapsed) as Vector;
      pellet.age += elapsed;
      if (pellet.age >= PELLET_LIFETIME || this.simulation.burstAlong(pellet.position, next).length > 0) {
        this.pellets.splice(i, 1);
      } else {
        pellet.position = next;
      }
    }
  }

  step(elapsed: number) {
    let remaining = Math.min(.1, Math.max(0, elapsed));
    while (remaining > 1e-8) {
      const dt = this.firing ? Math.min(remaining, this.untilShot) : remaining;
      this.advance(dt);
      remaining -= dt;
      if (this.firing) {
        this.untilShot -= dt;
        if (this.untilShot < 1e-8) { this.shoot(); this.untilShot = PELLET_INTERVAL; }
      }
    }
  }
}
