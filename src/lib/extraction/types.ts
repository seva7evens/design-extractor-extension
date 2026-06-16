import { z } from 'zod';

export const CaptureModeSchema = z.enum(['viewport', 'fullPage']);
export type CaptureMode = z.infer<typeof CaptureModeSchema>;

export const ExtractionOptionsSchema = z.object({
  captureMode: CaptureModeSchema.default('fullPage'),
  includeRawCssVariables: z.boolean().default(false),
  maxNodes: z.number().int().min(50).max(2000).default(1000),
  maxTextLength: z.number().int().min(40).max(2000).default(240)
});
export type ExtractionOptions = z.infer<typeof ExtractionOptionsSchema>;

export const PageMetadataSchema = z.object({
  url: z.string(),
  origin: z.string(),
  hostname: z.string(),
  title: z.string(),
  viewportWidth: z.number(),
  viewportHeight: z.number(),
  documentWidth: z.number(),
  documentHeight: z.number(),
  devicePixelRatio: z.number(),
  language: z.string().optional(),
  colorScheme: z.string().optional(),
  themeColor: z.string().optional(),
  frameworkHints: z.array(z.string()).default([])
});
export type PageMetadata = z.infer<typeof PageMetadataSchema>;

export const EvidenceNodeSchema = z.object({
  id: z.string(),
  tag: z.string(),
  role: z.string().optional(),
  accessibleName: z.string().optional(),
  text: z.string().optional(),
  selector: z.string(),
  classSample: z.string().optional(),
  domId: z.string().optional(),
  rect: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    documentX: z.number(),
    documentY: z.number()
  }),
  visibility: z.string(),
  zIndex: z.string(),
  parentId: z.string().optional(),
  childIds: z.array(z.string()).default([]),
  depth: z.number(),
  kind: z.string(),
  importance: z.number(),
  styles: z.record(z.string(), z.string()),
  asset: z
    .object({
      src: z.string().optional(),
      alt: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      backgroundImage: z.string().optional(),
      svg: z.boolean().optional(),
      logoCandidate: z.boolean().optional()
    })
    .optional()
});
export type EvidenceNode = z.infer<typeof EvidenceNodeSchema>;

export const DesignTokensSchema = z.object({
  colors: z.array(
    z.object({
      value: z.string(),
      role: z.string(),
      usageCount: z.number(),
      area: z.number(),
      nodeIds: z.array(z.string())
    })
  ),
  typography: z.array(
    z.object({
      role: z.string(),
      fontFamily: z.string(),
      fontSize: z.string(),
      fontWeight: z.string(),
      lineHeight: z.string(),
      letterSpacing: z.string(),
      count: z.number(),
      nodeIds: z.array(z.string())
    })
  ),
  spacing: z.array(z.object({ role: z.string(), value: z.string(), count: z.number() })),
  radius: z.array(z.object({ role: z.string(), value: z.string(), count: z.number() })),
  shadows: z.array(z.object({ role: z.string(), value: z.string(), count: z.number() })),
  surfaces: z.array(z.object({ value: z.string(), area: z.number(), nodeIds: z.array(z.string()) })),
  cssVariables: z.record(z.string(), z.string()).default({})
});
export type DesignTokens = z.infer<typeof DesignTokensSchema>;

export const ComponentInventoryItemSchema = z.object({
  name: z.string(),
  kind: z.string(),
  count: z.number(),
  nodeIds: z.array(z.string()),
  textSamples: z.array(z.string()).default([]),
  rectSamples: z.array(EvidenceNodeSchema.shape.rect).default([]),
  styles: z.record(z.string(), z.string()).default({})
});
export type ComponentInventoryItem = z.infer<typeof ComponentInventoryItemSchema>;

export const LayoutRegionSchema = z.object({
  id: z.string(),
  kind: z.string(),
  label: z.string().optional(),
  selector: z.string(),
  rect: EvidenceNodeSchema.shape.rect,
  childKinds: z.array(z.string()).default([])
});
export type LayoutRegion = z.infer<typeof LayoutRegionSchema>;

export const StateHintSchema = z.object({
  state: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  nodeIds: z.array(z.string()),
  evidence: z.array(z.string()).default([])
});
export type StateHint = z.infer<typeof StateHintSchema>;

export const ScreenshotSegmentEvidenceSchema = z.object({
  dataUrl: z.string().optional(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  devicePixelRatio: z.number()
});
export type ScreenshotSegmentEvidence = z.infer<typeof ScreenshotSegmentEvidenceSchema>;

export const ScreenshotSegmentAnalysisSchema = z.object({
  y: z.number(),
  width: z.number(),
  height: z.number(),
  dominantColors: z.array(z.string()).default([]),
  brightness: z.number(),
  contrast: z.number(),
  density: z.number()
});
export type ScreenshotSegmentAnalysis = z.infer<typeof ScreenshotSegmentAnalysisSchema>;

export const VisualClusterSchema = z.object({
  viewport: z.enum(['desktop', 'mobile']),
  yRange: z.object({ start: z.number(), end: z.number() }),
  dominantColors: z.array(z.string()).default([]),
  brightness: z.number(),
  contrast: z.number(),
  density: z.number(),
  nodeIds: z.array(z.string()).default([]),
  componentKinds: z.array(z.string()).default([]),
  confidence: z.enum(['low', 'medium', 'high'])
});
export type VisualCluster = z.infer<typeof VisualClusterSchema>;

export const ExtractionEvidenceSchema = z.object({
  metadata: PageMetadataSchema,
  nodes: z.array(EvidenceNodeSchema),
  tokens: DesignTokensSchema,
  componentInventory: z.array(ComponentInventoryItemSchema).default([]),
  layoutRegions: z.array(LayoutRegionSchema).default([]),
  stateHints: z.array(StateHintSchema).default([]),
  warnings: z.array(z.string()).default([]),
  capturedAt: z.string()
});
export type ExtractionEvidence = z.infer<typeof ExtractionEvidenceSchema>;

export const ViewportEvidenceSchema = z.object({
  label: z.enum(['desktop', 'mobile']),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
    devicePixelRatio: z.number()
  }),
  evidence: ExtractionEvidenceSchema,
  screenshotDataUrl: z.string().optional(),
  screenshotSegments: z.array(ScreenshotSegmentEvidenceSchema).default([]),
  visualClusters: z.array(VisualClusterSchema).default([])
});
export type ViewportEvidence = z.infer<typeof ViewportEvidenceSchema>;

export const MultiViewportEvidenceSchema = z.object({
  primary: z.enum(['desktop', 'mobile']),
  viewports: z.array(ViewportEvidenceSchema).min(1),
  mergedTokens: DesignTokensSchema,
  mergedComponentInventory: z.array(ComponentInventoryItemSchema).default([]),
  responsiveFindings: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});
export type MultiViewportEvidence = z.infer<typeof MultiViewportEvidenceSchema>;

export const DesignEvidenceSchema = z.union([ExtractionEvidenceSchema, MultiViewportEvidenceSchema]);
export type DesignEvidence = z.infer<typeof DesignEvidenceSchema>;

export const GeminiModelSchema = z.object({
  name: z.string(),
  baseModelId: z.string().optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  supportedGenerationMethods: z.array(z.string()).default([]),
  inputTokenLimit: z.number().optional(),
  outputTokenLimit: z.number().optional()
});
export type GeminiModel = z.infer<typeof GeminiModelSchema>;

export const GeminiSettingsSchema = z.object({
  apiKey: z.string().optional(),
  visionModel: z.string().default('gemini-3.1-flash-lite'),
  textModel: z.string().default('gemini-3.1-flash-lite'),
  captureMode: CaptureModeSchema.default('fullPage'),
  includeEvidenceJson: z.boolean().default(true),
  includeVisualReportJson: z.boolean().default(true),
  includeRawCssVariables: z.boolean().default(false),
  includeMobileEvidence: z.boolean().default(true),
  cachedModels: z.array(GeminiModelSchema).default([]),
  modelCacheDate: z.string().optional()
});
export type GeminiSettings = z.infer<typeof GeminiSettingsSchema>;

export const ProgressEventSchema = z.object({
  step: z.string(),
  message: z.string(),
  at: z.string()
});
export type ProgressEvent = z.infer<typeof ProgressEventSchema>;

export const GeneratedArtifactsSchema = z.object({
  filename: z.string(),
  markdown: z.string(),
  screenshotFilename: z.string().optional(),
  screenshotDataUrl: z.string().optional(),
  evidenceFilename: z.string().optional(),
  evidence: DesignEvidenceSchema.optional(),
  visualReportFilename: z.string().optional(),
  visualReport: z.unknown().optional(),
  validationIssues: z.array(z.string()).default([])
});
export type GeneratedArtifacts = z.infer<typeof GeneratedArtifactsSchema>;
