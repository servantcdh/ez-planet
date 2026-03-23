interface SLICOptions {
  regionSize: number;
  minRegionSize: number;
  maxIterations: number;
}

interface SLICEdgeRenderOptions {
  foreground?: number[];
  background?: number[];
}

export type SLICResult = ImageData & { numSegments: number };

export class SLIC {
  public readonly result: SLICResult;

  private readonly imageData: ImageData;
  private readonly regionSize: number;
  private readonly minRegionSize: number;
  private readonly maxIterations: number;
  private readonly boundaryColor: [number, number, number];
  private readonly boundaryAlpha: number;
  private readonly visualizationAlpha: number;
  private readonly highlightAlpha: number;
  private currentPixels: number[] | null = null;
  public pixelIndex: number[][] = [];

  constructor(imageData: ImageData, options: Partial<SLICOptions> = {}) {
    this.imageData = imageData;
    this.regionSize = options.regionSize ?? 16;
    this.minRegionSize =
      options.minRegionSize ?? Math.round(this.regionSize * 0.8);
    this.maxIterations = options.maxIterations ?? 10;
    this.boundaryColor = [255, 255, 255];
    this.boundaryAlpha = 127;
    this.visualizationAlpha = 144;
    this.highlightAlpha = Math.min(255, this.visualizationAlpha + 128);
    this.result = this.computeSLICSegmentation(
      this.imageData,
      this.regionSize,
      this.minRegionSize,
      this.maxIterations
    );
  }

  private rgb2xyz(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
    const xyz = new Float32Array(3 * w * h);
    const gamma = 2.2;
    for (let i = 0; i < w * h; i += 1) {
      const r = Math.pow(rgba[4 * i] * 0.00392156862, gamma);
      const g = Math.pow(rgba[4 * i + 1] * 0.00392156862, gamma);
      const b = Math.pow(rgba[4 * i + 2] * 0.00392156862, gamma);
      xyz[i] = r * 0.488718 + g * 0.31068 + b * 0.200602;
      xyz[i + w * h] = r * 0.176204 + g * 0.812985 + b * 0.0108109;
      xyz[i + 2 * w * h] = g * 0.0102048 + b * 0.989795;
    }
    return xyz;
  }

  private xyz2lab(xyz: Float32Array, w: number, h: number): Float32Array {
    const labData = new Float32Array(3 * w * h);
    const xw = 1 / 3;
    const yw = 1 / 3;
    const Yw = 1;
    const Xw = xw / yw;
    const Zw = (1 - xw - yw) / (yw * Yw);
    const ix = 1 / Xw;
    const iy = 1 / Yw;
    const iz = 1 / Zw;

    const f = (value: number) =>
      value > 0.00856
        ? Math.pow(value, 1 / 3)
        : 7.78706891568 * value + 0.1379310336;

    for (let i = 0; i < w * h; i += 1) {
      const fx = f(xyz[i] * ix);
      const fy = f(xyz[w * h + i] * iy);
      const fz = f(xyz[2 * w * h + i] * iz);
      labData[i] = 116 * fy - 16;
      labData[i + w * h] = 500 * (fx - fy);
      labData[i + 2 * w * h] = 200 * (fy - fz);
    }
    return labData;
  }

  private computeEdge(
    image: Float32Array,
    edgeMap: Float32Array,
    w: number,
    h: number
  ) {
    for (let channel = 0; channel < 3; channel += 1) {
      for (let y = 1; y < h - 1; y += 1) {
        for (let x = 1; x < w - 1; x += 1) {
          const a = image[channel * w * h + y * w + x - 1];
          const b = image[channel * w * h + y * w + x + 1];
          const c = image[channel * w * h + (y + 1) * w + x];
          const d = image[channel * w * h + (y - 1) * w + x];
          edgeMap[y * w + x] += (a - b) ** 2 + (c - d) ** 2;
        }
      }
    }
  }

  private initializeKmeansCenters(
    image: Float32Array,
    edgeMap: Float32Array,
    centers: Float32Array,
    clusterParams: Float32Array,
    numRegionsX: number,
    numRegionsY: number,
    regionSize: number,
    imW: number,
    imH: number
  ) {
    let centerIndex = 0;
    let clusterIndex = 0;
    for (let v = 0; v < numRegionsY; v += 1) {
      for (let u = 0; u < numRegionsX; u += 1) {
        let centerX = 0;
        let centerY = 0;
        let minEdgeValue = Infinity;

        let x = Math.round(regionSize * (u + 0.5));
        let y = Math.round(regionSize * (v + 0.5));
        x = Math.max(Math.min(x, imW - 1), 0);
        y = Math.max(Math.min(y, imH - 1), 0);

        for (
          let yp = Math.max(0, y - 1);
          yp <= Math.min(imH - 1, y + 1);
          yp += 1
        ) {
          for (
            let xp = Math.max(0, x - 1);
            xp <= Math.min(imW - 1, x + 1);
            xp += 1
          ) {
            const thisEdgeValue = edgeMap[yp * imW + xp];
            if (thisEdgeValue < minEdgeValue) {
              minEdgeValue = thisEdgeValue;
              centerX = xp;
              centerY = yp;
            }
          }
        }

        centers[centerIndex++] = centerX;
        centers[centerIndex++] = centerY;
        centers[centerIndex++] = image[centerY * imW + centerX];
        centers[centerIndex++] = image[imW * imH + centerY * imW + centerX];
        centers[centerIndex++] = image[2 * imW * imH + centerY * imW + centerX];

        clusterParams[clusterIndex++] = 100; // initial variable M
        clusterParams[clusterIndex++] = regionSize * regionSize;
      }
    }
  }

  private computeCenters(
    image: Float32Array,
    segmentation: Int32Array,
    masses: Float32Array,
    centers: Float32Array,
    numRegions: number,
    imW: number,
    imH: number
  ) {
    for (let y = 0; y < imH; y += 1) {
      for (let x = 0; x < imW; x += 1) {
        const region = segmentation[x + y * imW];
        masses[region] += 1;
        centers[region * 5] += x;
        centers[region * 5 + 1] += y;
        centers[region * 5 + 2] += image[y * imW + x];
        centers[region * 5 + 3] += image[imW * imH + y * imW + x];
        centers[region * 5 + 4] += image[2 * imW * imH + y * imW + x];
      }
    }

    for (let region = 0; region < numRegions; region += 1) {
      const invMass = 1 / Math.max(masses[region], 1e-8);
      for (let channel = 0; channel < 5; channel += 1) {
        centers[region * 5 + channel] *= invMass;
      }
    }
  }

  private eliminateSmallRegions(
    segmentation: Int32Array,
    minRegionSize: number,
    numPixels: number,
    imW: number,
    imH: number
  ) {
    const cleaned = new Int32Array(numPixels);
    const segment = new Int32Array(numPixels);
    const dx = [1, -1, 0, 0];
    const dy = [0, 0, 1, -1];

    for (let pixel = 0; pixel < numPixels; pixel += 1) {
      if (cleaned[pixel]) {
        continue;
      }
      const label = segmentation[pixel];
      let numExpanded = 0;
      let segmentSize = 0;
      segment[segmentSize++] = pixel;
      let cleanedLabel = label + 1;
      cleaned[pixel] = label + 1;
      let x = pixel % imW;
      let y = Math.floor(pixel / imW);

      for (let direction = 0; direction < 4; direction += 1) {
        const xp = x + dx[direction];
        const yp = y + dy[direction];
        const neighbor = xp + yp * imW;
        if (
          xp >= 0 &&
          xp < imW &&
          yp >= 0 &&
          yp < imH &&
          cleaned[neighbor] !== 0
        ) {
          cleanedLabel = cleaned[neighbor];
        }
      }

      while (numExpanded < segmentSize) {
        const open = segment[numExpanded++];
        x = open % imW;
        y = Math.floor(open / imW);
        for (let direction = 0; direction < 4; direction += 1) {
          const xp = x + dx[direction];
          const yp = y + dy[direction];
          const neighbor = xp + yp * imW;
          if (
            xp >= 0 &&
            xp < imW &&
            yp >= 0 &&
            yp < imH &&
            cleaned[neighbor] === 0 &&
            segmentation[neighbor] === label
          ) {
            cleaned[neighbor] = label + 1;
            segment[segmentSize++] = neighbor;
          }
        }
      }

      if (segmentSize < minRegionSize) {
        while (segmentSize > 0) {
          cleaned[segment[--segmentSize]] = cleanedLabel;
        }
      }
    }

    for (let pixel = 0; pixel < numPixels; pixel += 1) {
      cleaned[pixel] -= 1;
      segmentation[pixel] = cleaned[pixel];
    }
  }

  private updateClusterParams(
    segmentation: Int32Array,
    mcMap: Float32Array,
    msMap: Float32Array,
    clusterParams: Float32Array
  ) {
    const count = clusterParams.length / 2;
    const mc = new Float32Array(count);
    const ms = new Float32Array(count);

    for (let i = 0; i < segmentation.length; i += 1) {
      const region = segmentation[i];
      if (mc[region] < mcMap[i]) {
        mc[region] = mcMap[i];
        clusterParams[region * 2] = mcMap[i];
      }
      if (ms[region] < msMap[i]) {
        ms[region] = msMap[i];
        clusterParams[region * 2 + 1] = msMap[i];
      }
    }
  }

  private assignSuperpixelLabel(
    image: Float32Array,
    segmentation: Int32Array,
    mcMap: Float32Array,
    msMap: Float32Array,
    distanceMap: Float32Array,
    centers: Float32Array,
    clusterParams: Float32Array,
    numRegionsX: number,
    numRegionsY: number,
    regionSize: number,
    imW: number,
    imH: number
  ) {
    distanceMap.fill(Infinity);
    const searchRange = regionSize;

    for (let region = 0; region < numRegionsX * numRegionsY; region += 1) {
      const cx = Math.round(centers[region * 5]);
      const cy = Math.round(centers[region * 5 + 1]);

      for (
        let y = Math.max(0, cy - searchRange);
        y < Math.min(imH, cy + searchRange);
        y += 1
      ) {
        for (
          let x = Math.max(0, cx - searchRange);
          x < Math.min(imW, cx + searchRange);
          x += 1
        ) {
          const spatial = (x - cx) ** 2 + (y - cy) ** 2;
          const dR = image[y * imW + x] - centers[5 * region + 2];
          const dG = image[imW * imH + y * imW + x] - centers[5 * region + 3];
          const dB =
            image[2 * imW * imH + y * imW + x] - centers[5 * region + 4];
          const appearance = dR * dR + dG * dG + dB * dB;
          const distance = Math.sqrt(
            appearance / clusterParams[region * 2] +
              spatial / clusterParams[region * 2 + 1]
          );

          const mapIndex = y * imW + x;
          if (distance < distanceMap[mapIndex]) {
            distanceMap[mapIndex] = distance;
            segmentation[mapIndex] = region;
          }
        }
      }
    }

    for (let y = 0; y < imH; y += 1) {
      for (let x = 0; x < imW; x += 1) {
        const region = segmentation[y * imW + x];
        const index = region * 2;
        if (clusterParams[index] < mcMap[y * imW + x]) {
          clusterParams[index] = mcMap[y * imW + x];
        }
        if (clusterParams[index + 1] < msMap[y * imW + x]) {
          clusterParams[index + 1] = msMap[y * imW + x];
        }
      }
    }
  }

  private computeResidualError(
    prevCenters: Float32Array,
    currentCenters: Float32Array
  ): number {
    let error = 0;
    for (let i = 0; i < prevCenters.length; i += 1) {
      const diff = prevCenters[i] - currentCenters[i];
      error += Math.abs(diff);
    }
    return error;
  }

  private remapLabels(segmentation: Int32Array): number {
    const labelMap = new Map<number, number>();
    let index = 0;
    for (let i = 0; i < segmentation.length; i += 1) {
      const label = segmentation[i];
      if (!labelMap.has(label)) {
        labelMap.set(label, index++);
      }
      segmentation[i] = labelMap.get(label) ?? label;
    }
    return index;
  }

  private encodeLabels(segmentation: Int32Array, data: Uint8ClampedArray) {
    for (let i = 0; i < segmentation.length; i += 1) {
      const value = Math.floor(segmentation[i]);
      data[4 * i] = value & 255;
      data[4 * i + 1] = (value >>> 8) & 255;
      data[4 * i + 2] = (value >>> 16) & 255;
      data[4 * i + 3] = 255;
    }
  }

  private computeSLICSegmentation(
    imageData: ImageData,
    regionSize: number,
    minRegionSize: number,
    maxIterations: number
  ): SLICResult {
    const imWidth = imageData.width;
    const imHeight = imageData.height;
    const numRegionsX = Math.floor(imWidth / regionSize);
    const numRegionsY = Math.floor(imHeight / regionSize);
    const numRegions = numRegionsX * numRegionsY;
    const numPixels = imWidth * imHeight;

    const edgeMap = new Float32Array(numPixels);
    const masses = new Float32Array(numRegions);
    const currentCenters = new Float32Array(5 * numRegions);
    const newCenters = new Float32Array(5 * numRegions);
    const clusterParams = new Float32Array(2 * numRegions);
    const mcMap = new Float32Array(numPixels);
    const msMap = new Float32Array(numPixels);
    const distanceMap = new Float32Array(numPixels);
    const xyzData = this.rgb2xyz(imageData.data, imWidth, imHeight);
    const labData = this.xyz2lab(xyzData, imWidth, imHeight);

    this.computeEdge(labData, edgeMap, imWidth, imHeight);
    this.initializeKmeansCenters(
      labData,
      edgeMap,
      currentCenters,
      clusterParams,
      numRegionsX,
      numRegionsY,
      regionSize,
      imWidth,
      imHeight
    );

    const segmentation = new Int32Array(numPixels);

    for (let iter = 0; iter < maxIterations; iter += 1) {
      this.assignSuperpixelLabel(
        labData,
        segmentation,
        mcMap,
        msMap,
        distanceMap,
        currentCenters,
        clusterParams,
        numRegionsX,
        numRegionsY,
        regionSize,
        imWidth,
        imHeight
      );

      this.updateClusterParams(segmentation, mcMap, msMap, clusterParams);
      masses.fill(0);
      newCenters.fill(0);
      this.computeCenters(
        labData,
        segmentation,
        masses,
        newCenters,
        numRegions,
        imWidth,
        imHeight
      );

      const error = this.computeResidualError(currentCenters, newCenters);
      if (error < 1e-5) {
        break;
      }
      currentCenters.set(newCenters);
    }

    this.eliminateSmallRegions(
      segmentation,
      minRegionSize,
      numPixels,
      imWidth,
      imHeight
    );

    const context = document.createElement("canvas").getContext("2d");
    if (!context) {
      throw new Error("Canvas context is not available");
    }
    const image = context.createImageData(imWidth, imHeight);
    const slicResult = image as SLICResult;
    slicResult.numSegments = this.remapLabels(segmentation);
    this.encodeLabels(segmentation, slicResult.data);
    context.canvas.remove();
    return slicResult;
  }

  public computeEdgemap(
    maskImageData: ImageData | SLICResult,
    options?: SLICEdgeRenderOptions
  ) {
    const foreground = options?.foreground ?? [
      ...this.boundaryColor,
      this.boundaryAlpha,
    ];
    const background = options?.background ?? [...this.boundaryColor, 0];
    const { data, width, height } = maskImageData;
    const edgeMap = new Uint8Array(data);

    for (let i = 0; i < height; i += 1) {
      for (let j = 0; j < width; j += 1) {
        const offset = 4 * (i * width + j);
        const index = data[offset];
        const isBoundary =
          i === 0 ||
          j === 0 ||
          i === height - 1 ||
          j === width - 1 ||
          index !== data[offset - 4] ||
          index !== data[offset + 4] ||
          index !== data[offset - 4 * width] ||
          index !== data[offset + 4 * width];

        const palette = isBoundary ? foreground : background;
        for (let k = 0; k < palette.length; k += 1) {
          edgeMap[offset + k] = palette[k];
        }
      }
    }

    data.set(edgeMap);
  }

  public getEncodedLabel(array: Uint8ClampedArray, offset: number): number {
    return array[offset] | (array[offset + 1] << 8) | (array[offset + 2] << 16);
  }

  public getClickOffset(
    point: { x: number; y: number },
    width: number
  ): number {
    return 4 * (point.y * width + point.x);
  }

  public createPixelIndex(maskImageData: SLICResult) {
    const numSegments = maskImageData.numSegments;
    const data = maskImageData.data;
    const pixelIndex: number[][] = Array.from(
      { length: numSegments },
      () => []
    );

    for (let i = 0; i < data.length; i += 4) {
      const index = data[i] | (data[i + 1] << 8) | (data[i + 2] << 16);
      pixelIndex[index].push(i);
    }

    this.currentPixels = null;
    this.pixelIndex = pixelIndex;
  }

  public getPixelIndex(): number[][] {
    return this.pixelIndex;
  }

  public highlightPixels(
    pixels: number[] | null,
    rgbaArray: [number, number, number, number],
    annotationImageData: ImageData,
    boundaryImageData: ImageData
  ) {
    const annotationData = annotationImageData.data;
    const boundaryData = boundaryImageData.data;

    if (this.currentPixels) {
      this.currentPixels.forEach((offset) => {
        annotationData[offset] = rgbaArray[0];
        annotationData[offset + 1] = rgbaArray[1];
        annotationData[offset + 2] = rgbaArray[2];
        annotationData[offset + 3] = rgbaArray[3] * 255;
      });
    }

    this.currentPixels = pixels;

    if (this.currentPixels) {
      this.currentPixels.forEach((offset) => {
        if (boundaryData[offset + 3]) {
          annotationData[offset] = this.boundaryColor[0];
          annotationData[offset + 1] = this.boundaryColor[1];
          annotationData[offset + 2] = this.boundaryColor[2];
          annotationData[offset + 3] = this.highlightAlpha;
        } else {
          annotationData[offset + 3] = this.highlightAlpha;
        }
      });
    }
  }

  public fillPixels(
    pixels: number[],
    rgbaArray: [number, number, number, number],
    imageData: ImageData
  ) {
    const data = imageData.data;
    pixels.forEach((offset) => {
      data[offset] = rgbaArray[0];
      data[offset + 1] = rgbaArray[1];
      data[offset + 2] = rgbaArray[2];
      data[offset + 3] = rgbaArray[3] * 255;
    });
  }
}
