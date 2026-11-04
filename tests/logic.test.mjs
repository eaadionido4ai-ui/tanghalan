// Checks the rules of the two game rooms (src/rooms/logic.js). Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, CAPACITY, gobag, fire } from '../src/rooms/logic.js';

// a repeatable "random" so a failing round can be replayed
const seeded = (n) => () => { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646; };

test('the items: unique, each with a name, an icon, a note and a weight', () => {
  const ids = new Set(ITEMS.map((x) => x.id));
  assert.equal(ids.size, ITEMS.length);
  for (const it of ITEMS) {
    assert.ok(it.name && it.icon && it.info, it.id);
    assert.ok(Number.isInteger(it.weight) && it.weight > 0, it.id);
  }
  assert.ok(ITEMS.filter((x) => x.good).length >= 9, 'enough useful things for a round');
  assert.ok(ITEMS.filter((x) => !x.good).length >= 5, 'enough things that could stay home');
});

test('a round has 9 useful things and 5 that could stay home, none twice', () => {
  for (let k = 1; k <= 50; k++) {
    const round = gobag.buildRound(undefined, undefined, seeded(k));
    assert.equal(round.length, 14);
    assert.equal(new Set(round.map((x) => x.id)).size, 14);
    assert.equal(round.filter((x) => x.good).length, 9);
    assert.equal(round.filter((x) => !x.good).length, 5);
  }
});

test('the 14 things fit the slots of both layouts', () => {
  assert.equal([5, 5, 4].reduce((a, b) => a + b), 14, 'three tables on Easy');
  assert.equal([4, 4, 3, 3].reduce((a, b) => a + b), 14, 'cabinet, drawers, crate and cooler on Difficult');
});

test('the bag: weight adds up, and more than the limit is too heavy', () => {
  const water = gobag.byId('water'), food = gobag.byId('food');
  assert.equal(gobag.bagWeight([water, food]), water.weight + food.weight);
  assert.equal(gobag.isOverCapacity([water, food]), false);
  const heavy = ITEMS.slice().sort((a, b) => b.weight - a.weight);
  const pile = [];
  while (gobag.bagWeight(pile) <= CAPACITY) pile.push(heavy[pile.length]);
  assert.equal(gobag.isOverCapacity(pile), true);
});

test('packing every useful thing and nothing else earns 3 stars', () => {
  const round = gobag.buildRound(undefined, undefined, seeded(7));
  const r = gobag.scoreRound(round, round.filter((x) => x.good).map((x) => x.id));
  assert.deepEqual(r, { totalGood: 9, packedGood: 9, missedGood: 0, wrongPacks: 0 });
  assert.equal(gobag.rateStars(r), 3);
});

test('packing everything costs a star; packing too little earns fewer stars', () => {
  const round = gobag.buildRound(undefined, undefined, seeded(11));
  const all = gobag.scoreRound(round, round.map((x) => x.id));
  assert.equal(all.wrongPacks, 5);
  assert.equal(gobag.rateStars(all), 2);
  const good = round.filter((x) => x.good).map((x) => x.id);
  assert.equal(gobag.rateStars(gobag.scoreRound(round, good.slice(0, 6))), 2);
  assert.equal(gobag.rateStars(gobag.scoreRound(round, good.slice(0, 3))), 1);
  assert.equal(gobag.rateStars(gobag.scoreRound(round, [])), 1);
});

test('the extinguisher does nothing until the pin is pulled, or once it is empty', () => {
  assert.equal(fire.extinguishRate({ pinPulled: false, aimAtBase: true, sweeping: true, distance: 2.5 }), 0);
  assert.equal(fire.extinguishRate({ pinPulled: true, aimAtBase: true, sweeping: true, distance: 2.5, agentLeft: 0 }), 0);
});

test('aiming low and sweeping from a safe distance works best', () => {
  const best = fire.extinguishRate({ pinPulled: true, aimAtBase: true, sweeping: true, distance: 2.5 });
  assert.equal(best, 1.5);
  assert.ok(fire.extinguishRate({ pinPulled: true, aimAtBase: false, sweeping: true, distance: 2.5 }) < best);
  assert.ok(fire.extinguishRate({ pinPulled: true, aimAtBase: true, sweeping: false, distance: 2.5 }) < best);
  assert.ok(fire.extinguishRate({ pinPulled: true, aimAtBase: true, sweeping: true, distance: 0.6 }) < best, 'too close');
  assert.ok(fire.extinguishRate({ pinPulled: true, aimAtBase: true, sweeping: true, distance: 5.5 }) < best, 'too far');
});

test('the fire grows back unless it is being fought at the base', () => {
  assert.equal(fire.growth({ pinPulled: true, spraying: true, aimAtBase: true, agentLeft: 50 }), 0);
  assert.equal(fire.growth({ pinPulled: true, spraying: true, aimAtBase: false, agentLeft: 50 }), 2.2);
  assert.equal(fire.growth({ pinPulled: true, spraying: false, aimAtBase: true, agentLeft: 50 }), 2.2);
  assert.equal(fire.growth({ pinPulled: true, spraying: true, aimAtBase: true, agentLeft: 0 }), 2.2);
});

test('the hints follow P, A, S, S in order', () => {
  assert.equal(fire.nextHint({}), 'Pull the safety pin first.');
  assert.equal(fire.nextHint({ pinPulled: true, distance: 6 }), 'Step a little closer.');
  assert.equal(fire.nextHint({ pinPulled: true, distance: 0.5 }), 'Not too close. Step back a step.');
  assert.equal(fire.nextHint({ pinPulled: true, distance: 2.5 }), 'Hold the Squeeze button.');
  assert.equal(fire.nextHint({ pinPulled: true, distance: 2.5, spraying: true }), 'Aim low, at the base of the fire.');
  assert.equal(fire.nextHint({ pinPulled: true, distance: 2.5, spraying: true, aimAtBase: true }), 'Sweep from side to side.');
  assert.equal(fire.nextHint({ pinPulled: true, distance: 2.5, spraying: true, aimAtBase: true, sweeping: true }), 'Great, keep sweeping the base!');
  assert.equal(fire.nextHint({ pinPulled: true, agentLeft: 0 }), 'The extinguisher is empty.');
});

test('fire stars: slow on Difficult or poor aim cost a star each', () => {
  assert.equal(fire.rateStars({ timeSec: 12, aimAccuracy: 0.95, easy: false }), 3);
  assert.equal(fire.rateStars({ timeSec: 30, aimAccuracy: 0.95, easy: false }), 2);
  assert.equal(fire.rateStars({ timeSec: 30, aimAccuracy: 0.95, easy: true }), 3, 'no clock on Easy');
  assert.equal(fire.rateStars({ timeSec: 30, aimAccuracy: 0.5, easy: false }), 1);
});

test('a good technique puts out a full fire before a Difficult extinguisher runs out', () => {
  // the room's numbers: the fire drops by rate x DROP a second, the extinguisher empties at AGENT_USE a second
  const secsToOut = 100 / (1.5 * fire.DROP), secsOfAgent = 100 / fire.AGENT_USE;
  assert.ok(secsToOut < secsOfAgent, secsToOut + ' s to put it out, ' + secsOfAgent + ' s of spray');
  // aiming too high: it never goes out before the extinguisher is empty
  const offTarget = fire.extinguishRate({ pinPulled: true, aimAtBase: false, sweeping: false, distance: 2.5 }) * fire.DROP - 2.2;
  assert.ok(offTarget < 0, 'the fire wins when you aim too high');
});
