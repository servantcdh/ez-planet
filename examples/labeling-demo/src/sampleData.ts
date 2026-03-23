/**
 * Sample data for the labeling demo app.
 *
 * - 5 images (Unsplash, 1280x720)
 * - 5 text samples (Korean)
 * - 5 number/table data sets
 * - Policies (Object Detection, Classification, Segmentation)
 * - 5 records with contentSetIds
 * - Pre-existing labels for record 2
 */

// ─── Sample Images (5) ─────────────────────────────────────────

export const sampleImages: Record<
  string,
  { url: string; width: number; height: number }
> = {
  "cs-1": {
    url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1280&h=720&fit=crop",
    width: 1280,
    height: 720,
  },
  "cs-2": {
    url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1280&h=720&fit=crop",
    width: 1280,
    height: 720,
  },
  "cs-3": {
    url: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1280&h=720&fit=crop",
    width: 1280,
    height: 720,
  },
  "cs-4": {
    url: "https://images.unsplash.com/photo-1515861461-74f54e9afe42?w=1280&h=720&fit=crop",
    width: 1280,
    height: 720,
  },
  "cs-5": {
    url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1280&h=720&fit=crop",
    width: 1280,
    height: 720,
  },
};

// ─── Sample Text (Korean, 5) ───────────────────────────────────

export const sampleTexts: Record<string, string> = {
  "cs-1":
    "도심 거리의 모습입니다. 보행자 도로를 따라 다양한 상점과 카페가 늘어서 있으며, 보행자들이 분주하게 오가고 있습니다. 거리의 양쪽에는 높은 건물과 가로수가 줄지어 있어 도시 특유의 활기를 느낄 수 있습니다.",
  "cs-2":
    "도시 중심부의 스카이라인을 보여주는 사진입니다. 고층 빌딩들이 하늘을 향해 솟아 있으며, 해 질 녘의 황금빛 노을이 건물 유리창에 반사되어 아름다운 풍경을 만들어냅니다. 대도시의 웅장함이 잘 드러나는 장면입니다.",
  "cs-3":
    "공원의 풍경입니다. 넓은 잔디밭 위로 키 큰 나무들이 그늘을 드리우고 있으며, 산책로를 따라 시민들이 여유롭게 걷고 있습니다. 벤치에 앉아 책을 읽는 사람들의 모습도 보입니다.",
  "cs-4":
    "고속도로 교차로의 조감도입니다. 여러 차선이 복잡하게 교차하며 차량들이 질서정연하게 흐르고 있습니다. 교통 표지판과 신호등이 곳곳에 설치되어 원활한 교통 흐름을 유도하고 있습니다.",
  "cs-5":
    "상업 지구의 모습입니다. 대형 쇼핑몰과 브랜드 매장이 밀집해 있으며, 밤이 되면 네온사인과 조명이 거리를 환하게 밝힙니다. 많은 쇼핑객들이 거리를 누비며 활기찬 분위기를 자아냅니다.",
};

// ─── Sample Number/Table Data (5) ──────────────────────────────

export interface NumberTableRow {
  hour: string;
  temperature: number;
  humidity: number;
  trafficCount: number;
  airQualityIndex: number;
}

export const sampleNumberData: Record<string, NumberTableRow[]> = {
  "cs-1": [
    { hour: "06:00", temperature: 12, humidity: 78, trafficCount: 320, airQualityIndex: 45 },
    { hour: "09:00", temperature: 16, humidity: 65, trafficCount: 1250, airQualityIndex: 62 },
    { hour: "12:00", temperature: 22, humidity: 52, trafficCount: 980, airQualityIndex: 71 },
    { hour: "15:00", temperature: 24, humidity: 48, trafficCount: 870, airQualityIndex: 68 },
    { hour: "18:00", temperature: 20, humidity: 55, trafficCount: 1450, airQualityIndex: 75 },
    { hour: "21:00", temperature: 15, humidity: 70, trafficCount: 620, airQualityIndex: 52 },
  ],
  "cs-2": [
    { hour: "06:00", temperature: 10, humidity: 82, trafficCount: 450, airQualityIndex: 38 },
    { hour: "09:00", temperature: 14, humidity: 70, trafficCount: 1800, airQualityIndex: 55 },
    { hour: "12:00", temperature: 20, humidity: 58, trafficCount: 1350, airQualityIndex: 65 },
    { hour: "15:00", temperature: 23, humidity: 50, trafficCount: 1100, airQualityIndex: 70 },
    { hour: "18:00", temperature: 18, humidity: 60, trafficCount: 2100, airQualityIndex: 80 },
    { hour: "21:00", temperature: 13, humidity: 75, trafficCount: 800, airQualityIndex: 48 },
  ],
  "cs-3": [
    { hour: "06:00", temperature: 8, humidity: 88, trafficCount: 120, airQualityIndex: 30 },
    { hour: "09:00", temperature: 13, humidity: 72, trafficCount: 350, airQualityIndex: 35 },
    { hour: "12:00", temperature: 19, humidity: 55, trafficCount: 280, airQualityIndex: 40 },
    { hour: "15:00", temperature: 21, humidity: 50, trafficCount: 310, airQualityIndex: 38 },
    { hour: "18:00", temperature: 17, humidity: 62, trafficCount: 420, airQualityIndex: 42 },
    { hour: "21:00", temperature: 11, humidity: 80, trafficCount: 180, airQualityIndex: 32 },
  ],
  "cs-4": [
    { hour: "06:00", temperature: 14, humidity: 75, trafficCount: 2200, airQualityIndex: 55 },
    { hour: "09:00", temperature: 18, humidity: 62, trafficCount: 4500, airQualityIndex: 78 },
    { hour: "12:00", temperature: 25, humidity: 45, trafficCount: 3200, airQualityIndex: 85 },
    { hour: "15:00", temperature: 27, humidity: 40, trafficCount: 2800, airQualityIndex: 82 },
    { hour: "18:00", temperature: 22, humidity: 52, trafficCount: 5100, airQualityIndex: 92 },
    { hour: "21:00", temperature: 16, humidity: 68, trafficCount: 1500, airQualityIndex: 60 },
  ],
  "cs-5": [
    { hour: "06:00", temperature: 11, humidity: 80, trafficCount: 180, airQualityIndex: 42 },
    { hour: "09:00", temperature: 15, humidity: 68, trafficCount: 950, airQualityIndex: 58 },
    { hour: "12:00", temperature: 21, humidity: 55, trafficCount: 1600, airQualityIndex: 64 },
    { hour: "15:00", temperature: 23, humidity: 48, trafficCount: 2100, airQualityIndex: 70 },
    { hour: "18:00", temperature: 19, humidity: 58, trafficCount: 2800, airQualityIndex: 76 },
    { hour: "21:00", temperature: 14, humidity: 72, trafficCount: 1200, airQualityIndex: 50 },
  ],
};

// ─── Sample Policies ────────────────────────────────────────────

export interface PolicyClass {
  index: number;
  name: string;
  color: string;
  attributes?: Array<{
    name: string;
    attributeType: "TEXT" | "SELECT" | "CHECKBOX";
    values?: string[];
  }>;
}

export interface Policy {
  id: string;
  name: string;
  inferenceType: string;
  classes: PolicyClass[];
}

export const samplePolicies: Policy[] = [
  {
    id: "policy-objdet",
    name: "Object Detection",
    inferenceType: "OBJECT_DETECTION",
    classes: [
      { index: 0, name: "Car", color: "#e74c3c" },
      { index: 1, name: "Bus", color: "#3498db" },
      { index: 2, name: "Person", color: "#2ecc71" },
      { index: 3, name: "Bicycle", color: "#f39c12" },
      { index: 4, name: "Tree", color: "#27ae60" },
      { index: 5, name: "Building", color: "#8e44ad" },
      { index: 6, name: "Sign", color: "#e67e22" },
    ],
  },
  {
    id: "policy-cls",
    name: "Classification",
    inferenceType: "CLASSIFICATION",
    classes: [
      { index: 0, name: "Urban", color: "#3596b5" },
      { index: 1, name: "Suburban", color: "#52b788" },
      { index: 2, name: "Rural", color: "#a98467" },
    ],
  },
  {
    id: "policy-seg",
    name: "Segmentation",
    inferenceType: "SEGMENTATION",
    classes: [
      { index: 0, name: "Road", color: "#636e72" },
      { index: 1, name: "Sidewalk", color: "#b2bec3" },
      { index: 2, name: "Sky", color: "#74b9ff" },
      { index: 3, name: "Vegetation", color: "#00b894" },
    ],
  },
];

// ─── Sample Records (5) ────────────────────────────────────────

export interface SampleRecord {
  id: string;
  contentSetId: string;
  label: string;
}

export const sampleRecords: SampleRecord[] = [
  { id: "r-1", contentSetId: "cs-1", label: "city_street_01" },
  { id: "r-2", contentSetId: "cs-2", label: "downtown_02" },
  { id: "r-3", contentSetId: "cs-3", label: "park_trees_03" },
  { id: "r-4", contentSetId: "cs-4", label: "highway_04" },
  { id: "r-5", contentSetId: "cs-5", label: "shopping_05" },
];

// ─── Pre-existing Labels for Record 2 ──────────────────────────

export interface SampleLabel {
  id: string;
  labelContextId: string;
  contentSetId: string;
  policyId: string;
  inferenceType: string;
  unitType: string;
  labelValue: unknown;
  isLabeled: boolean;
  createdBy: string;
  createdDate: string;
}

export const sampleLabelsForRecord2: SampleLabel[] = [
  // Bounding box labels (Object Detection)
  {
    id: "label-bb-1",
    labelContextId: "lctx-demo",
    contentSetId: "cs-2",
    policyId: "policy-objdet",
    inferenceType: "OBJECT_DETECTION",
    unitType: "ELEMENT",
    labelValue: {
      className: "Car",
      classIndex: 0,
      coord: [120, 350, 320, 480],
      color: "#e74c3c",
      opacity: 0.6,
      zindex: 1,
    },
    isLabeled: true,
    createdBy: "demo-user",
    createdDate: "2026-03-18T10:30:00Z",
  },
  {
    id: "label-bb-2",
    labelContextId: "lctx-demo",
    contentSetId: "cs-2",
    policyId: "policy-objdet",
    inferenceType: "OBJECT_DETECTION",
    unitType: "ELEMENT",
    labelValue: {
      className: "Person",
      classIndex: 2,
      coord: [500, 280, 560, 450],
      color: "#2ecc71",
      opacity: 0.6,
      zindex: 2,
    },
    isLabeled: true,
    createdBy: "demo-user",
    createdDate: "2026-03-18T10:31:00Z",
  },
  {
    id: "label-bb-3",
    labelContextId: "lctx-demo",
    contentSetId: "cs-2",
    policyId: "policy-objdet",
    inferenceType: "OBJECT_DETECTION",
    unitType: "ELEMENT",
    labelValue: {
      className: "Building",
      classIndex: 5,
      coord: [700, 50, 1050, 400],
      color: "#8e44ad",
      opacity: 0.5,
      zindex: 0,
    },
    isLabeled: true,
    createdBy: "demo-user",
    createdDate: "2026-03-18T10:32:00Z",
  },
  // Classification label (Record-level)
  {
    id: "label-cls-1",
    labelContextId: "lctx-demo",
    contentSetId: "cs-2",
    policyId: "policy-cls",
    inferenceType: "CLASSIFICATION",
    unitType: "CONTENTSET",
    labelValue: {
      className: "Urban",
      classIndex: 0,
    },
    isLabeled: true,
    createdBy: "demo-user",
    createdDate: "2026-03-18T10:33:00Z",
  },
];
