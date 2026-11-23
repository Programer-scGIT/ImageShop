function colorDistance(data, pixelIndex, target) {
  const offset = pixelIndex * 4;
  const alpha = data[offset + 3];
  if (alpha <= 8 && target[3] <= 8) return 0;
  return Math.max(
    Math.abs(data[offset] - target[0]),
    Math.abs(data[offset + 1] - target[1]),
    Math.abs(data[offset + 2] - target[2]),
    Math.abs(alpha - target[3])
  );
}

function filterRows(source, target, width, height, radius, dilate) {
  const windowSize = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let count = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      count += source[row + Math.max(0, Math.min(width - 1, offset))];
    }
    for (let x = 0; x < width; x++) {
      target[row + x] = dilate ? Number(count > 0) : Number(count === windowSize);
      count -= source[row + Math.max(0, Math.min(width - 1, x - radius))];
      count += source[row + Math.max(0, Math.min(width - 1, x + radius + 1))];
    }
  }
}

function filterColumns(source, target, width, height, radius, dilate) {
  const windowSize = radius * 2 + 1;
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      count += source[Math.max(0, Math.min(height - 1, offset)) * width + x];
    }
    for (let y = 0; y < height; y++) {
      target[y * width + x] = dilate ? Number(count > 0) : Number(count === windowSize);
      count -= source[Math.max(0, Math.min(height - 1, y - radius)) * width + x];
      count += source[Math.max(0, Math.min(height - 1, y + radius + 1)) * width + x];
    }
  }
}

function closeGaps(barriers, width, height, radius) {
  if (!radius) return barriers;
  const intermediate = new Uint8Array(barriers.length);
  filterRows(barriers, intermediate, width, height, radius, true);
  filterColumns(intermediate, barriers, width, height, radius, true);
  filterRows(barriers, intermediate, width, height, radius, false);
  filterColumns(intermediate, barriers, width, height, radius, false);
  return barriers;
}

function pushSpan(stackX, stackY, x, y) {
  stackX.push(x);
  stackY.push(y);
}

export function createBucketMask({ data, width, height, x, y, tolerance, grow, gapClosing, contiguous, antiAliasing }) {
  const pixelCount = width * height;
  const seedX = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const seedY = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const seedIndex = seedY * width + seedX;
  const seedOffset = seedIndex * 4;
  const target = [data[seedOffset], data[seedOffset + 1], data[seedOffset + 2], data[seedOffset + 3]];
  const barrierRadius = { none: 0, low: 1, medium: 2, high: 3 }[gapClosing] || 0;
  const edgeTolerance = Math.min(255, tolerance + 128);
  const barrierThreshold = edgeTolerance;
  const barriers = barrierRadius && contiguous ? new Uint8Array(pixelCount) : null;
  if (barriers) {
    for (let pixel = 0; pixel < pixelCount; pixel++) {
      barriers[pixel] = Number(colorDistance(data, pixel, target) > barrierThreshold);
    }
  }

  if (barriers) closeGaps(barriers, width, height, barrierRadius);
  const fillable = pixel => colorDistance(data, pixel, target) <= tolerance && (!barriers || !barriers[pixel]);
  const mask = new Uint8Array(pixelCount);

  if (!contiguous) {
    for (let pixel = 0; pixel < pixelCount; pixel++) {
      if (colorDistance(data, pixel, target) <= tolerance) mask[pixel] = 255;
    }
  } else {
    const stackX = [];
    const stackY = [];
    pushSpan(stackX, stackY, seedX, seedY);
    while (stackX.length) {
      const currentX = stackX.pop();
      const currentY = stackY.pop();
      const current = currentY * width + currentX;
      if (mask[current] || !fillable(current)) continue;

      let left = currentX;
      let right = currentX;
      while (left > 0 && !mask[currentY * width + left - 1] && fillable(currentY * width + left - 1)) left--;
      while (right < width - 1 && !mask[currentY * width + right + 1] && fillable(currentY * width + right + 1)) right++;
      for (let column = left; column <= right; column++) mask[currentY * width + column] = 255;

      for (const neighborY of [currentY - 1, currentY + 1]) {
        if (neighborY < 0 || neighborY >= height) continue;
        let inSpan = false;
        for (let column = left; column <= right; column++) {
          const neighbor = neighborY * width + column;
          if (!mask[neighbor] && fillable(neighbor)) {
            if (!inSpan) pushSpan(stackX, stackY, column, neighborY);
            inSpan = true;
          } else {
            inSpan = false;
          }
        }
      }
    }
  }

  const growRadius = Math.max(0, Math.min(10, Math.floor(grow)));
  const radius = growRadius + (antiAliasing ? 1 : 0);
  if (radius) {
    const edgeFrontier = [];
    for (let pixel = 0; pixel < pixelCount; pixel++) {
      if (!mask[pixel]) continue;
      const px = pixel % width;
      const py = Math.floor(pixel / width);
      if ((px > 0 && !mask[pixel - 1]) || (px < width - 1 && !mask[pixel + 1]) ||
          (py > 0 && !mask[pixel - width]) || (py < height - 1 && !mask[pixel + width])) {
        edgeFrontier.push(pixel);
      }
    }

    for (const pixel of edgeFrontier) {
      const px = pixel % width;
      const py = Math.floor(pixel / width);
      for (let dy = -radius; dy <= radius; dy++) {
        const yDistance = py + dy;
        if (yDistance < 0 || yDistance >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xDistance = px + dx;
          if (xDistance < 0 || xDistance >= width) continue;
          const distance = Math.hypot(dx, dy);
          if (distance > radius || distance > growRadius && !antiAliasing) continue;
          const neighbor = yDistance * width + xDistance;
          if (mask[neighbor] || (barriers && barriers[neighbor])) continue;
          const colorDifference = colorDistance(data, neighbor, target);
          if (colorDifference > edgeTolerance) continue;

          let coverage = 255;
          if (antiAliasing && (colorDifference > tolerance || distance > growRadius)) {
            const colorCoverage = colorDifference > tolerance
              ? (edgeTolerance - colorDifference) / Math.max(1, edgeTolerance - tolerance)
              : 1;
            const distanceCoverage = distance > growRadius
              ? (radius + 0.5 - distance) / Math.max(0.5, radius + 0.5 - growRadius)
              : 1;
            coverage = Math.min(255, Math.round(255 * colorCoverage * distanceCoverage));
            if (coverage < 24) continue;
          }
          mask[neighbor] = coverage;
        }
      }
    }
  }
  return mask;
}
