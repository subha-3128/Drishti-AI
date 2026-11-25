export type HazardPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface HazardClassConfig {
  id: string;
  label: string;
  spokenName: string;
  category: 'dynamic' | 'static';
  basePriority: HazardPriority;
  enabled: boolean;
  source: 'coco-pretrained' | 'indian-custom-pending';
}

export const COCO_80_LABELS: readonly string[] = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

/**
 * Only classes genuinely supported by the active pretrained COCO model have enabled: true.
 * Indian pedestrian hazards are registered with enabled: false until a custom model is trained.
 */
export const HAZARD_CLASS_REGISTRY: Record<string, HazardClassConfig> = {
  person: {
    id: 'person',
    label: 'Person',
    spokenName: 'Person',
    category: 'dynamic',
    basePriority: 'P1',
    enabled: true,
    source: 'coco-pretrained',
  },
  motorcycle: {
    id: 'motorcycle',
    label: 'Motorcycle',
    spokenName: 'Two-wheeler',
    category: 'dynamic',
    basePriority: 'P0',
    enabled: true,
    source: 'coco-pretrained',
  },
  car: {
    id: 'car',
    label: 'Car',
    spokenName: 'Vehicle',
    category: 'dynamic',
    basePriority: 'P0',
    enabled: true,
    source: 'coco-pretrained',
  },
  bus: {
    id: 'bus',
    label: 'Bus',
    spokenName: 'Bus',
    category: 'dynamic',
    basePriority: 'P0',
    enabled: true,
    source: 'coco-pretrained',
  },
  truck: {
    id: 'truck',
    label: 'Truck',
    spokenName: 'Truck',
    category: 'dynamic',
    basePriority: 'P0',
    enabled: true,
    source: 'coco-pretrained',
  },
  bicycle: {
    id: 'bicycle',
    label: 'Bicycle',
    spokenName: 'Bicycle',
    category: 'dynamic',
    basePriority: 'P1',
    enabled: true,
    source: 'coco-pretrained',
  },
  dog: {
    id: 'dog',
    label: 'Dog',
    spokenName: 'Dog',
    category: 'dynamic',
    basePriority: 'P1',
    enabled: true,
    source: 'coco-pretrained',
  },
  cow: {
    id: 'cow',
    label: 'Cow',
    spokenName: 'Animal',
    category: 'dynamic',
    basePriority: 'P1',
    enabled: true,
    source: 'coco-pretrained',
  },
  bench: {
    id: 'bench',
    label: 'Bench',
    spokenName: 'Obstacle',
    category: 'static',
    basePriority: 'P2',
    enabled: true,
    source: 'coco-pretrained',
  },
  chair: {
    id: 'chair',
    label: 'Chair',
    spokenName: 'Obstacle',
    category: 'static',
    basePriority: 'P2',
    enabled: true,
    source: 'coco-pretrained',
  },
  suitcase: {
    id: 'suitcase',
    label: 'Suitcase',
    spokenName: 'Obstacle',
    category: 'static',
    basePriority: 'P2',
    enabled: true,
    source: 'coco-pretrained',
  },
  // Custom Indian pedestrian hazards — disabled until trained model is integrated.
  auto_rickshaw: {
    id: 'auto_rickshaw',
    label: 'Auto-rickshaw',
    spokenName: 'Auto-rickshaw',
    category: 'dynamic',
    basePriority: 'P0',
    enabled: false,
    source: 'indian-custom-pending',
  },
  pothole: {
    id: 'pothole',
    label: 'Pothole',
    spokenName: 'Pothole',
    category: 'static',
    basePriority: 'P1',
    enabled: false,
    source: 'indian-custom-pending',
  },
  open_drain: {
    id: 'open_drain',
    label: 'Open drain',
    spokenName: 'Possible open drain',
    category: 'static',
    basePriority: 'P0',
    enabled: false,
    source: 'indian-custom-pending',
  },
  open_manhole: {
    id: 'open_manhole',
    label: 'Open manhole',
    spokenName: 'Possible open manhole',
    category: 'static',
    basePriority: 'P0',
    enabled: false,
    source: 'indian-custom-pending',
  },
  broken_footpath: {
    id: 'broken_footpath',
    label: 'Broken footpath',
    spokenName: 'Broken pathway',
    category: 'static',
    basePriority: 'P1',
    enabled: false,
    source: 'indian-custom-pending',
  },
};

export function getActiveHazardConfig(cocoLabel: string): HazardClassConfig | null {
  const cfg = HAZARD_CLASS_REGISTRY[cocoLabel];
  if (!cfg || !cfg.enabled) return null;
  return cfg;
}
