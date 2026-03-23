import { fabric } from "fabric";

import { divide, multiple } from "@/utils/calculator";

import { EXPORT_PROPS } from "./imageLabelingConstants";
import type { LabelExportObject } from "./imageLabelingTypes";

const { Canvas, Image: FabricImage } = fabric;

/**
 * 이미지 요소 생성
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export const createImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.setAttribute("crossOrigin", "");
    img.onload = () => resolve(img);
  });
};

interface CreateFabricImageOptions extends LabelExportObject {
  alpha?: string;
}

export const createFabricImage = async (
  dataUrl: string,
  options: CreateFabricImageOptions
) => {
  const image = await createImage(dataUrl);
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) {
    throw new Error("Failed to acquire 2D rendering context.");
  }
  ctx.canvas.width = image.width;
  ctx.canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const imageDataWithOpacity = transparentBlackPixel(
    imageData,
    options.alpha ? divide(+options.alpha.replace("%", ""), 100) : 0
  );
  ctx.putImageData(imageDataWithOpacity, 0, 0);
  dataUrl = ctx.canvas.toDataURL();
  ctx.clearRect(0, 0, image.width, image.height);
  return new Promise<{
    segVector: string;
    segBuffer: string;
    dataUrl: string;
  }>((resolve) => {
    FabricImage.fromURL(
      dataUrl,
      (fabricImage) => {
        const tempCanvas = new Canvas(ctx.canvas);
        tempCanvas.add(fabricImage).renderAll();
        const { objects } = tempCanvas.toJSON(EXPORT_PROPS);
        tempCanvas.dispose();
        ctx.canvas.remove();
        const [object] = objects as (fabric.Object & { src?: string })[];
        object.src = dataUrl.split(",")[0];
        const segBuffer = dataUrl.split(",")[1];
        const segVector = JSON.stringify(object);
        resolve({ segVector, segBuffer, dataUrl });
      },
      {
        ...options,
        objectCaching: false,
        selectable: false,
        evented: true,
      }
    );
  });
};

export const transparentBlackPixel = (
  imageData: ImageData,
  opacity: number
) => {
  for (let i = 0; i < imageData.data.length; i += 4) {
    const red = imageData.data[i];
    const green = imageData.data[i + 1];
    const blue = imageData.data[i + 2];

    if (red === 0 && green === 0 && blue === 0) {
      imageData.data[i + 3] = 0;
    } else if (opacity) {
      imageData.data[i + 3] = multiple(255, opacity, 2);
    }
  }
  return imageData;
};

export const cropAlphaArea = (imgData: ImageData) => {
  const findNonTransparentArea = (imageData: ImageData) => {
    const data = imageData.data;
    let minX = imageData.width;
    let minY = imageData.height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < imageData.height; y += 1) {
      for (let x = 0; x < imageData.width; x += 1) {
        const index = (y * imageData.width + x) * 4;
        if (data[index + 3] > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return { minX, minY, maxX, maxY };
  };

  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d");
  if (!tmpCtx) {
    return { canvas: tmpCanvas, minX: 0, minY: 0 };
  }

  const { minX, minY, maxX, maxY } = findNonTransparentArea(imgData);

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;

  const croppedImageData = tmpCtx.createImageData(cropWidth, cropHeight);

  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      const srcIndex = ((minY + y) * imgData.width + minX + x) * 4;
      const destIndex = (y * cropWidth + x) * 4;

      croppedImageData.data[destIndex] = imgData.data[srcIndex];
      croppedImageData.data[destIndex + 1] = imgData.data[srcIndex + 1];
      croppedImageData.data[destIndex + 2] = imgData.data[srcIndex + 2];
      croppedImageData.data[destIndex + 3] = imgData.data[srcIndex + 3];
    }
  }

  tmpCanvas.width = cropWidth;
  tmpCanvas.height = cropHeight;

  tmpCtx.putImageData(croppedImageData, 0, 0);

  return { canvas: tmpCanvas, minX, minY };
};
