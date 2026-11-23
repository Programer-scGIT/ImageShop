import { createBucketMask } from "./bucket-algorithm.js";

self.onmessage = event => {
  const { id, data, width, height, x, y, tolerance, grow, gapClosing, contiguous, antiAliasing } = event.data;
  try {
    const mask = createBucketMask({ data: new Uint8ClampedArray(data), width, height, x, y, tolerance, grow, gapClosing, contiguous, antiAliasing });
    self.postMessage({ id, mask: mask.buffer }, [mask.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
