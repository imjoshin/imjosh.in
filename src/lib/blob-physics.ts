export type Point = readonly [number, number];
type Vector = [number, number, number];
export const BLOB_BLEND = .8;
export const BLOB_SEPARATED_BLEND = .1;
export const BLOB_RADIUS_BLEND = 2;
export const MAX_BLOB_PARTICLES = 32;
export const MIN_FRAGMENT_VOLUME = .25;

export type RootBlob = Readonly<{ radius: number; volume: number }>;
export type Particle = {
  id: number;
  root: number;
  position: Vector;
  velocity: Vector;
  radius: number;
  /** Sphere volumes omit the common 4pi/3 factor. */
  volume: number;
  displayVolume: number;
  mass: number;
  burst: number;
  burstEnergy: number;
  impulse: Vector;
  mergeAfter: number;
};
type Merge = { target: number; source: number; volume: number; elapsed: number; progress: number };

/** Persistent root volumes, with inertial fragments that coalesce back into their root. */
export class BlobSimulation {
  readonly particles: Particle[];
  readonly roots: readonly RootBlob[];
  readonly scale: number;
  readonly pull: number;
  readonly connectionThreshold: number;
  readonly maxParticles: number;
  aspect: number;
  time = 0;
  private pointer: Point | null = null;
  private pointerStrength = 0;
  private nextId = 0;
  private merges: Merge[] = [];

  constructor({ count = 7, scale = 1, aspect = 1, pull = .24, connectionThreshold = BLOB_BLEND / 2, maxParticles = MAX_BLOB_PARTICLES } = {}) {
    this.scale = scale;
    this.aspect = aspect;
    this.pull = pull;
    this.connectionThreshold = connectionThreshold * scale;
    this.maxParticles = Math.max(8, Math.min(MAX_BLOB_PARTICLES, maxParticles));
    this.roots = Object.freeze(Array.from({ length: Math.max(1, Math.min(8, Math.floor(count))) }, (_, i) => {
      const radius = (.36 + .15 * Math.sin(i * 2.1 + 1)) * scale;
      return Object.freeze({ radius, volume: radius ** 3 });
    }));
    this.particles = this.roots.map((root, i) => ({
      id: this.nextId++, root: i,
      position: this.orbit(i),
      velocity: [Math.cos(i * 1.9) * .12, -Math.sin(i * 2.7) * .1, Math.cos(i * 1.3) * .06],
      radius: root.radius, volume: root.volume, displayVolume: root.volume,
      mass: root.volume / (.4 * scale) ** 3,
      burst: 0, burstEnergy: 0, impulse: [0, 0, 0], mergeAfter: 0,
    }));
  }

  get burst() { return this.particles.reduce((maximum, particle) => Math.max(maximum, particle.burst), 0); }
  renderRadius(particle: Particle) { return Math.cbrt(Math.max(0, particle.displayVolume)); }

  /** Same smooth-union field as the shader, including growing and merging fragments. */
  private sample(point: Vector) {
    let distance = 1e3, blendedBurst = 0, blendedRadius = 1e3, closest = Infinity, owner = -1;
    this.particles.forEach((particle, i) => {
      const radius = this.renderRadius(particle);
      if (radius < .0001) return;
      const signed = Math.hypot(...point.map((value, axis) => value - particle.position[axis])) - radius;
      if (signed < closest) { closest = signed; owner = i; }
      const blend = Math.min(BLOB_BLEND * this.scale, Math.min(radius, blendedRadius) * BLOB_RADIUS_BLEND)
        * (1 - Math.max(blendedBurst, particle.burst) * (1 - BLOB_SEPARATED_BLEND / BLOB_BLEND));
      const weight = Math.max(0, Math.min(1, .5 + .5 * (signed - distance) / blend));
      distance = signed * (1 - weight) + distance * weight - blend * weight * (1 - weight);
      blendedBurst = particle.burst * (1 - weight) + blendedBurst * weight;
      blendedRadius = radius * (1 - weight) + blendedRadius * weight;
    });
    return { distance, owner };
  }

  /** Ray march from the shader's camera through a pointer on the z=0 plane. */
  hitTest([x, y]: Point): number | null {
    const length = Math.hypot(x, y, 4);
    const ray = [x / length, y / length, -4 / length];
    let depth = 0;
    for (let i = 0; i < 84; i++) {
      const hit = this.sample([ray[0] * depth, ray[1] * depth, 4 + ray[2] * depth]);
      if (hit.distance < .002) return hit.owner >= 0 ? hit.owner : null;
      depth += hit.distance;
      if (depth > 10) break;
    }
    return null;
  }

  private connectedTo(index: number): Particle[] {
    const connected = new Set([index]);
    const queue = [index];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = this.particles[queue[cursor]];
      this.particles.forEach((other, i) => {
        if (connected.has(i)) return;
        const distance = Math.hypot(...current.position.map((value, axis) => value - other.position[axis]));
        const radius = this.renderRadius(current), otherRadius = this.renderRadius(other);
        const gap = Math.min(this.connectionThreshold, Math.min(radius, otherRadius) * BLOB_RADIUS_BLEND / 2)
          * (1 - Math.max(current.burst, other.burst) * (1 - BLOB_SEPARATED_BLEND / BLOB_BLEND));
        if (radius > .0001 && otherRadius > .0001 && distance <= radius + otherRadius + gap) {
          connected.add(i);
          queue.push(i);
        }
      });
    }
    return queue.map((i) => this.particles[i]);
  }

  private orbit(i: number): Vector {
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
      particle.impulse[0] *= ratio;
    }
    this.aspect = aspect;
  }

  private setVolume(particle: Particle, volume: number) {
    particle.volume = volume;
    particle.radius = Math.cbrt(Math.max(0, volume));
    particle.mass = volume / (.4 * this.scale) ** 3;
  }

  private isMerging(particle: Particle) {
    return this.merges.some((merge) => merge.target === particle.id || merge.source === particle.id);
  }

  private split(particle: Particle): Particle | null {
    const half = particle.volume / 2;
    if (half < this.roots[particle.root].volume * MIN_FRAGMENT_VOLUME - 1e-10
      || this.particles.length >= this.maxParticles || this.isMerging(particle)) return null;
    this.setVolume(particle, half);
    const child: Particle = {
      ...particle, id: this.nextId++, position: [...particle.position], velocity: [...particle.velocity],
      impulse: [...particle.impulse], displayVolume: 0,
    };
    // Display volume transfers gradually from the existing surface to the new one.
    this.particles.push(child);
    return child;
  }

  private kick(particle: Particle, [x, y]: Point, spread: Vector = [0, 0, 0]) {
    particle.burstEnergy = 1;
    particle.mergeAfter = this.time + 1.25;
    const dx = particle.position[0] - x + Math.sin(particle.id * 12.9) * .22;
    const dy = particle.position[1] - y + Math.cos(particle.id * 7.3) * .22;
    const length = Math.hypot(dx, dy) || 1;
    const impulse = (1.25 + (particle.id * .618 % 1) * .55) * this.scale / Math.sqrt(particle.mass + .5);
    particle.impulse[0] += dx / length * impulse + spread[0];
    particle.impulse[1] += dy / length * impulse + spread[1];
    particle.impulse[2] += Math.sin(particle.id * 3 + 1) * .35 * this.scale + spread[2];
  }

  /** Return stable identities, since fragments can change the particle array. */
  burstAt(point: Point): number[] {
    const hit = this.hitTest(point);
    if (hit === null) return [];
    const connected = this.connectedTo(hit);
    // Attached roots separate as whole blobs. One root may split into smaller pieces.
    const attachedRoots = new Set(connected.map((particle) => particle.root)).size > 1;
    const affected: number[] = [];
    for (const particle of connected) {
      const child = attachedRoots ? null : this.split(particle);
      if (child) {
        const angle = particle.id * 2.4 + .7;
        const spread: Vector = [Math.cos(angle) * this.scale, Math.sin(angle) * this.scale, .15 * this.scale];
        this.kick(particle, point, spread);
        this.kick(child, point, spread.map((value) => -value) as Vector);
        affected.push(particle.id, child.id);
      } else {
        this.kick(particle, point);
        affected.push(particle.id);
      }
    }
    return affected;
  }

  private coalesce(dt: number) {
    const occupied = new Set<number>();
    for (const merge of this.merges) {
      const target = this.particles.find((particle) => particle.id === merge.target)!;
      const source = this.particles.find((particle) => particle.id === merge.source)!;
      occupied.add(target.id); occupied.add(source.id);
      const total = target.volume + source.volume;
      const center = target.position.map((value, axis) => (value * target.volume + source.position[axis] * source.volume) / total);
      const velocity = target.velocity.map((value, axis) => (value * target.volume + source.velocity[axis] * source.volume) / total);
      merge.elapsed = Math.min(.4, merge.elapsed + dt);
      const fraction = merge.elapsed / .4;
      const progress = fraction * fraction * (3 - 2 * fraction);
      const remaining = (1 - progress) / Math.max(1e-10, 1 - merge.progress);
      const delta = source.position.map((value, axis) => (value - target.position[axis]) * remaining);
      const transfer = merge.volume * (progress - merge.progress);
      this.setVolume(target, Math.min(this.roots[target.root].volume, target.volume + transfer));
      this.setVolume(source, Math.max(0, source.volume - transfer));
      target.displayVolume = target.volume;
      source.displayVolume = source.volume;
      for (let axis = 0; axis < 3; axis++) {
        target.position[axis] = center[axis] - delta[axis] * source.volume / total;
        source.position[axis] = center[axis] + delta[axis] * target.volume / total;
      }
      merge.progress = progress;
      if (fraction === 1) {
        target.velocity = velocity as Vector;
        target.impulse = target.impulse.map((value, axis) => (value * (total - merge.volume) + source.impulse[axis] * merge.volume) / total) as Vector;
        this.particles.splice(this.particles.indexOf(source), 1);
      }
    }
    this.merges = this.merges.filter((merge) => merge.elapsed < .4);
    // Root identity prevents complete roots from over-merging and restores exact starting sizes.
    for (let i = 0; i < this.particles.length; i++) {
      const target = this.particles[i];
      if (occupied.has(target.id) || this.time < target.mergeAfter) continue;
      for (let j = i + 1; j < this.particles.length; j++) {
        const source = this.particles[j];
        if (target.root !== source.root || occupied.has(source.id) || this.time < source.mergeAfter) continue;
        const distance = Math.hypot(...source.position.map((value, axis) => value - target.position[axis]));
        if (distance > (target.radius + source.radius) * .95) continue;
        this.merges.push({ target: target.id, source: source.id, volume: source.volume, elapsed: 0, progress: 0 });
        occupied.add(target.id); occupied.add(source.id);
        break;
      }
    }
  }

  step(elapsed: number) {
    let remaining = Math.min(.1, Math.max(0, elapsed));
    while (remaining > 1e-8) {
      const dt = Math.min(remaining, 1 / 120);
      remaining -= dt;
      this.time += dt;
      this.particles.forEach((particle) => {
        particle.burstEnergy *= Math.exp(-dt / 1.65);
        particle.burst += (particle.burstEnergy - particle.burst) * (1 - Math.exp(-dt / .06));
        particle.displayVolume += (particle.volume - particle.displayVolume) * (1 - Math.exp(-dt / .065));
      });
      this.pointerStrength += ((this.pointer ? 1 : 0) - this.pointerStrength) * (1 - Math.exp(-dt * 3));

      const forces = this.particles.map((particle, i) => {
        const anchor = this.orbit(particle.root);
        const force = anchor.map((value, axis) => (value - particle.position[axis]) * .32);
        for (let j = 0; j < this.particles.length; j++) {
          if (i === j) continue;
          const other = this.particles[j];
          const delta = other.position.map((value, axis) => value - particle.position[axis]);
          const distance = Math.hypot(...delta);
          const softening = .35 * this.scale;
          const gravity = (particle.root === other.root ? .12 : .035) * other.mass * this.scale ** 3 / (distance * distance + softening * softening) ** 1.5;
          const core = (particle.radius + other.radius) * .65;
          const repulsion = distance < core ? .9 * (core - distance) / Math.max(distance, .01) : 0;
          for (let axis = 0; axis < 3; axis++) force[axis] += delta[axis] * (gravity - repulsion);
        }
        if (this.pointer) {
          const dx = this.pointer[0] - particle.position[0];
          const dy = this.pointer[1] - particle.position[1];
          const distance = Math.hypot(dx, dy);
          const gravity = this.pull * 3.5 * this.pointerStrength * (1 - particle.burst * .85) / (distance * distance + .8) ** 1.5;
          force[0] += dx * gravity;
          force[1] += dy * gravity;
        }
        return force;
      });
      this.particles.forEach((particle, i) => {
        for (let axis = 0; axis < 3; axis++) {
          const impulse = particle.impulse[axis] * (1 - Math.exp(-dt / .05));
          particle.impulse[axis] -= impulse;
          particle.velocity[axis] += impulse;
          particle.velocity[axis] = (particle.velocity[axis] + forces[i][axis] * dt) * Math.exp(-.72 * dt);
          particle.position[axis] += particle.velocity[axis] * dt;
        }
      });
      this.coalesce(dt);
    }
  }
}
