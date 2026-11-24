export type Point = readonly [number, number];

export type Particle = {
  position: [number, number, number];
  velocity: [number, number, number];
  radius: number;
  mass: number;
};

/** Independent particles, connected by softened gravity and loose orbital tethers. */
export class BlobSimulation {
  readonly particles: Particle[];
  readonly scale: number;
  readonly pull: number;
  aspect: number;
  time = 0;
  burst = 0;
  private pointer: Point | null = null;
  private pointerStrength = 0;
  private impulses: [number, number, number][];
  private burstEnergy = 0;

  constructor({ count = 7, scale = 1, aspect = 1, pull = .24 } = {}) {
    this.scale = scale;
    this.aspect = aspect;
    this.pull = pull;
    this.particles = Array.from({ length: Math.max(1, Math.min(8, Math.floor(count))) }, (_, i) => {
      const radius = (.36 + .15 * Math.sin(i * 2.1 + 1)) * scale;
      return {
        position: this.orbit(i),
        velocity: [Math.cos(i * 1.9) * .12, -Math.sin(i * 2.7) * .1, Math.cos(i * 1.3) * .06],
        radius,
        mass: Math.pow(radius / (.4 * scale), 3),
      };
    });
    this.impulses = this.particles.map(() => [0, 0, 0]);
  }

  private orbit(i: number): [number, number, number] {
    return [
      Math.sin(this.time * .21 + i * 1.9) * this.aspect * .95 * this.scale,
      Math.cos(this.time * .17 + i * 2.7) * 1.05 * this.scale,
      Math.sin(this.time * .15 + i * 1.3) * .6 * this.scale,
    ];
  }

  setPointer(pointer: Point | null) { this.pointer = pointer; }

  setAspect(aspect: number) {
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    const ratio = aspect / this.aspect;
    for (const particle of this.particles) {
      particle.position[0] *= ratio;
      particle.velocity[0] *= ratio;
    }
    this.aspect = aspect;
  }

  burstAt([x, y]: Point) {
    this.burstEnergy = 1;
    this.particles.forEach((particle, i) => {
      const dx = particle.position[0] - x + Math.sin(i * 12.9) * .22;
      const dy = particle.position[1] - y + Math.cos(i * 7.3) * .22;
      const length = Math.hypot(dx, dy) || 1;
      const impulse = (1.25 + (i * .618 % 1) * .55) * this.scale / Math.sqrt(particle.mass + .5);
      // Queue a kick from the current position; transfer it into velocity over
      // about 150 ms instead of jumping position, velocity, or blend shape.
      this.impulses[i][0] += dx / length * impulse;
      this.impulses[i][1] += dy / length * impulse;
      this.impulses[i][2] += Math.sin(i * 3 + 1) * .35 * this.scale;
    });
  }

  step(elapsed: number) {
    // Small substeps keep attraction stable at both 30 Hz and 144 Hz.
    let remaining = Math.min(.1, Math.max(0, elapsed));
    while (remaining > 1e-8) {
      const dt = Math.min(remaining, 1 / 120);
      remaining -= dt;
      this.time += dt;
      this.burstEnergy *= Math.exp(-dt / 1.65);
      this.burst += (this.burstEnergy - this.burst) * (1 - Math.exp(-dt / .06));
      this.pointerStrength += ((this.pointer ? 1 : 0) - this.pointerStrength) * (1 - Math.exp(-dt * 3));

      const forces = this.particles.map((particle, i) => {
        const anchor = this.orbit(i);
        const force = anchor.map((value, axis) => (value - particle.position[axis]) * .32);

        for (let j = 0; j < this.particles.length; j++) {
          if (i === j) continue;
          const other = this.particles[j];
          const delta = other.position.map((value, axis) => value - particle.position[axis]);
          const distance = Math.hypot(...delta);
          const softening = .35 * this.scale;
          const gravity = .035 * other.mass * Math.pow(this.scale, 3) / Math.pow(distance * distance + softening * softening, 1.5);
          // A soft core prevents all seven masses from collapsing into one point.
          const core = (particle.radius + other.radius) * .65;
          const repulsion = distance < core ? .9 * (core - distance) / Math.max(distance, .01) : 0;
          for (let axis = 0; axis < 3; axis++) force[axis] += delta[axis] * (gravity - repulsion);
        }

        if (this.pointer) {
          const dx = this.pointer[0] - particle.position[0];
          const dy = this.pointer[1] - particle.position[1];
          const distance = Math.hypot(dx, dy);
          const gravity = this.pull * 3.5 * this.pointerStrength * (1 - this.burst * .85) / Math.pow(distance * distance + .8, 1.5);
          force[0] += dx * gravity;
          force[1] += dy * gravity;
        }

        return force;
      });

      this.particles.forEach((particle, i) => {
        for (let axis = 0; axis < 3; axis++) {
          const impulse = this.impulses[i][axis] * (1 - Math.exp(-dt / .05));
          this.impulses[i][axis] -= impulse;
          particle.velocity[axis] += impulse;
          particle.velocity[axis] = (particle.velocity[axis] + forces[i][axis] * dt) * Math.exp(-.72 * dt);
          particle.position[axis] += particle.velocity[axis] * dt;
        }
      });
    }
  }
}
