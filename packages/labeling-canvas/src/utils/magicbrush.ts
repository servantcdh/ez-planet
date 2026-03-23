export interface MagicBrushImage {
  data: Uint8Array;
  width: number;
  height: number;
  bytes: number;
}

export interface MagicBrushBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface MagicBrushMask {
  data: Uint8Array;
  width: number;
  height: number;
  bounds: MagicBrushBounds;
}

export interface MagicBrushBorderMask {
  data: Uint8Array;
  width: number;
  height: number;
  offset: { x: number; y: number };
}

export interface MagicBrushPoint {
  x: number;
  y: number;
}

export interface MagicBrushContour {
  inner: boolean;
  label: number;
  points: MagicBrushPoint[];
  initialCount?: number;
}

interface FloodFillScanline {
  y: number;
  left: number;
  right: number;
  dir: number;
}

function floodFillWithBorders(
  image: MagicBrushImage,
  px: number,
  py: number,
  colorThreshold: number,
  mask?: Uint8Array
): MagicBrushMask | null {
  const { data, width: w, height: h, bytes } = image;
  let maxX = -1;
  let minX = w + 1;
  let maxY = -1;
  let minY = h + 1;
  let idx = py * w + px; // start point index in the mask data
  const result = new Uint8Array(w * h);
  const visited = mask ? new Uint8Array(mask) : new Uint8Array(w * h);

  if (visited[idx] === 1) {
    return null;
  }

  idx *= bytes;
  const sampleColor = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];

  const stack: FloodFillScanline[] = [
    { y: py, left: px - 1, right: px + 1, dir: 1 },
  ];

  while (stack.length > 0) {
    const element = stack.shift();
    if (!element) {
      break;
    }
    const { y, left, right, dir } = element;
    let checkY = false;
    for (let x = left + 1; x < right; x += 1) {
      const dy = y * w;
      idx = (dy + x) * bytes;

      if (visited[dy + x] === 1) {
        continue;
      }

      checkY = true;

      result[dy + x] = 1;
      visited[dy + x] = 1;

      let c = data[idx] - sampleColor[0];
      if (c > colorThreshold || c < -colorThreshold) {
        continue;
      }
      c = data[idx + 1] - sampleColor[1];
      if (c > colorThreshold || c < -colorThreshold) {
        continue;
      }
      c = data[idx + 2] - sampleColor[2];
      if (c > colorThreshold || c < -colorThreshold) {
        continue;
      }

      let xl = x - 1;
      while (xl > -1) {
        const dyl = dy + xl;
        idx = dyl * bytes;
        if (visited[dyl] === 1) {
          break;
        }

        result[dyl] = 1;
        visited[dyl] = 1;
        xl -= 1;

        c = data[idx] - sampleColor[0];
        if (c > colorThreshold || c < -colorThreshold) {
          break;
        }
        c = data[idx + 1] - sampleColor[1];
        if (c > colorThreshold || c < -colorThreshold) {
          break;
        }
        c = data[idx + 2] - sampleColor[2];
        if (c > colorThreshold || c < -colorThreshold) {
          break;
        }
      }

      let xr = x + 1;
      while (xr < w) {
        const dyr = dy + xr;
        idx = dyr * bytes;
        if (visited[dyr] === 1) {
          break;
        }

        result[dyr] = 1;
        visited[dyr] = 1;
        xr += 1;

        c = data[idx] - sampleColor[0];
        if (c > colorThreshold || c < -colorThreshold) {
          break;
        }
        c = data[idx + 1] - sampleColor[1];
        if (c > colorThreshold || c < -colorThreshold) {
          break;
        }
        c = data[idx + 2] - sampleColor[2];
        if (c > colorThreshold || c < -colorThreshold) {
          break;
        }
      }

      if (xl < minX) {
        minX = xl + 1;
      }
      if (xr > maxX) {
        maxX = xr - 1;
      }

      let newY = y - dir;
      if (newY >= 0 && newY < h) {
        if (xl < left) {
          stack.push({ y: newY, left: xl, right: left, dir: -dir });
        }
        if (right < xr) {
          stack.push({ y: newY, left: right, right: xr, dir: -dir });
        }
      }
      newY = y + dir;
      if (newY >= 0 && newY < h && xl < xr) {
        stack.push({ y: newY, left: xl, right: xr, dir });
      }
    }

    if (checkY) {
      if (y < minY) {
        minY = y;
      }
      if (y > maxY) {
        maxY = y;
      }
    }
  }

  return {
    data: result,
    width: image.width,
    height: image.height,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
    },
  };
}

function gaussBlur(mask: MagicBrushMask, radius: number): MagicBrushMask {
  const n = radius * 2 + 1;
  const s2 = radius * radius;
  const wg = new Float32Array(n);
  let total = 0;
  const { width: w, height: h, data, bounds } = mask;
  const { minX, minY, maxX, maxY } = bounds;

  for (let i = 0; i < radius; i += 1) {
    const dsq = (radius - i) * (radius - i);
    const weight = Math.exp(-dsq / (2 * s2)) / (2 * Math.PI * s2);
    wg[radius + i] = weight;
    wg[radius - i] = weight;
    total += 2 * weight;
  }
  for (let i = 0; i < n; i += 1) {
    wg[i] /= total;
  }

  const result = new Uint8Array(w * h);
  const endX = radius + w;
  const endY = radius + h;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let val = 0;
      const k = y * w + x;
      let start = Math.max(radius - x, 0);
      let end = Math.min(endX - x, n);
      let k1 = k - radius;
      for (let i = start; i < end; i += 1) {
        val += data[k1 + i] * wg[i];
      }
      start = Math.max(radius - y, 0);
      end = Math.min(endY - y, n);
      k1 = k - radius * w;
      for (let i = start; i < end; i += 1) {
        val += data[k1 + i * w] * wg[i];
      }
      result[k] = val > 0.5 ? 1 : 0;
    }
  }

  return {
    data: result,
    width: w,
    height: h,
    bounds: { ...bounds },
  };
}

function createBorderForBlur(
  mask: MagicBrushMask,
  radius: number,
  visited?: Uint8Array
): number[] {
  const { width: w, height: h, data, bounds } = mask;
  const { minX, minY, maxX, maxY } = bounds;
  const visitedData = new Uint8Array(data);
  const len = w * h;
  const temp = new Uint8Array(len);
  const border: number[] = [];
  const x0 = Math.max(minX, 1);
  const x1 = Math.min(maxX, w - 2);
  const y0 = Math.max(minY, 1);
  const y1 = Math.min(maxY, h - 2);

  if (visited && visited.length > 0) {
    for (let k = 0; k < len; k += 1) {
      if (visited[k] === 1) {
        visitedData[k] = 1;
      }
    }
  }

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const k = y * w + x;
      if (data[k] === 0) {
        continue;
      }
      const k1 = k + w;
      const k2 = k - w;
      if (
        visitedData[k + 1] === 0 ||
        visitedData[k - 1] === 0 ||
        visitedData[k1] === 0 ||
        visitedData[k1 + 1] === 0 ||
        visitedData[k1 - 1] === 0 ||
        visitedData[k2] === 0 ||
        visitedData[k2 + 1] === 0 ||
        visitedData[k2 - 1] === 0
      ) {
        border.push(k);
      }
    }
  }

  if (minX === 0) {
    for (let y = minY; y <= maxY; y += 1) {
      if (data[y * w] === 1) {
        border.push(y * w);
      }
    }
  }
  if (maxX === w - 1) {
    for (let y = minY; y <= maxY; y += 1) {
      if (data[y * w + maxX] === 1) {
        border.push(y * w + maxX);
      }
    }
  }
  if (minY === 0) {
    for (let x = minX; x <= maxX; x += 1) {
      if (data[x] === 1) {
        border.push(x);
      }
    }
  }
  if (maxY === h - 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (data[maxY * w + x] === 1) {
        border.push(maxY * w + x);
      }
    }
  }

  const result: number[] = [];
  const endX = radius + w;
  const endY = radius + h;
  const n = radius * 2 + 1;

  for (let j = 0; j < border.length; j += 1) {
    const k = border[j];
    temp[k] = 1;
    result.push(k);
    const x = k % w;
    const y = (k - x) / w;
    let start = Math.max(radius - x, 0);
    let end = Math.min(endX - x, n);
    let k1 = k - radius;
    for (let i = start; i < end; i += 1) {
      const k2 = k1 + i;
      if (temp[k2] === 0) {
        temp[k2] = 1;
        result.push(k2);
      }
    }
    start = Math.max(radius - y, 0);
    end = Math.min(endY - y, n);
    k1 = k - radius * w;
    for (let i = start; i < end; i += 1) {
      const k2 = k1 + i * w;
      if (temp[k2] === 0) {
        temp[k2] = 1;
        result.push(k2);
      }
    }
  }

  return result;
}

function gaussBlurOnlyBorder(
  mask: MagicBrushMask,
  radius: number,
  visited?: Uint8Array
): MagicBrushMask {
  const border = createBorderForBlur(mask, radius, visited);
  const n = radius * 2 + 1;
  const s2 = 2 * radius * radius;
  const wg = new Float32Array(n);
  let total = 0;
  const { width: w, height: h, data, bounds } = mask;
  let { minX, minY, maxX, maxY } = bounds;

  for (let i = 0; i < radius; i += 1) {
    const dsq = (radius - i) * (radius - i);
    const weight = Math.exp(-dsq / s2) / Math.PI;
    wg[radius + i] = weight;
    wg[radius - i] = weight;
    total += 2 * weight;
  }
  for (let i = 0; i < n; i += 1) {
    wg[i] /= total;
  }

  const result = new Uint8Array(data);
  const endX = radius + w;
  const endY = radius + h;

  for (let i = 0; i < border.length; i += 1) {
    const k = border[i];
    let val = 0;
    const x = k % w;
    const y = (k - x) / w;
    let start = Math.max(radius - x, 0);
    let end = Math.min(endX - x, n);
    let k1 = k - radius;
    for (let j = start; j < end; j += 1) {
      val += data[k1 + j] * wg[j];
    }
    if (val > 0.5) {
      result[k] = 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      continue;
    }
    start = Math.max(radius - y, 0);
    end = Math.min(endY - y, n);
    k1 = k - radius * w;
    for (let j = start; j < end; j += 1) {
      val += data[k1 + j * w] * wg[j];
    }
    if (val > 0.5) {
      result[k] = 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else {
      result[k] = 0;
    }
  }

  return {
    data: result,
    width: w,
    height: h,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
    },
  };
}

function createBorderMask(mask: MagicBrushMask): MagicBrushBorderMask {
  const { width: w, height: h, data, bounds } = mask;
  const { minX, minY, maxX, maxY } = bounds;
  const rw = maxX - minX + 1;
  const rh = maxY - minY + 1;
  const result = new Uint8Array(rw * rh);
  const x0 = Math.max(minX, 1);
  const x1 = Math.min(maxX, w - 2);
  const y0 = Math.max(minY, 1);
  const y1 = Math.min(maxY, h - 2);

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const k = y * w + x;
      if (data[k] === 0) {
        continue;
      }
      const k1 = k + w;
      const k2 = k - w;
      if (
        data[k + 1] === 0 ||
        data[k - 1] === 0 ||
        data[k1] === 0 ||
        data[k1 + 1] === 0 ||
        data[k1 - 1] === 0 ||
        data[k2] === 0 ||
        data[k2 + 1] === 0 ||
        data[k2 - 1] === 0
      ) {
        result[(y - minY) * rw + (x - minX)] = 1;
      }
    }
  }

  if (minX === 0) {
    for (let y = minY; y <= maxY; y += 1) {
      if (data[y * w] === 1) {
        result[(y - minY) * rw] = 1;
      }
    }
  }
  if (maxX === w - 1) {
    for (let y = minY; y <= maxY; y += 1) {
      if (data[y * w + maxX] === 1) {
        result[(y - minY) * rw + (maxX - minX)] = 1;
      }
    }
  }
  if (minY === 0) {
    for (let x = minX; x <= maxX; x += 1) {
      if (data[x] === 1) {
        result[x - minX] = 1;
      }
    }
  }
  if (maxY === h - 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (data[maxY * w + x] === 1) {
        result[(maxY - minY) * rw + (x - minX)] = 1;
      }
    }
  }

  return {
    data: result,
    width: rw,
    height: rh,
    offset: { x: minX, y: minY },
  };
}

function getBorderIndices(mask: MagicBrushMask): number[] {
  const { width: w, height: h, data } = mask;
  const border: number[] = [];
  const x1 = w - 1;
  const y1 = h - 1;

  for (let y = 1; y < y1; y += 1) {
    for (let x = 1; x < x1; x += 1) {
      const k = y * w + x;
      if (data[k] === 0) {
        continue;
      }
      const k1 = k + w;
      const k2 = k - w;
      if (
        data[k + 1] === 0 ||
        data[k - 1] === 0 ||
        data[k1] === 0 ||
        data[k1 + 1] === 0 ||
        data[k1 - 1] === 0 ||
        data[k2] === 0 ||
        data[k2 + 1] === 0 ||
        data[k2 - 1] === 0
      ) {
        border.push(k);
      }
    }
  }

  for (let y = 0; y < h; y += 1) {
    if (data[y * w] === 1) {
      border.push(y * w);
    }
  }
  for (let x = 0; x < w; x += 1) {
    if (data[x] === 1) {
      border.push(x);
    }
  }
  let k = w - 1;
  for (let y = 0; y < h; y += 1) {
    if (data[y * w + k] === 1) {
      border.push(y * w + k);
    }
  }
  k = (h - 1) * w;
  for (let x = 0; x < w; x += 1) {
    if (data[k + x] === 1) {
      border.push(k + x);
    }
  }

  return border;
}

function prepareMask(mask: MagicBrushMask) {
  const { width: w, data, bounds } = mask;
  const { minX, minY, maxX, maxY } = bounds;
  const rw = maxX - minX + 3;
  const rh = maxY - minY + 3;
  const result = new Uint8Array(rw * rh);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (data[y * w + x] === 1) {
        result[(y - minY + 1) * rw + (x - minX + 1)] = 1;
      }
    }
  }

  return {
    data: result,
    width: rw,
    height: rh,
    offset: { x: minX - 1, y: minY - 1 },
  };
}

function traceContours(mask: MagicBrushMask): MagicBrushContour[] {
  const prepared = prepareMask(mask);
  const contours: MagicBrushContour[] = [];
  let label = 0;
  const w = prepared.width;
  const w2 = w * 2;
  const h = prepared.height;
  const src = prepared.data;
  const dx = prepared.offset.x;
  const dy = prepared.offset.y;
  const dest = new Uint8Array(src);

  const directions: MagicBrushPoint[] = [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
  ];

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const k = y * w + x;
      if (src[k] !== 1) {
        continue;
      }
      for (let offset = -w; offset < w2; offset += w2) {
        if (src[k + offset] === 0 && dest[k + offset] === 0) {
          const inner = offset === w;
          label += 1;

          const contourPoints: MagicBrushPoint[] = [];
          let dir = inner ? 2 : 6;
          let current: MagicBrushPoint | null = { x, y };
          let previous: MagicBrushPoint = current;
          const first = { x, y };
          let second: MagicBrushPoint | null = null;

          while (current) {
            dest[current.y * w + current.x] = label;
            let next: MagicBrushPoint | null = null;
            for (let d = 0; d < 8; d += 1) {
              dir = (dir + 1) % 8;
              const delta = directions[dir];
              const candidate: MagicBrushPoint = {
                x: current.x + delta.x,
                y: current.y + delta.y,
              };
              const k1 = candidate.y * w + candidate.x;
              if (src[k1] === 1) {
                dest[k1] = label;
                next = candidate;
                break;
              }
              dest[k1] = -1;
            }
            if (!next) {
              break;
            }
            current = next;
            if (second) {
              if (
                previous.x === first.x &&
                previous.y === first.y &&
                current.x === second.x &&
                current.y === second.y
              ) {
                break;
              }
            } else {
              second = next;
            }
            contourPoints.push({ x: previous.x + dx, y: previous.y + dy });
            previous = current;
            dir = (dir + 4) % 8;
          }

          if (current) {
            contourPoints.push({ x: first.x + dx, y: first.y + dy });
            contours.push({
              inner,
              label,
              points: contourPoints,
            });
          }
        }
      }
    }
  }

  return contours;
}

function simplifyContours(
  contours: MagicBrushContour[],
  simplifyTolerant: number,
  simplifyCount: number
): MagicBrushContour[] {
  const result: MagicBrushContour[] = [];

  contours.forEach((contour) => {
    const points = contour.points;
    const len = points.length;
    if (len < simplifyCount) {
      result.push({
        ...contour,
        points: points.map((point) => ({ ...point })),
        initialCount: len,
      });
      return;
    }

    const lst = [0, len - 1];
    const stack: Array<{ first: number; last: number }> = [
      { first: 0, last: len - 1 },
    ];

    while (stack.length > 0) {
      const ids = stack.shift();
      if (!ids || ids.last <= ids.first + 1) {
        continue;
      }
      let maxd = -1;
      let maxi = ids.first;
      for (let i = ids.first + 1; i < ids.last; i += 1) {
        const pi = points[i];
        const pf = points[ids.first];
        const pl = points[ids.last];

        const dx1 = pi.x - pf.x;
        const dy1 = pi.y - pf.y;
        const r1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const dx2 = pi.x - pl.x;
        const dy2 = pi.y - pl.y;
        const r2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const dx12 = pf.x - pl.x;
        const dy12 = pf.y - pl.y;
        const r12 = Math.sqrt(dx12 * dx12 + dy12 * dy12);

        let dist: number;
        if (r1 >= Math.sqrt(r2 * r2 + r12 * r12)) {
          dist = r2;
        } else if (r2 >= Math.sqrt(r1 * r1 + r12 * r12)) {
          dist = r1;
        } else {
          dist = Math.abs(
            (dy12 * pi.x - dx12 * pi.y + pf.x * pl.y - pl.x * pf.y) / r12
          );
        }

        if (dist > maxd) {
          maxi = i;
          maxd = dist;
        }
      }

      if (maxd > simplifyTolerant) {
        lst.push(maxi);
        stack.push({ first: ids.first, last: maxi });
        stack.push({ first: maxi, last: ids.last });
      }
    }

    lst.sort((a, b) => a - b);
    const resPoints = lst.map((index) => ({ ...points[index] }));
    result.push({
      ...contour,
      points: resPoints,
      initialCount: contour.points.length,
    });
  });

  return result;
}

export const MagicBrush = {
  floodFill(
    image: MagicBrushImage,
    px: number,
    py: number,
    colorThreshold: number,
    mask?: Uint8Array
  ): MagicBrushMask | null {
    return floodFillWithBorders(image, px, py, colorThreshold, mask);
  },
  gaussBlur,
  gaussBlurOnlyBorder,
  createBorderMask,
  getBorderIndices,
  traceContours,
  simplifyContours,
};
