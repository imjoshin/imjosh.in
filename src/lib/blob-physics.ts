export type Point = readonly [number, number];
export type Vector = [number, number, number];
export const BLOB_BLEND = .2;
export const BLOB_SEPARATED_BLEND = .07;
export const BLOB_RADIUS_BLEND = .6;
export const MAX_BLOB_PARTICLES = 128;
export const MIN_FRAGMENT_VOLUME = 1 / 32;
export const POINTER_GRAVITY_BOOST = 10;
export const VELOCITY_SPLIT_SPEED = 1.1;

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
type BlobState = {
  version: 1;
  scale: number;
  rootVolumes: number[];
  aspect: number;
  time: number;
  nextId: number;
  particles: Particle[];
  merges: Merge[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const unit = (value: unknown): value is number => nonnegative(value) && value <= 1;
const vector = (value: unknown): value is Vector => Array.isArray(value) && value.length === 3 && value.every((axis) => typeof axis === "number" && Number.isFinite(axis));
const cloneParticle = (particle: Particle): Particle => ({ ...particle, position: [...particle.position], velocity: [...particle.velocity], impulse: [...particle.impulse] });

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
  private pointerBoost = false;
  private nextId = 0;
  private merges: Merge[] = [];

  constructor({ count = 7, scale = 1, aspect = 1, pull = .24, connectionThreshold = 2 * BLOB_BLEND * Math.LN2, maxParticles = MAX_BLOB_PARTICLES } = {}) {
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

  /** Fresh loads scatter within the visible scene instead of repeating the same orbit. */
  randomizePositions(random = Math.random) {
    for (let attempt = 0; attempt < 16; attempt++) {
      for (const particle of this.particles) {
        particle.position = [(random() * 2 - 1) * this.aspect * 1.4 * this.scale,
          (random() * 2 - 1) * 1.55 * this.scale, (random() * 2 - 1) * .6 * this.scale];
      }
      if (this.particles.length === 1 || !this.isSingleBlob(this.particles)) return;
    }
    // Even an unlucky random sequence must leave at least two separate groups.
    this.particles.forEach((particle, i) => particle.position[1] = (i % 2 ? 1 : -1) * (1.1 + random() * .45) * this.scale);
  }

  snapshot(): BlobState {
    return {
      version: 1, scale: this.scale, rootVolumes: this.roots.map((root) => root.volume),
      aspect: this.aspect, time: this.time, nextId: this.nextId,
      particles: this.particles.map(cloneParticle), merges: this.merges.map((merge) => ({ ...merge })),
    };
  }

  /** Validate before replacing live state, including fragments and in-flight merges. */
  restore(state: unknown): boolean {
    if (!isRecord(state) || state.version !== 1 || state.scale !== this.scale
      || !Array.isArray(state.rootVolumes) || state.rootVolumes.length !== this.roots.length
      || !state.rootVolumes.every((volume, i) => volume === this.roots[i].volume)
      || !nonnegative(state.aspect) || state.aspect === 0 || !nonnegative(state.time)
      || !nonnegative(state.nextId) || !Number.isSafeInteger(state.nextId)
      || !Array.isArray(state.particles) || state.particles.length < this.roots.length || state.particles.length > this.maxParticles
      || !Array.isArray(state.merges) || state.merges.length > state.particles.length / 2) return false;
    const nextId = state.nextId;
    const validParticle = (particle: unknown): particle is Particle => {
      if (!isRecord(particle) || !nonnegative(particle.root) || !Number.isInteger(particle.root) || particle.root >= this.roots.length) return false;
      const volume = this.roots[particle.root].volume;
      return nonnegative(particle.id) && Number.isSafeInteger(particle.id) && particle.id < nextId
        && vector(particle.position) && vector(particle.velocity) && vector(particle.impulse)
        && nonnegative(particle.volume) && particle.volume > 0 && particle.volume <= volume
        && nonnegative(particle.displayVolume) && particle.displayVolume <= volume
        && nonnegative(particle.radius) && Math.abs(particle.radius ** 3 - particle.volume) < volume * 1e-8
        && nonnegative(particle.mass) && Math.abs(particle.mass - particle.volume / (.4 * this.scale) ** 3) < 1e-8
        && unit(particle.burst) && unit(particle.burstEnergy) && nonnegative(particle.mergeAfter);
    };
    if (!state.particles.every(validParticle)) return false;
    const particles = state.particles as Particle[];
    const byId = new Map(particles.map((particle) => [particle.id, particle]));
    if (byId.size !== particles.length || this.roots.some((root, i) => {
      const pieces = particles.filter((particle) => particle.root === i);
      return Math.abs(pieces.reduce((sum, particle) => sum + particle.volume, 0) - root.volume) > root.volume * 1e-8
        || Math.abs(pieces.reduce((sum, particle) => sum + particle.displayVolume, 0) - root.volume) > root.volume * 1e-8;
    })) return false;
    const occupied = new Set<number>();
    for (const merge of state.merges) {
      if (!isRecord(merge) || !nonnegative(merge.target) || !nonnegative(merge.source)
        || !nonnegative(merge.volume) || merge.volume === 0 || !nonnegative(merge.elapsed) || merge.elapsed >= .4 || !unit(merge.progress)) return false;
      const target = byId.get(merge.target), source = byId.get(merge.source);
      const fraction = merge.elapsed / .4;
      if (!target || !source || target.root !== source.root || target.id === source.id
        || occupied.has(target.id) || occupied.has(source.id) || merge.volume > this.roots[source.root].volume
        || Math.abs(merge.progress - fraction * fraction * (3 - 2 * fraction)) > 1e-8
        || Math.abs(source.volume - merge.volume * (1 - merge.progress)) > this.roots[source.root].volume * 1e-8) return false;
      occupied.add(target.id); occupied.add(source.id);
    }
    const restored = particles.map(cloneParticle);
    const ratio = this.aspect / state.aspect;
    for (const particle of restored) {
      particle.position[0] *= ratio;
      particle.velocity[0] *= ratio;
      particle.impulse[0] *= ratio;
    }
    if (this.isSingleBlob(restored)) return false;
    this.particles.splice(0, this.particles.length, ...restored);
    this.time = state.time;
    this.nextId = nextId;
    this.merges = (state.merges as Merge[]).map((merge) => ({ ...merge }));
    this.pointer = null;
    this.pointerStrength = 0;
    this.pointerBoost = false;
    return true;
  }

  blendWidth(particle: Particle) {
    return Math.max(BLOB_SEPARATED_BLEND * this.scale,
      Math.min(BLOB_BLEND * this.scale, this.renderRadius(particle) * BLOB_RADIUS_BLEND) * (1 - particle.burst * .55));
  }

  /** Pairwise gap where the two exponential fields first form a visible bridge. */
  connectionGap(a: Particle, b: Particle) {
    const aw = this.blendWidth(a), bw = this.blendWidth(b), total = aw + bw;
    return Math.min(this.connectionThreshold, -aw * Math.log(aw / total) - bw * Math.log(bw / total));
  }

  /** Order-independent soft union. Widths depend on each blob, never the sampled point. */
  sampleSurface(point: Vector) {
    let density = 0, minimumWidth = Infinity, closest = Infinity, owner = -1;
    this.particles.forEach((particle, i) => {
      const radius = this.renderRadius(particle);
      if (radius < .0001) return;
      const signed = Math.hypot(...point.map((value, axis) => value - particle.position[axis])) - radius;
      if (signed < closest) { closest = signed; owner = i; }
      const width = this.blendWidth(particle);
      minimumWidth = Math.min(minimumWidth, width);
      density += Math.exp(Math.max(-60, Math.min(20, -signed / width)));
    });
    // The minimum width makes this a conservative march distance even with mixed sizes.
    return { distance: owner < 0 ? 1e3 : -Math.log(Math.max(density, 1e-26)) * minimumWidth, owner };
  }

  /** Ray march from the shader's camera through a pointer on the z=0 plane. */
  hitTest([x, y]: Point): number | null {
    return this.raycast([0, 0, 4], [x, y, -4])?.owner ?? null;
  }

  /** The same conservative surface march also sweeps moving projectiles. */
  raycast(origin: Vector, direction: Vector, limit = 10) {
    const length = Math.hypot(...direction);
    if (length === 0) return null;
    const ray = direction.map((axis) => axis / length);
    let depth = 0;
    for (let i = 0; i < 84; i++) {
      const point = origin.map((axis, i) => axis + ray[i] * depth) as Vector;
      const hit = this.sampleSurface(point);
      if (hit.distance < .002) return hit.owner >= 0 ? { owner: hit.owner, point } : null;
      depth += hit.distance;
      if (depth > limit) break;
    }
    return null;
  }

  private isSingleBlob(particles: Particle[]) {
    const visible = particles.filter((particle) => this.renderRadius(particle) >= .0001);
    return visible.length > 0 && this.connectedTo(0, visible).length === visible.length;
  }

  private connectedTo(index: number, particles = this.particles): Particle[] {
    const connected = new Set([index]);
    const queue = [index];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = particles[queue[cursor]];
      particles.forEach((other, i) => {
        if (connected.has(i)) return;
        const distance = Math.hypot(...current.position.map((value, axis) => value - other.position[axis]));
        const radius = this.renderRadius(current), otherRadius = this.renderRadius(other);
        const gap = this.connectionGap(current, other);
        if (radius > .0001 && otherRadius > .0001 && distance <= radius + otherRadius + gap) {
          connected.add(i);
          queue.push(i);
        }
      });
    }
    return queue.map((i) => particles[i]);
  }

  private orbit(i: number): Vector {
    return [
      Math.sin(this.time * .21 + i * 1.9) * this.aspect * .95 * this.scale,
      Math.cos(this.time * .17 + i * 2.7) * 1.05 * this.scale,
      Math.sin(this.time * .15 + i * 1.3) * .6 * this.scale,
    ];
  }

  setPointer(pointer: Point | null, boosted = false) {
    this.pointer = pointer;
    this.pointerBoost = pointer !== null && boosted;
  }

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

  private kick(particle: Particle, [x, y]: Point, spread: Vector = [0, 0, 0], strength = 1) {
    particle.burstEnergy = 1;
    particle.mergeAfter = this.time + 1.25;
    const dx = particle.position[0] - x + Math.sin(particle.id * 12.9) * .22;
    const dy = particle.position[1] - y + Math.cos(particle.id * 7.3) * .22;
    const length = Math.hypot(dx, dy) || 1;
    const impulse = (1.25 + (particle.id * .618 % 1) * .55) * this.scale / Math.sqrt(particle.mass + .5);
    particle.impulse[0] += (dx / length * impulse + spread[0]) * strength;
    particle.impulse[1] += (dy / length * impulse + spread[1]) * strength;
    particle.impulse[2] += (Math.sin(particle.id * 3 + 1) * .35 * this.scale + spread[2]) * strength;
  }

  /** Return stable identities, since fragments can change the particle array. */
  burstAt(point: Point): number[] {
    const hit = this.hitTest(point);
    if (hit === null) return [];
    return this.burstParticle(hit, point);
  }

  /** Stop at the first surface along this frame's flight, including thin fragments. */
  burstAlong(from: Vector, to: Vector, strength = 1): number[] {
    const direction = to.map((axis, i) => axis - from[i]) as Vector;
    const hit = this.raycast(from, direction, Math.hypot(...direction));
    if (!hit) return [];
    const [x, y, z] = hit.point;
    return this.burstParticle(hit.owner, [4 * x / (4 - z), 4 * y / (4 - z)], strength, true);
  }

  private burstParticle(hit: number, point: Point, strength = 1, splitHitOnly = false): number[] {
    const target = this.particles[hit];
    const connected = this.connectedTo(hit);
    // Clicks separate attached roots whole; pellets also split only the hit particle.
    const attachedRoots = new Set(connected.map((particle) => particle.root)).size > 1;
    const affected: number[] = [];
    for (const particle of connected) {
      const canSplit = splitHitOnly ? particle === target : !attachedRoots;
      const child = canSplit ? this.split(particle) : null;
      if (child) {
        const angle = particle.id * 2.4 + .7;
        const spread: Vector = [Math.cos(angle) * this.scale, Math.sin(angle) * this.scale, .15 * this.scale];
        this.kick(particle, point, spread, strength);
        this.kick(child, point, spread.map((value) => -value) as Vector, strength);
        affected.push(particle.id, child.id);
      } else {
        this.kick(particle, point, [0, 0, 0], strength);
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
      const displayTotal = target.displayVolume + source.displayVolume;
      this.setVolume(target, Math.min(this.roots[target.root].volume, target.volume + transfer));
      this.setVolume(source, Math.max(0, source.volume - transfer));
      target.displayVolume = displayTotal * target.volume / total;
      source.displayVolume = displayTotal * source.volume / total;
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

  private splitFastParticles() {
    // Snapshot the list so newborn fragments cannot split again in the same step.
    for (const particle of [...this.particles]) {
      // Let direct click/shot bursts settle instead of cascading their impulses.
      if (this.time < particle.mergeAfter || particle.burstEnergy > .2) continue;
      const speed = Math.hypot(...particle.velocity);
      if (speed < VELOCITY_SPLIT_SPEED * this.scale) continue;
      const child = this.split(particle);
      if (!child) continue;
      // Peel apart across the direction of travel while preserving net momentum.
      const [vx, vy] = particle.velocity;
      const length = Math.hypot(vx, vy);
      const direction: Vector = length > 1e-8 ? [-vy / length, vx / length, 0] : [1, 0, 0];
      const spread = Math.min(speed * .45, .9 * this.scale);
      for (let axis = 0; axis < 3; axis++) {
        particle.impulse[axis] -= direction[axis] * spread;
        child.impulse[axis] += direction[axis] * spread;
      }
      particle.mergeAfter = child.mergeAfter = this.time + 1.1;
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
          const gravity = this.pull * 3.5 * this.pointerStrength * (this.pointerBoost ? POINTER_GRAVITY_BOOST : 1)
            * (1 - particle.burst * .85) / (distance * distance + .8) ** 1.5;
          force[0] += dx * gravity;
          force[1] += dy * gravity;
        }
        return force;
      });
      this.particles.forEach((particle, i) => {
        for (let axis = 0; axis < 3; axis++) {
          const impulse = particle.impulse[axis] * (1 - Math.exp(-dt / .018));
          particle.impulse[axis] -= impulse;
          particle.velocity[axis] += impulse;
          particle.velocity[axis] = (particle.velocity[axis] + forces[i][axis] * dt) * Math.exp(-.72 * dt);
          particle.position[axis] += particle.velocity[axis] * dt;
        }
      });
      this.splitFastParticles();
      this.coalesce(dt);
    }
  }
}
