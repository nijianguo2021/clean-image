'use strict';
const assert = require('node:assert/strict');
const {refineTexture} = require('./public/texture-repair.js');
const w = 256, h = 160;
function make(kind) {
  const clean = new Uint8ClampedArray(w * h * 4), mask = new Uint8Array(w * h);
  let seed = 42;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = kind === 'noise' ? (seed >>> 24) : kind === 'flat' ? 120 : 110 + 18 * Math.sin(y * Math.PI / 24) + (kind === 'natural' ? 6 * Math.sin(.08 * y + .013 * x) + 2 * Math.cos(.19 * x + .07 * y) + .03 * x : 3 * Math.cos(x * Math.PI / 8)) + (kind === 'metal' && y > 66 && y < 75 ? 36 : 0);
    clean.set([value + 15, value + 2, value - 10, 255], p * 4);
    if (x >= 52 && x < 205 && y >= 60 && y < 88) {
      const dx = (x - 52) % 52, dy = y - 60;
      if (dx < 3 || (dx < 18 && (dy < 3 || (dy > 11 && dy < 15) || dy > 24))) mask[p] = 1;
    }
  }
  const source = clean.slice(), target = clean.slice();
  for (let p = 0; p < mask.length; p++) if (mask[p]) {
    source.set([5, 5, 5, 255], p * 4);
    target.set([132, 119, 107, 255], p * 4);
  }
  return {clean, source, target, mask};
}
function mse(pixels, clean, mask) { let error = 0, count = 0; for (let p = 0; p < mask.length; p++) if (mask[p]) for (let c = 0; c < 3; c++) { error += (pixels[p * 4 + c] - clean[p * 4 + c]) ** 2; count++; } return error / count; }
for (const kind of ['wood', 'metal', 'natural', 'noise', 'flat']) {
  const {clean, source, target, mask} = make(kind), before = target.slice(), sourceCopy = source.slice();
  const initial = mse(target, clean, mask), result = refineTexture(target, source, mask, w, h), final = mse(result.pixels, clean, mask);
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) assert.deepEqual(result.pixels.slice(p * 4, p * 4 + 4), before.slice(p * 4, p * 4 + 4));
    assert.equal(result.pixels[p * 4 + 3], before[p * 4 + 3]);
  }
  assert.deepEqual(source, sourceCopy);
  if (kind === 'wood' || kind === 'metal' || kind === 'natural') { assert.ok(result.acceptedPixels > 0); assert.ok(final < initial * .25, `${kind} ${initial} -> ${final}`); }
  if (kind === 'noise' || kind === 'flat') { assert.equal(result.acceptedPixels, 0); assert.deepEqual(target, before); }
  console.log(JSON.stringify({kind, initialMSE: initial, finalMSE: final, accepted: result.acceptedPixels, regions: result.acceptedRegions, confidence: result.confidence, elapsedMs: result.elapsedMs, reason: result.reason}));
}
const fixture = make('wood'), before = fixture.target.slice();
const budget = refineTexture(fixture.target, fixture.source, fixture.mask, w, h, {timeLimitMs: 0});
assert.equal(budget.acceptedPixels, 0); assert.deepEqual(fixture.target, before);
const fullMask = new Uint8Array(w * h).fill(1), all = refineTexture(before.slice(), fixture.source, fullMask, w, h);
assert.equal(all.acceptedPixels, 0); assert.equal(all.reason, 'mask-budget');
const perfect = fixture.clean.slice(), alreadyCorrect = refineTexture(perfect, fixture.source, fixture.mask, w, h);
assert.equal(alreadyCorrect.acceptedPixels, 0); assert.deepEqual(perfect, fixture.clean);
const thickMask = new Uint8Array(w * h);
for (let y = 50; y < 70; y++) for (let x = 90; x < 110; x++) thickMask[y * w + x] = 1;
const thickResult = refineTexture(before.slice(), fixture.source, thickMask, w, h);
assert.equal(thickResult.acceptedPixels, 0); assert.deepEqual(thickResult.pixels, before);
const edgeMask = new Uint8Array(w * h); edgeMask.fill(1, 0, 40);
const edgeResult = refineTexture(before.slice(), fixture.source, edgeMask, w, h);
assert.equal(edgeResult.acceptedPixels, 0); assert.deepEqual(edgeResult.pixels, before);
console.log('PASS: texture gain, exact outside-mask and alpha preservation, original untouched, ambiguous/flat fallback, budget fallback.');
