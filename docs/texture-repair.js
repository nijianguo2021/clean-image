'use strict';

// Conservative exemplar refinement. Mutates target only where mask is nonzero.
// It is not a semantic reconstruction model: ambiguous / thick holes retain target.
function refineTexture(target, source, mask, width, height, options = {}) {
  const started = Date.now(), deadline = started + (options.timeLimitMs ?? 300);
  const stats = {pixels: target, confidence: 0, acceptedPixels: 0, acceptedRegions: 0, examinedRegions: 0, reason: 'no-confident-match'};
  const n = width * height, maxPixels = options.maxMaskedPixels ?? 30000;
  if (mask.length !== n || source.length !== n * 4 || target.length !== n * 4) throw Error('Invalid texture refinement dimensions');
  let count = 0;
  for (let p = 0; p < n; p++) if (mask[p]) count++;
  if (!count || count > maxPixels) { stats.reason = !count ? 'empty-mask' : 'mask-budget'; return stats; }
  const visited = new Uint8Array(n), queue = new Int32Array(count);
  let confidenceSum = 0;
  const searchRadius = options.searchRadius ?? 80, offsets = [];
  for (let d = 4; d <= searchRadius; d += 4) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) offsets.push([dx, dy]);
  for (let d = 8; d <= searchRadius; d += 16) for (const [dx, dy] of [[d, d], [-d, d], [d, -d], [-d, -d]]) offsets.push([dx, dy]);
  for (let root = 0; root < n; root++) {
    if (!mask[root] || visited[root]) continue;
    if (Date.now() >= deadline || stats.examinedRegions >= 32) { stats.reason = 'budget'; break; }
    let head = 0, tail = 1, x0 = width, y0 = height, x1 = -1, y1 = -1;
    queue[0] = root; visited[root] = 1;
    while (head < tail) {
      const p = queue[head++], x = p % width, y = Math.floor(p / width);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const q of [x ? p - 1 : -1, x + 1 < width ? p + 1 : -1, y ? p - width : -1, y + 1 < height ? p + width : -1]) {
        if (q >= 0 && mask[q] && !visited[q]) { visited[q] = 1; queue[tail++] = q; }
      }
    }
    stats.examinedRegions++;
    if (tail < 6 || tail > 3000 || x1 - x0 > 128 || y1 - y0 > 128 || x0 < 3 || y0 < 3 || x1 + 3 >= width || y1 + 3 >= height) continue;
    const pixels = Array.from(queue.subarray(0, tail)), borderSet = new Set(), seam = [];
    let narrow = true;
    for (const p of pixels) {
      const x = p % width, y = Math.floor(p / width);
      let nearest = false;
      for (let d = 1; d <= 4 && !nearest; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < width && yy >= 0 && yy < height && !mask[yy * width + xx]) { nearest = true; break; }
      }
      if (!nearest) { narrow = false; break; }
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const q = p + dy * width + dx;
        if (!mask[q]) borderSet.add(q);
      }
      for (const d of [-1, 1, -width, width]) {
        if (!mask[p + d] && !mask[p + 2 * d]) seam.push([p, p + d, p + 2 * d]);
      }
    }
    if (!narrow || borderSet.size < 16 || seam.length < 12) continue;
    const allBorder = [...borderSet], step = Math.max(1, Math.ceil(allBorder.length / 128));
    const border = allBorder.filter((_, i) => i % step === 0);
    const train = border.filter((_, i) => i % 3 !== 0), validation = border.filter((_, i) => i % 3 === 0);
    let mean = 0, square = 0;
    for (const p of border) { const l = (source[p * 4] + 2 * source[p * 4 + 1] + source[p * 4 + 2]) / 4; mean += l; square += l * l; }
    const texture = Math.sqrt(Math.max(0, square / border.length - (mean / border.length) ** 2));
    if (texture < 4) continue;
    const candidates = [];
    for (let index = 0; index < offsets.length; index++) {
      if ((index & 7) === 0 && Date.now() >= deadline) break;
      const [dx, dy] = offsets[index];
      if (x0 + dx < 3 || y0 + dy < 3 || x1 + dx + 3 >= width || y1 + dy + 3 >= height) continue;
      const shift = dy * width + dx;
      if (border.some(p => mask[p + shift])) continue;
      const correction = [0, 0, 0];
      for (const p of train) for (let c = 0; c < 3; c++) correction[c] += source[p * 4 + c] - source[(p + shift) * 4 + c];
      for (let c = 0; c < 3; c++) correction[c] /= train.length;
      if (correction.some(c => Math.abs(c) > 12)) continue;
      let trainError = 0, validationError = 0;
      for (const p of train) for (let c = 0; c < 3; c++) trainError += (source[(p + shift) * 4 + c] + correction[c] - source[p * 4 + c]) ** 2;
      for (const p of validation) for (let c = 0; c < 3; c++) validationError += (source[(p + shift) * 4 + c] + correction[c] - source[p * 4 + c]) ** 2;
      trainError = Math.sqrt(trainError / (train.length * 3)); validationError = Math.sqrt(validationError / (validation.length * 3));
      if (trainError > 5 || validationError > 6 || validationError > trainError * 1.7 + 1) continue;
      if (pixels.some(p => mask[p + shift])) continue;
      candidates.push({shift, correction, error: Math.max(trainError, validationError), score: Math.max(trainError, validationError) + (Math.abs(dx) + Math.abs(dy)) * .001});
    }
    candidates.sort((a, b) => a.score - b.score);
    const best = candidates[0];
    if (!best) continue;
    let ambiguous = false, donorAgreement = Infinity;
    const second = candidates[1];
    if (second && second.error < best.error * 1.3 + 1) {
      let disagreement = 0;
      for (const p of pixels) for (let c = 0; c < 3; c++) disagreement += (source[(p + best.shift) * 4 + c] + best.correction[c] - source[(p + second.shift) * 4 + c] - second.correction[c]) ** 2;
      donorAgreement = Math.sqrt(disagreement / (pixels.length * 3));
      ambiguous = donorAgreement > 8;
    }
    if (ambiguous) continue;
    let modelSeam = 0, donorSeam = 0;
    for (const [p, q, r] of seam) for (let c = 0; c < 3; c++) {
      const continuation = 2 * source[q * 4 + c] - source[r * 4 + c];
      modelSeam += (target[p * 4 + c] - continuation) ** 2;
      donorSeam += (source[(p + best.shift) * 4 + c] + best.correction[c] - continuation) ** 2;
    }
    modelSeam = Math.sqrt(modelSeam / (seam.length * 3)); donorSeam = Math.sqrt(donorSeam / (seam.length * 3));
    // Two independently shifted patches agreeing almost exactly is stronger
    // evidence for periodic metal/wood lines than a smooth-boundary heuristic.
    const exactConsensus = second && best.error < 1 && second.error < 1 && donorAgreement < 2;
    if (!exactConsensus && (modelSeam - donorSeam < 2 || donorSeam > modelSeam * .75 || donorSeam > 10)) continue;
    let change = 0;
    for (const p of pixels) for (let c = 0; c < 3; c++) change += (target[p * 4 + c] - source[(p + best.shift) * 4 + c] - best.correction[c]) ** 2;
    if (Math.sqrt(change / (pixels.length * 3)) < 2) continue;
    const confidence = exactConsensus ? (1 - best.error / 3) * (1 - donorAgreement / 4) : Math.max(0, Math.min(1, 1 - best.error / 8)) * Math.max(0, 1 - donorSeam / (modelSeam + 1));
    if (confidence < .5) continue;
    for (const p of pixels) for (let c = 0; c < 3; c++) target[p * 4 + c] = Math.max(0, Math.min(255, Math.round(source[(p + best.shift) * 4 + c] + best.correction[c])));
    stats.acceptedPixels += pixels.length; stats.acceptedRegions++; confidenceSum += confidence * pixels.length;
  }
  stats.confidence = stats.acceptedPixels ? confidenceSum / stats.acceptedPixels : 0;
  if (stats.acceptedPixels && stats.reason !== 'budget') stats.reason = 'refined';
  stats.elapsedMs = Date.now() - started;
  return stats;
}

if (typeof module !== 'undefined') module.exports = {refineTexture};
