import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BlobSimulation, type Vector } from "../src/lib/blob-physics.ts";
import { PewMode, PELLET_SPEED } from "../src/lib/blob-pew.ts";

function fixture(positions: Vector[] = [[0, 0, 0]]) {
  const simulation = new BlobSimulation({ count: positions.length });
  simulation.particles.forEach((particle, i) => {
    particle.position = [...positions[i]];
    particle.velocity = [0, 0, 0];
  });
  const pew = new PewMode(simulation);
  pew.setHome(true);
  for (const key of "pew") pew.type(key);
  return { simulation, pew };
}

function advance(pew: PewMode, seconds: number, dt = 1 / 60) {
  for (let time = 0; time < seconds - 1e-8; time += dt) pew.step(Math.min(dt, seconds - time));
}

test("pew activation and partial typing are Home-only and reset on every departure", () => {
  const { pew } = fixture();
  pew.start();
  assert.equal(pew.pellets.length, 1);
  pew.setHome(false);
  assert.equal(pew.active, false);
  assert.equal(pew.firing, false);
  assert.equal(pew.pellets.length, 0);
  for (const key of "pew") pew.type(key);
  pew.setHome(true);
  pew.start();
  assert.equal(pew.active, false);
  assert.equal(pew.pellets.length, 0);
  for (const key of "pe") pew.type(key);
  pew.setHome(false);
  pew.setHome(true);
  pew.type("w");
  assert.equal(pew.active, false);
  for (const key of "PEW") pew.type(key);
  assert.equal(pew.active, true);
  pew.type("Escape");
  assert.equal(pew.active, false);
});

test("holding fires immediately and at ten shots per second across refresh rates", () => {
  for (const dt of [1 / 10, 1 / 30, 1 / 60, 1 / 144]) {
    const { pew } = fixture();
    pew.setAim([20, 20]);
    pew.start();
    advance(pew, .99, dt);
    assert.equal(pew.pellets.length, 10);
    const ages = pew.pellets.map((pellet) => pellet.age);
    ages.slice(1).forEach((age, i) => assert.ok(Math.abs(ages[i] - age - .1) < 1e-8));
    pew.stop();
    advance(pew, .2, dt);
    assert.equal(pew.pellets.length, 10);
    advance(pew, 1.5, dt);
    assert.equal(pew.pellets.length, 0);
  }
});

test("pellets travel from below the camera before a surface impact splits and pushes a blob", () => {
  const { simulation, pew } = fixture();
  pew.start();
  pew.stop();
  assert.deepEqual(pew.pellets[0].position, [0, -.28, 3.65]);
  assert.ok(Math.abs(Math.hypot(...pew.pellets[0].velocity) - PELLET_SPEED) < 1e-8);
  assert.equal(simulation.particles.length, 1);
  advance(pew, .1);
  assert.equal(simulation.particles.length, 1);
  assert.equal(pew.pellets.length, 1);
  advance(pew, .3);
  assert.equal(pew.pellets.length, 0);
  assert.equal(simulation.particles.length, 2);
  assert.ok(simulation.particles.every((particle) => Math.hypot(...particle.impulse) > 0));
  assert.ok(Math.abs(simulation.particles.reduce((sum, particle) => sum + particle.volume, 0) - simulation.roots[0].volume) < 1e-10);

  const clicked = fixture().simulation;
  clicked.burstAt([0, 0]);
  // Pellet impacts separate fragments faster while retaining the eased onset.
  assert.deepEqual(simulation.particles.map((particle) => particle.velocity), clicked.particles.map((particle) => particle.velocity));
  for (let i = 0; i < 7; i++) {
    simulation.step(1 / 120);
    clicked.step(1 / 120);
  }
  simulation.particles.forEach((particle, i) => {
    const ratio = Math.hypot(...particle.velocity) / Math.hypot(...clicked.particles[i].velocity);
    assert.ok(ratio > 1.2 && ratio < 1.3, `Expected a modest pellet velocity boost, got ${ratio}`);
  });
});

test("the first blob absorbs a pellet and protects a separate blob behind it", () => {
  const { simulation, pew } = fixture([[0, 0, -1], [0, 0, 1.5]]);
  const behind = structuredClone(simulation.particles[0]);
  pew.start();
  pew.stop();
  advance(pew, .6);
  assert.equal(pew.pellets.length, 0);
  assert.deepEqual(simulation.particles[0], behind);
  assert.equal(simulation.particles.filter((particle) => particle.root === 1).length, 2);
});

test("a swept flight hits a bridge and does not burst surfaces beyond the traveled segment", () => {
  const { simulation } = fixture();
  assert.deepEqual(simulation.burstAlong([0, 0, 4], [0, 0, 3]), []);
  assert.deepEqual(simulation.burstAlong([0, 0, 3], [0, 0, 3]), []);
  assert.deepEqual(simulation.burstAlong([0, 0, 1], [0, 0, -1]), [0, 1]);
  const two = new BlobSimulation({ count: 2 });
  two.particles[0].position = [-two.roots[0].radius - .1, 0, 0];
  two.particles[1].position = [two.roots[1].radius + .1, 0, 0];
  assert.deepEqual(two.burstAlong([0, 0, 1], [0, 0, -1]), [0, 1]);
});

test("a swept pellet pushes minimum-size fragments without tunneling or splitting again", () => {
  const { simulation } = fixture();
  for (let level = 0; level < 5; level++) {
    simulation.particles.forEach((particle, i) => {
      particle.position = i === 0 ? [0, 0, 0] : [10 + i, 10, 0];
      particle.displayVolume = particle.volume;
    });
    simulation.burstAt([0, 0]);
  }
  simulation.particles.forEach((particle, i) => {
    particle.position = i === 0 ? [0, 0, 0] : [10 + i, 10, 0];
    particle.displayVolume = particle.volume;
    particle.impulse = [0, 0, 0];
  });
  const count = simulation.particles.length;
  assert.deepEqual(simulation.burstAlong([0, 0, .6], [0, 0, -.6]), [0]);
  assert.equal(simulation.particles.length, count);
  assert.ok(Math.hypot(...simulation.particles[0].impulse) > 0);
});

test("a continuous miss stream stays bounded and contains only finite projectiles", () => {
  const { pew } = fixture();
  pew.setAim([20, 20]);
  pew.start();
  advance(pew, 20);
  assert.ok(pew.pellets.length >= 13 && pew.pellets.length <= 15);
  assert.ok(pew.pellets.every((pellet) => [...pellet.position, ...pellet.velocity].every(Number.isFinite)));
});
