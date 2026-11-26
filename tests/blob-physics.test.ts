import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BlobSimulation, MIN_FRAGMENT_VOLUME } from "../src/lib/blob-physics.ts";

function advance(simulation: BlobSimulation, seconds: number, step = 1 / 120) {
  for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += step) simulation.step(Math.min(step, seconds - elapsed));
}

function difference(a: BlobSimulation, b: BlobSimulation) {
  return a.particles.reduce((sum, particle, i) => sum + Math.hypot(...particle.position.map((value, axis) => value - b.particles[i].position[axis])), 0) / a.particles.length;
}

function aim(simulation: BlobSimulation, index = 0): [number, number] {
  const [x, y, z] = simulation.particles[index].position;
  return [4 * x / (4 - z), 4 * y / (4 - z)];
}

function fixture(positions: [number, number, number][], connectionThreshold?: number) {
  const simulation = new BlobSimulation({ count: positions.length, connectionThreshold });
  simulation.particles.forEach((particle, i) => {
    particle.position = [...positions[i]];
    particle.velocity = [0, 0, 0];
  });
  return simulation;
}

test("empty-space clicks leave all bubbles alone", () => {
  const idle = fixture([[0, 0, 0], [3, 0, 0]]);
  const clicked = fixture([[0, 0, 0], [3, 0, 0]]);
  assert.equal(clicked.hitTest([10, 10]), null);
  assert.deepEqual(clicked.burstAt([10, 10]), []);
  advance(idle, 1);
  advance(clicked, 1);
  assert.deepEqual(clicked.particles, idle.particles);
});

test("a separated bubble gets no click impulse or shape change", () => {
  const idle = fixture([[0, 0, 0], [3, 0, 0]]);
  const clicked = fixture([[0, 0, 0], [3, 0, 0]]);
  assert.deepEqual(clicked.burstAt([0, 0]), [0, 2]);
  idle.step(1 / 120);
  clicked.step(1 / 120);
  assert.ok(clicked.particles[0].burst > 0);
  assert.notDeepEqual(clicked.particles[0].velocity, idle.particles[0].velocity);
  assert.deepEqual(clicked.particles[1], idle.particles[1]);
});

test("a click reaches the entire connected chain but stops before a separate group", () => {
  const simulation = fixture([[-1, 0, 0], [-.25, 0, 0], [.5, 0, 0], [3, 0, 0]]);
  assert.deepEqual(simulation.burstAt([-1, 0]), [0, 1, 2]);
  simulation.step(1 / 120);
  assert.ok(simulation.particles.slice(0, 3).every((particle) => particle.burst > 0));
  assert.equal(simulation.particles[3].burst, 0);
});

test("connections respect the surface-gap threshold", () => {
  const reference = new BlobSimulation({ count: 2 });
  const [a, b] = reference.roots;
  const connectedDistance = a.radius + b.radius + reference.connectionGap(reference.particles[0], reference.particles[1]);
  assert.deepEqual(fixture([[0, 0, 0], [connectedDistance - .01, 0, 0]]).burstAt([0, 0]), [0, 1]);
  assert.deepEqual(fixture([[0, 0, 0], [connectedDistance + .01, 0, 0]]).burstAt([0, 0]), [0, 2]);
  assert.deepEqual(fixture([[0, 0, 0], [connectedDistance - .01, 0, 0]], .2).burstAt([0, 0]), [0, 2]);
});

test("hit detection selects the front surface and includes the smooth bridge between bubbles", () => {
  const overlapping = fixture([[0, 0, 0], [0, 0, 1.5]]);
  assert.equal(overlapping.hitTest([0, 0]), 1);
  assert.deepEqual(overlapping.burstAt([0, 0]), [1, 2]);
  const [a, b] = overlapping.roots;
  const bridge = fixture([[-a.radius - .1, 0, 0], [b.radius + .1, 0, 0]]);
  assert.deepEqual(bridge.burstAt([0, 0]), [0, 1]);
});

test("a click eases a velocity impulse from the current state without an instantaneous shape or position jump", () => {
  const simulation = new BlobSimulation();
  advance(simulation, 3);
  const before = structuredClone(simulation.particles);
  assert.ok(simulation.burstAt(aim(simulation)).length > 0);
  assert.deepEqual(simulation.particles.map(({ position, velocity, displayVolume, burst }) => ({ position, velocity, displayVolume, burst })),
    before.map(({ position, velocity, displayVolume, burst }) => ({ position, velocity, displayVolume, burst })));
  assert.equal(simulation.burst, 0);
  simulation.step(1 / 120);
  assert.ok(simulation.burst > 0 && simulation.burst < .2);
  simulation.particles.forEach((particle, i) => assert.ok(Math.hypot(...particle.position.map((value, axis) => value - before[i].position[axis])) < .01));
  advance(simulation, .15);
  assert.ok(simulation.burst > .7);
});

test("pointer gravity attracts particles individually rather than translating the scene", () => {
  const idle = new BlobSimulation();
  const attracted = new BlobSimulation();
  const pointer = [1.2, .7] as const;
  attracted.setPointer(pointer);
  advance(idle, 3);
  advance(attracted, 3);
  const distance = (simulation: BlobSimulation) => simulation.particles.reduce((sum, particle) => sum + Math.hypot(particle.position[0] - pointer[0], particle.position[1] - pointer[1]), 0);
  assert.ok(distance(attracted) < distance(idle));
  const shifts = attracted.particles.map((particle, i) => particle.position[0] - idle.particles[i].position[0]);
  assert.ok(Math.max(...shifts) - Math.min(...shifts) > .2);
  assert.ok(new Set(attracted.particles.map((particle) => particle.mass)).size > 1);
});

test("a single click disperses particles for seconds and they gradually recover without a held pointer", () => {
  const idle = new BlobSimulation({ count: 1 });
  const scattered = new BlobSimulation({ count: 1 });
  scattered.burstAt(aim(scattered));
  advance(idle, 1);
  advance(scattered, 1);
  const dispersed = difference(idle, scattered);
  assert.ok(dispersed > .35);
  assert.ok(scattered.burst > .5);
  advance(idle, 11);
  advance(scattered, 11);
  assert.ok(difference(idle, scattered) < dispersed * .15);
  assert.ok(scattered.burst < .002);
});

test("physics remains consistent across low and high refresh rates", () => {
  const low = new BlobSimulation();
  const high = new BlobSimulation();
  for (const simulation of [low, high]) {
    simulation.setPointer([.5, .5]);
    simulation.burstAt(aim(simulation));
  }
  advance(low, 8, 1 / 30);
  advance(high, 8, 1 / 144);
  assert.ok(difference(low, high) < .01);
});

test("resizing preserves time and motion, and long frame gaps cannot destabilize the simulation", () => {
  const simulation = new BlobSimulation();
  advance(simulation, 2);
  const time = simulation.time;
  const x = simulation.particles.map((particle) => particle.position[0]);
  simulation.setAspect(2);
  assert.equal(simulation.time, time);
  simulation.particles.forEach((particle, i) => assert.equal(particle.position[0], x[i] * 2));
  simulation.setAspect(0);
  assert.equal(simulation.aspect, 2);
  for (let i = 0; i < 1000; i++) {
    if (i % 60 === 0) simulation.burstAt([Math.sin(i), Math.cos(i)]);
    simulation.step(i % 100 === 0 ? 60 : 1 / 60);
  }
  for (const particle of simulation.particles) {
    assert.ok([...particle.position, ...particle.velocity].every(Number.isFinite));
    assert.ok(Math.hypot(...particle.position) < 10);
  }
});

function quarters() {
  const simulation = fixture([[0, 0, 0]]);
  simulation.burstAt([0, 0]);
  simulation.particles[0].position = [-2, 0, 0];
  simulation.particles[1].position = [2, 0, 0];
  simulation.particles.forEach((particle) => particle.displayVolume = particle.volume);
  simulation.burstAt(aim(simulation, 0));
  simulation.burstAt(aim(simulation, 1));
  simulation.particles.forEach((particle, i) => {
    particle.position = [i * 2, 0, 0];
    particle.displayVolume = particle.volume;
  });
  return simulation;
}

function fragmentRoot(simulation: BlobSimulation, root: number) {
  for (let level = 0; level < 4; level++) {
    const pieces = simulation.particles.filter((particle) => particle.root === root);
    for (const piece of pieces) {
      simulation.particles.forEach((particle) => {
        particle.position = [20 + particle.id, 10, 0];
        particle.displayVolume = particle.volume;
        particle.velocity = [0, 0, 0];
      });
      piece.position = [0, 0, 0];
      simulation.burstAt([0, 0]);
    }
  }
  simulation.particles.forEach((particle, i) => {
    particle.position = [i * 2, 0, 0];
    particle.displayVolume = particle.volume;
  });
}

function assertVolume(simulation: BlobSimulation) {
  simulation.roots.forEach((root, i) => {
    const pieces = simulation.particles.filter((particle) => particle.root === i);
    assert.ok(Math.abs(pieces.reduce((sum, particle) => sum + particle.volume, 0) - root.volume) < 1e-10);
    assert.ok(Math.abs(pieces.reduce((sum, particle) => sum + particle.displayVolume, 0) - root.volume) < 1e-10);
    pieces.forEach((particle) => assert.ok(Math.abs(particle.radius ** 3 - particle.volume) < 1e-10));
  });
}

test("an isolated root splits into equal half-volume pieces from its current position and velocity", () => {
  const simulation = fixture([[0, 0, 0]]);
  simulation.particles[0].velocity = [.2, -.1, .05];
  const before = structuredClone(simulation.particles[0]);
  assert.deepEqual(simulation.burstAt([0, 0]), [0, 1]);
  assert.equal(simulation.particles.length, 2);
  for (const piece of simulation.particles) {
    assert.equal(piece.volume, before.volume / 2);
    assert.ok(Math.abs(piece.radius / before.radius - Math.cbrt(.5)) < 1e-10);
    assert.equal(piece.mass, before.mass / 2);
    assert.deepEqual(piece.position, before.position);
    assert.deepEqual(piece.velocity, before.velocity);
    assert.equal(piece.burst, 0);
  }
  assert.equal(simulation.renderRadius(simulation.particles[0]), before.radius);
  assert.equal(simulation.renderRadius(simulation.particles[1]), 0);
  simulation.step(1 / 120);
  assert.ok(simulation.renderRadius(simulation.particles[1]) > 0);
  simulation.particles.forEach((piece) => assert.ok(Math.hypot(...piece.position) < .01));
  assertVolume(simulation);
});

test("attached roots separate without fragmentation or changes to their starting sizes", () => {
  const simulation = fixture([[0, 0, 0], [.8, 0, 0]]);
  const volumes = simulation.particles.map((particle) => particle.volume);
  assert.deepEqual(simulation.burstAt([0, 0]), [0, 1]);
  assert.equal(simulation.particles.length, simulation.roots.length);
  advance(simulation, .5);
  assert.deepEqual(simulation.particles.map((particle) => particle.volume), volumes);
  assertVolume(simulation);
});

test("four split levels produce sixteenth-volume minimum pieces that only move when clicked", () => {
  const simulation = fixture([[0, 0, 0]]);
  fragmentRoot(simulation, 0);
  assert.equal(simulation.particles.length, 16);
  simulation.particles.forEach((particle) => assert.equal(particle.volume, simulation.roots[0].volume * MIN_FRAGMENT_VOLUME));
  const piece = simulation.particles[0];
  const impulse = [...piece.impulse];
  assert.deepEqual(simulation.burstAt(aim(simulation)), [piece.id]);
  assert.equal(simulation.particles.length, 16);
  assert.notDeepEqual(piece.impulse, impulse);
  assertVolume(simulation);
});

test("fresh fragments have time to move apart before they can merge", () => {
  const simulation = fixture([[0, 0, 0]]);
  simulation.burstAt([0, 0]);
  advance(simulation, 1);
  assert.equal(simulation.particles.length, 2);
  assert.ok(Math.hypot(...simulation.particles[0].position.map((value, axis) => value - simulation.particles[1].position[axis])) > .5);
  assertVolume(simulation);
});

test("touching fragments coalesce gradually while conserving volume and restoring the original root", () => {
  const simulation = quarters();
  simulation.particles.forEach((particle, i) => {
    particle.position = [i * .1, 0, 0];
    particle.velocity = [0, 0, 0];
    particle.impulse = [0, 0, 0];
    particle.mergeAfter = 0;
  });
  simulation.step(1 / 120);
  assert.equal(simulation.particles.length, 4);
  advance(simulation, .2);
  assert.equal(simulation.particles.length, 4);
  assert.ok(simulation.particles.some((particle) => particle.volume < simulation.roots[0].volume / 4));
  for (let i = 0; i < 240; i++) { simulation.step(1 / 120); assertVolume(simulation); }
  assert.equal(simulation.particles.length, 1);
  assert.ok(Math.abs(simulation.particles[0].radius - simulation.roots[0].radius) < 1e-10);
});

test("fragments naturally re-form the starting count and size without another click", () => {
  const simulation = quarters();
  advance(simulation, 20);
  assert.equal(simulation.particles.length, simulation.roots.length);
  assert.ok(Math.abs(simulation.particles[0].radius - simulation.roots[0].radius) < 1e-10);
  assertVolume(simulation);
});

test("different complete roots never over-merge, even when they touch", () => {
  const simulation = fixture([[0, 0, 0], [.2, 0, 0]]);
  advance(simulation, 10);
  assert.equal(simulation.particles.length, 2);
  assert.deepEqual(simulation.particles.map((particle) => particle.radius), simulation.roots.map((root) => root.radius));
  assertVolume(simulation);
});

test("rapid splitting, merging, resizing, and long frame gaps preserve root volumes and the fragment cap", () => {
  const simulation = new BlobSimulation();
  for (let frame = 0; frame < 1800; frame++) {
    if (frame % 12 === 0) {
      const index = frame % simulation.particles.length;
      simulation.burstAt(aim(simulation, index));
    }
    if (frame % 90 === 0) simulation.setAspect(frame % 180 === 0 ? .6 : 1.8);
    simulation.step(frame % 100 === 0 ? 20 : 1 / 60);
    assertVolume(simulation);
    assert.ok(simulation.particles.length >= simulation.roots.length);
    assert.ok(simulation.particles.length <= simulation.roots.length / MIN_FRAGMENT_VOLUME);
    simulation.particles.forEach((particle) => assert.ok([...particle.position, ...particle.velocity].every(Number.isFinite)));
  }
});

test("all eight roots can reach the 128-piece limit and still recover their exact original sizes", () => {
  const simulation = new BlobSimulation({ count: 8 });
  for (let root = 0; root < simulation.roots.length; root++) {
    fragmentRoot(simulation, root);
    assertVolume(simulation);
  }
  assert.equal(simulation.particles.length, 128);
  simulation.particles.forEach((particle) => {
    particle.position = [Math.sin(particle.root * 1.9), Math.cos(particle.root * 2.7), .1 * (particle.id % 4)];
    particle.displayVolume = particle.volume;
  });
  advance(simulation, 20);
  assert.equal(simulation.particles.length, 8);
  assertVolume(simulation);
  simulation.roots.forEach((root, i) => {
    const particle = simulation.particles.find((piece) => piece.root === i)!;
    assert.ok(Math.abs(particle.radius - root.radius) < 1e-10);
  });
});

test("devices with a smaller render capacity never create fragments they cannot display", () => {
  const simulation = new BlobSimulation({ count: 8, maxParticles: 32 });
  for (let root = 0; root < simulation.roots.length; root++) fragmentRoot(simulation, root);
  assert.equal(simulation.particles.length, 32);
  assertVolume(simulation);
  assert.ok(simulation.particles.every((particle) => particle.volume >= simulation.roots[particle.root].volume * MIN_FRAGMENT_VOLUME));
});

test("mixed-size and mixed-burst joins have the same surface regardless of particle order", () => {
  const simulation = fixture([[-.35, 0, 0], [.35, 0, 0], [0, .45, .1]]);
  simulation.particles.forEach((particle, i) => particle.burst = [0, .65, .95][i]);
  const points = Array.from({ length: 101 }, (_, i) => [(i - 50) / 60, .1, .4] as [number, number, number]);
  const distances = points.map((point) => simulation.sampleSurface(point).distance);
  simulation.particles.reverse();
  points.forEach((point, i) => assert.ok(Math.abs(simulation.sampleSurface(point).distance - distances[i]) < 1e-12));
});

test("surface normals remain continuous through joins with different radii and burst states", () => {
  const simulation = fixture([[-.35, 0, 0], [.35, 0, 0], [0, .45, .1]]);
  simulation.particles.forEach((particle, i) => particle.burst = [0, .65, .95][i]);
  const normal = (point: [number, number, number]) => {
    const epsilon = .0001;
    const gradient = point.map((_, axis) => {
      const plus = [...point] as [number, number, number], minus = [...point] as [number, number, number];
      plus[axis] += epsilon; minus[axis] -= epsilon;
      return (simulation.sampleSurface(plus).distance - simulation.sampleSurface(minus).distance) / (2 * epsilon);
    });
    const length = Math.hypot(...gradient);
    return gradient.map((value) => value / length);
  };
  let previous = normal([-.8, .1, .4]);
  for (let x = -.799; x <= .8; x += .001) {
    const current = normal([x, .1, .4]);
    assert.ok(Math.hypot(...current.map((value, axis) => value - previous[axis])) < .02);
    previous = current;
  }
});

test("click velocity ramps up within 55 ms without an instantaneous velocity change", () => {
  const simulation = fixture([[0, 0, 0]]);
  const velocity = [...simulation.particles[0].velocity];
  simulation.burstAt([0, 0]);
  assert.deepEqual(simulation.particles[0].velocity, velocity);
  const queued = simulation.particles.map((particle) => Math.hypot(...particle.impulse));
  advance(simulation, .055);
  simulation.particles.forEach((particle, i) => assert.ok(Math.hypot(...particle.impulse) < queued[i] * .05));
});

test("fresh positions vary, stay within the scene, and avoid a single connected blob on desktop and mobile", () => {
  for (const aspect of [.45, 1, 1.8]) {
    const first = new BlobSimulation({ aspect });
    const second = new BlobSimulation({ aspect });
    first.randomizePositions(() => .2);
    second.randomizePositions(() => .8);
    assert.notDeepEqual(first.particles.map((particle) => particle.position), second.particles.map((particle) => particle.position));
    for (const simulation of [first, second]) {
      assertVolume(simulation);
      simulation.particles.forEach(({ position: [x, y, z] }) => {
        assert.ok(Math.abs(x) <= aspect * 1.4 && Math.abs(y) <= 1.55 && Math.abs(z) <= .6);
      });
      assert.equal(new BlobSimulation({ aspect }).restore(simulation.snapshot()), true);
    }
  }
});

test("saved fragments, velocities, pending impulses, and time resume with the same motion after JSON storage", () => {
  const original = fixture([[-1.5, 0, 0], [1.5, 0, 0]]);
  original.burstAt(aim(original));
  original.step(1 / 120);
  const restored = new BlobSimulation({ count: 2 });
  assert.equal(restored.restore(JSON.parse(JSON.stringify(original.snapshot()))), true);
  assert.deepEqual(restored.snapshot(), original.snapshot());
  advance(original, 1);
  advance(restored, 1);
  assert.deepEqual(restored.snapshot(), original.snapshot());
  const snapshot = restored.snapshot();
  snapshot.particles[0].position[0] += 10;
  assert.notDeepEqual(snapshot.particles, restored.particles);
});

test("a saved merge continues smoothly and restores the root's exact volume", () => {
  const original = fixture([[0, 0, 0], [3, 0, 0]]);
  original.burstAt([0, 0]);
  original.particles.forEach((particle) => {
    particle.impulse = [0, 0, 0];
    particle.mergeAfter = 0;
  });
  advance(original, .2);
  assert.equal(original.snapshot().merges.length, 1);
  const restored = new BlobSimulation({ count: 2 });
  assert.equal(restored.restore(JSON.parse(JSON.stringify(original.snapshot()))), true);
  advance(original, .5);
  advance(restored, .5);
  assert.deepEqual(restored.snapshot(), original.snapshot());
  assert.equal(restored.particles.length, 2);
  assertVolume(restored);
});

test("restoring at a different viewport aspect preserves relative positions and motion", () => {
  const original = fixture([[-1.5, 0, 0], [1.5, 0, 0]]);
  original.burstAt(aim(original));
  original.step(1 / 120);
  const restored = new BlobSimulation({ count: 2, aspect: .5 });
  assert.equal(restored.restore(original.snapshot()), true);
  original.setAspect(.5);
  assert.deepEqual(restored.snapshot(), original.snapshot());
});

test("a single connected group is discarded, including a chain with disconnected endpoints", () => {
  for (const positions of [
    [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
    [[-1, 0, 0], [-.25, 0, 0], [.5, 0, 0]],
  ] as [number, number, number][][]) {
    const restored = new BlobSimulation({ count: 3 });
    const before = restored.snapshot();
    assert.equal(restored.restore(fixture(positions).snapshot()), false);
    assert.deepEqual(restored.snapshot(), before);
  }
});

test("invalid or incompatible saved state is ignored without changing the simulation", () => {
  const original = fixture([[-1.5, 0, 0], [1.5, 0, 0]]);
  const valid = original.snapshot();
  const variants: unknown[] = [null, {}, { ...valid, version: 0 }, { ...valid, scale: 2 },
    { ...valid, aspect: 0 }, { ...valid, time: Infinity }, { ...valid, nextId: 0 },
    { ...valid, particles: [] }, { ...valid, particles: [valid.particles[0], valid.particles[0]] },
    { ...valid, merges: [{ target: 0, source: 100, volume: .1, elapsed: 0, progress: 0 }] },
    ...["position", "velocity", "impulse"].map((field) => ({ ...valid, particles: valid.particles.map((particle) => ({ ...particle, [field]: [NaN, 0, 0] })) })),
    ...["volume", "displayVolume", "radius", "mass", "root", "burst", "burstEnergy", "mergeAfter"].map((field) => ({ ...valid, particles: valid.particles.map((particle) => ({ ...particle, [field]: -1 })) })),
  ];
  for (const state of variants) {
    assert.equal(original.restore(state), false);
    assert.deepEqual(original.snapshot(), valid);
  }
  assert.equal(new BlobSimulation({ count: 3 }).restore(valid), false);
  const fragmented = new BlobSimulation({ count: 8 });
  fragmentRoot(fragmented, 0);
  assert.equal(new BlobSimulation({ count: 8, maxParticles: 8 }).restore(fragmented.snapshot()), false);
});
