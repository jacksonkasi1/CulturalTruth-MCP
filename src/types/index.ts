/**
 * Shared Type Definitions - CulturalTruth MCP
 * All interfaces and types used across modules
 */

export type EnvironmentMode = "Hackathon" | "Production";

export interface EnvironmentConfig {
  mode: EnvironmentMode;
  enableFullPotential: boolean;
  apiEndpoint: string;
  biasDetectionLevel: "strict" | "moderate" | "lenient";
  complianceThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  enabledFeatures: {
    demographicAnalysis: boolean;
    culturalTrends: boolean;
    geospatialInsights: boolean;
    batchProcessing: boolean;
    realtimeSignals: boolean;
  };
}

export interface QlooEntity {
  name: string;
  entity_id: string;
  type: string;
  subtype?: string;
  properties: {
    release_year?: number;
    popularity?: number;
    description?: string;
    content_rating?: string;
    duration?: number;
    rating?: number;
    price_level?: number;
    tags?: Array<{
      id: string;
      name: string;
      type: string;
    }>;
    [key: string]: any;
  };
}

export interface QlooResponse {
  success: boolean;
  results: {
    entities: QlooEntity[];
    total?: number;
    offset?: number;
  };
  error?: string;
  status?: number;
}

export interface BiasPattern {
  type:
    | "gender_exclusive"
    | "age_discriminatory"
    | "racial_proxy"
    | "cultural_insensitive"
    | "accessibility_barrier";
  pattern: string;
  severity: "low" | "medium" | "high" | "critical";
  matches: string[];
  suggestions: string[];
  regulation_risk: string[];
  confidence: number;
}

export interface ComplianceScore {
  euAiAct: number; // EU AI Act compliance score (0-100)
  section508: number; // US accessibility compliance (0-100)
  gdpr: number; // GDPR compliance for demographic data (0-100)
  riskLevel: "low" | "medium" | "high" | "critical";
  overallScore: number;
  regulations_triggered: string[];
}

export interface AuditTrail {
  timestamp: string;
  sessionId: string;
  userId?: string;
  originalContent: string;
  contentHash: string;
  detectedBias: BiasPattern[];
  qlooEntities: string[];
  complianceScore: ComplianceScore;
  mitigationActions: string[];
  processingTime: number;
  apiCallsCount: number;
  cacheHits: number;
}

export interface DemographicAnalysis {
  demographic: string;
  entities: QlooEntity[];
  confidence: number;
  culturalRelevance: number;
}

export interface ComplianceReport {
  period: {
    start: string;
    end: string;
    days: number;
  };
  summary: {
    totalAnalyses: number;
    averageComplianceScore: number;
    riskDistribution: Record<string, number>;
    trendsOverTime: Array<{
      date: string;
      averageScore: number;
      highRiskCount: number;
    }>;
  };
  topIssues: Array<{
    biasType: string;
    occurrences: number;
    averageSeverity: string;
    regulationsTriggered: string[];
  }>;
  recommendations: string[];
}

export interface ComparisonResult {
  success: boolean;
  groupA: {
    entities: QlooEntity[];
    avgPopularity: number;
    commonTags: string[];
  };
  groupB: {
    entities: QlooEntity[];
    avgPopularity: number;
    commonTags: string[];
  };
  deltaScores: {
    popularityDelta: number;
    culturalAffinityScore: number;
    overlapPercentage: number;
    recommendations: string[];
  };
  error?: string;
}

export interface BatchAuditRequest {
  content: string;
  user_id?: string;
  include_demographics?: boolean;
}

export interface BatchAuditResult {
  success: boolean;
  results: Array<{
    index: number;
    biasAnalysis: BiasPattern[];
    complianceScore: ComplianceScore;
    culturalEntities: QlooEntity[];
    processingTime: number;
    error?: string;
  }>;
  summary: {
    totalProcessed: number;
    avgComplianceScore: number;
    criticalIssuesCount: number;
    processingTime: number;
  };
}

export interface RealtimeSignal {
  entityId: string;
  context: {
    userId?: string;
    sessionId: string;
    interaction: "view" | "like" | "share" | "purchase" | "rating";
    value?: number;
    location?: string;
    timestamp: string;
  };
  metadata?: Record<string, any>;
}

// Tool argument interfaces
export interface AnalyzeContentBiasArgs {
  content: string;
  user_id?: string;
}

export interface GetComplianceReportArgs {
  days?: number;
  user_id?: string;
}

export interface QlooRecommendArgs {
  entity_type: string;
  entity_id: string;
  limit?: number;
  demographics?: string;
  cultural_filter?: string;
  min_cultural_relevance?: number;
  geographic_scope?: string;
  trending_only?: boolean;
  engagement_threshold?: number;
}

export interface QlooSearchArgs {
  query: string;
  type?: string;
  limit?: number;
}

export interface QlooAudienceCompareArgs {
  entities_group_a: string[];
  entities_group_b: string[];
}

export interface QlooTrendingArgs {
  entity_type: string;
  demographics?: string;
  time_period?: string;
  limit?: number;
  cultural_relevance_threshold?: number;
}

export interface GetCulturalTrendsArgs {
  content: string;
  demographics?: string;
  time_period?: string;
  limit?: number;
}

export interface BatchCulturalAuditArgs {
  requests: BatchAuditRequest[];
}

export interface AddRealtimeSignalArgs {
  entity_id: string;
  user_id?: string;
  interaction: string;
  value?: number;
  location?: string;
  metadata?: Record<string, any>;
}
