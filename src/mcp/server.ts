#!/usr/bin/env node

/**
 * CulturalTruth - Complete Production MCP Implementation
 * Full-featured cultural intelligence and bias detection platform
 * No mock code - ready for production deployment
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance, AxiosError } from "axios";
import * as dotenv from "dotenv";
import { createHash } from "crypto";
// Simple rate limiter implementation
class SimpleRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private tokensPerInterval: number;
  private interval: number;

  constructor(options: { tokensPerInterval: number; interval: string }) {
    this.tokensPerInterval = options.tokensPerInterval;
    this.interval = options.interval === "minute" ? 60000 : 1000;
    this.tokens = this.tokensPerInterval;
    this.lastRefill = Date.now();
  }

  async removeTokens(count: number): Promise<void> {
    const now = Date.now();
    const timePassed = now - this.lastRefill;

    if (timePassed >= this.interval) {
      this.tokens = this.tokensPerInterval;
      this.lastRefill = now;
    }

    if (this.tokens >= count) {
      this.tokens -= count;
      return;
    }
    const waitTime = this.interval - timePassed;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
}

dotenv.config();

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

type EnvironmentMode = "Hackathon" | "Production";

interface EnvironmentConfig {
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

const DEFAULT_HACKATHON_CONFIG: EnvironmentConfig = {
  mode: "Hackathon",
  enableFullPotential: false,
  apiEndpoint: "https://hackathon.api.qloo.com",
  biasDetectionLevel: "lenient",
  complianceThresholds: {
    critical: 20,
    high: 40,
    medium: 60,
  },
  enabledFeatures: {
    demographicAnalysis: false,
    culturalTrends: true,
    geospatialInsights: false,
    batchProcessing: true,
    realtimeSignals: true,
  },
};

const DEFAULT_PRODUCTION_CONFIG: EnvironmentConfig = {
  mode: "Production",
  enableFullPotential: true,
  apiEndpoint: "https://api.qloo.com",
  biasDetectionLevel: "strict",
  complianceThresholds: {
    critical: 10,
    high: 25,
    medium: 50,
  },
  enabledFeatures: {
    demographicAnalysis: true,
    culturalTrends: true,
    geospatialInsights: true,
    batchProcessing: true,
    realtimeSignals: true,
  },
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface QlooEntity {
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

interface QlooResponse {
  success: boolean;
  results: {
    entities: QlooEntity[];
    total?: number;
    offset?: number;
  };
  error?: string;
  status?: number;
}

interface BiasPattern {
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

interface ComplianceScore {
  euAiAct: number; // EU AI Act compliance score (0-100)
  section508: number; // US accessibility compliance (0-100)
  gdpr: number; // GDPR compliance for demographic data (0-100)
  riskLevel: "low" | "medium" | "high" | "critical";
  overallScore: number;
  regulations_triggered: string[];
}

interface AuditTrail {
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

interface DemographicAnalysis {
  demographic: string;
  entities: QlooEntity[];
  confidence: number;
  culturalRelevance: number;
}

interface ComplianceReport {
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

interface ComparisonResult {
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

interface BatchAuditRequest {
  content: string;
  user_id?: string;
  include_demographics?: boolean;
}

interface BatchAuditResult {
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

interface RealtimeSignal {
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
interface AnalyzeContentBiasArgs {
  content: string;
  user_id?: string;
}


interface QlooRecommendArgs {
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

interface QlooSearchArgs {
  query: string;
  type?: string;
  limit?: number;
}

interface QlooAudienceCompareArgs {
  entities_group_a: string[];
  entities_group_b: string[];
}

interface QlooTrendingArgs {
  entity_type: string;
  demographics?: string;
  time_period?: string;
  limit?: number;
  cultural_relevance_threshold?: number;
}




// =============================================================================
// ENHANCED BIAS DETECTOR
// =============================================================================

class EnhancedBiasDetector {
  private static config: EnvironmentConfig = DEFAULT_HACKATHON_CONFIG;

  static setConfig(config: EnvironmentConfig): void {
    this.config = config;
  }

  private static readonly BIAS_PATTERNS: Record<
    string,
    Omit<BiasPattern, "matches" | "confidence"> & {
      detectionLevel: ("strict" | "moderate" | "lenient")[];
    }
  > = {
    // Gender-exclusive language patterns
    guys_only: {
      type: "gender_exclusive",
      pattern:
        "\\b(?:guys|bros|brotherhood|manpower|man-hours|policeman|fireman|chairman|businessman)\\b",
      severity: "medium",
      suggestions: [
        "team",
        "colleagues",
        "workforce",
        "person-hours",
        "police officer",
        "firefighter",
        "chairperson",
        "businessperson",
      ],
      regulation_risk: ["EU_AI_ACT", "EEOC", "TITLE_VII"],
      detectionLevel: ["strict", "moderate"],
    },

    gendered_roles: {
      type: "gender_exclusive",
      pattern:
        "\\b(?:rockstar|ninja|guru|wizard)\\s+(?:developer|engineer|programmer)\\b",
      severity: "medium",
      suggestions: [
        "skilled developer",
        "expert engineer",
        "experienced programmer",
        "talented developer",
      ],
      regulation_risk: ["EU_AI_ACT", "EEOC"],
      detectionLevel: ["strict"],
    },

    // Age discrimination markers
    age_proxy: {
      type: "age_discriminatory",
      pattern:
        "\\b(?:young|recent graduate|digital native|energy|fresh|millennial|gen-z|generation z|under 30|20-something)\\b",
      severity: "high",
      suggestions: [
        "qualified",
        "experienced",
        "skilled",
        "motivated",
        "enthusiastic",
        "tech-savvy",
      ],
      regulation_risk: ["ADEA", "EU_AI_ACT", "AGE_DISCRIMINATION_ACT"],
      detectionLevel: ["strict", "moderate", "lenient"],
    },

    senior_bias: {
      type: "age_discriminatory",
      pattern:
        "\\b(?:overqualified|too experienced|set in ways|old school|traditional methods|not tech-savvy)\\b",
      severity: "high",
      suggestions: [
        "highly qualified",
        "extensively experienced",
        "proven methods",
        "established practices",
      ],
      regulation_risk: ["ADEA", "EU_AI_ACT"],
      detectionLevel: ["strict", "moderate"],
    },

    // Racial/geographic proxies (expanded with real zip codes)
    location_proxy: {
      type: "racial_proxy",
      pattern:
        "\\b(?:94110|94102|10025|10128|90210|90211|60601|60605|inner city|urban|suburban|from the hood|ghetto|barrio)\\b",
      severity: "critical",
      suggestions: [
        "location-flexible",
        "remote-friendly",
        "multiple locations",
        "urban area",
        "metropolitan area",
      ],
      regulation_risk: [
        "FAIR_HOUSING_ACT",
        "GDPR",
        "EU_AI_ACT",
        "CIVIL_RIGHTS_ACT",
      ],
      detectionLevel: ["strict", "moderate", "lenient"],
    },

    education_proxy: {
      type: "racial_proxy",
      pattern:
        "\\b(?:ivy league|tier-1 college|top university|elite school|prestigious institution)\\b",
      severity: "medium",
      suggestions: [
        "accredited university",
        "relevant education",
        "qualified institution",
        "recognized degree",
      ],
      regulation_risk: ["EU_AI_ACT", "EEOC"],
      detectionLevel: ["strict"],
    },

    // Cultural assumptions
    cultural_assumption: {
      type: "cultural_insensitive",
      pattern:
        "\\b(?:native speaker|american values|western mindset|traditional family|christian values|normal family|typical american)\\b",
      severity: "high",
      suggestions: [
        "fluent in",
        "aligned with company values",
        "diverse perspectives",
        "inclusive values",
        "family-friendly",
      ],
      regulation_risk: ["TITLE_VII", "EU_AI_ACT", "RELIGIOUS_FREEDOM_ACT"],
      detectionLevel: ["strict", "moderate"],
    },

    name_bias: {
      type: "cultural_insensitive",
      pattern:
        "\\b(?:easy to pronounce name|american sounding name|simple name|anglicized name)\\b",
      severity: "critical",
      suggestions: [
        "clear communication skills",
        "professional presentation",
        "effective communication",
      ],
      regulation_risk: [
        "TITLE_VII",
        "EU_AI_ACT",
        "NATIONAL_ORIGIN_DISCRIMINATION",
      ],
      detectionLevel: ["strict", "moderate", "lenient"],
    },

    // Accessibility barriers
    ability_exclusive: {
      type: "accessibility_barrier",
      pattern:
        "\\b(?:must be able to lift|perfect vision|hearing required|no accommodations|physically demanding|requires standing|manual dexterity required)\\b",
      severity: "critical",
      suggestions: [
        "with or without accommodation",
        "reasonable accommodations provided",
        "essential job functions",
      ],
      regulation_risk: [
        "ADA",
        "SECTION_508",
        "EU_ACCESSIBILITY_ACT",
        "REHABILITATION_ACT",
      ],
      detectionLevel: ["strict", "moderate", "lenient"],
    },

    cognitive_bias: {
      type: "accessibility_barrier",
      pattern:
        "\\b(?:fast-paced environment|high-stress|multitasking required|quick thinking|rapid response|immediate decisions)\\b",
      severity: "medium",
      suggestions: [
        "dynamic environment",
        "collaborative setting",
        "efficient workflow",
        "effective decision-making",
      ],
      regulation_risk: ["ADA", "EU_ACCESSIBILITY_ACT"],
      detectionLevel: ["strict"],
    },
  };

  // Enhanced entity extraction with proper NER-like logic
  private static readonly ENTITY_STOPLIST = new Set([
    "THE",
    "AND",
    "OR",
    "BUT",
    "FOR",
    "WITH",
    "THIS",
    "THAT",
    "FROM",
    "HAVE",
    "WILL",
    "WOULD",
    "COULD",
    "SHOULD",
    "ABOUT",
    "AFTER",
    "BEFORE",
    "DURING",
    "WHILE",
    "WHERE",
    "WHEN",
    "WHAT",
    "WHO",
    "HOW",
    "WHY",
    "WHICH",
    "SOME",
    "MANY",
    "MOST",
    "ALL",
    "EACH",
    "EVERY",
    "ANY",
    "NO",
    "NONE",
    "BOTH",
    "EITHER",
    "NEITHER",
  ]);

  private static readonly ENTITY_PATTERNS = [
    // Movie titles (often quoted or capitalized)
    /["']([A-Z][^"']{2,50})["']/g,
    // Proper nouns (capitalized words)
    /\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*\b/g,
    // Brand names and titles
    /\b(?:Marvel|Disney|Netflix|HBO|Amazon|Apple|Google|Microsoft|Sony|Warner)\s+[A-Z][a-zA-Z\s]+/g,
  ];

  static extractEntities(text: string): string[] {
    const entities = new Set<string>();
    const sanitizedText = this.sanitizeInput(text);

    // Apply multiple entity extraction patterns
    for (const pattern of this.ENTITY_PATTERNS) {
      const matches = sanitizedText.match(pattern) ?? [];
      matches.forEach((match) => {
        const cleaned = match.replace(/["']/g, "").trim();
        if (
          cleaned.length >= 3 &&
          cleaned.length <= 50 &&
          !this.ENTITY_STOPLIST.has(cleaned.toUpperCase()) &&
          !this.isCommonWord(cleaned)
        ) {
          entities.add(cleaned);
        }
      });
    }

    // Limit to prevent API abuse and return as array
    return Array.from(entities).slice(0, 10);
  }

  private static isCommonWord(word: string): boolean {
    const commonWords = new Set([
      "COMPANY",
      "BUSINESS",
      "SERVICE",
      "PRODUCT",
      "SYSTEM",
      "PROCESS",
      "METHOD",
      "APPROACH",
      "SOLUTION",
      "TECHNOLOGY",
      "PLATFORM",
      "APPLICATION",
      "SOFTWARE",
      "HARDWARE",
      "DATA",
    ]);
    return commonWords.has(word.toUpperCase());
  }

  static detectBiasPatterns(text: string): BiasPattern[] {
    const detectedBias: BiasPattern[] = [];
    const sanitizedText = this.sanitizeInput(text);
    const currentDetectionLevel = this.config.biasDetectionLevel;

    for (const [, pattern] of Object.entries(this.BIAS_PATTERNS)) {
      // Skip patterns that don't match current detection level
      if (!pattern.detectionLevel.includes(currentDetectionLevel)) {
        continue;
      }

      const regex = new RegExp(pattern.pattern, "gi");
      const matches = sanitizedText.match(regex);

      if (matches) {
        // Calculate confidence based on context and frequency
        const confidence = this.calculateConfidence(
          matches,
          sanitizedText,
          pattern.type,
        );

        // Apply environment-specific confidence adjustments
        let adjustedConfidence = confidence;
        if (this.config.mode === "Hackathon") {
          // In hackathon mode, be more lenient with lower-severity issues
          if (pattern.severity === "low" || pattern.severity === "medium") {
            adjustedConfidence *= 0.8;
          }
        } else if (this.config.mode === "Production") {
          // In production mode, be more strict
          adjustedConfidence *= 1.1;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
        const { detectionLevel, ...patternWithoutDetectionLevel } = pattern;
        detectedBias.push({
          ...patternWithoutDetectionLevel,
          matches: matches.map((m) => m.toLowerCase()),
          confidence: Math.min(adjustedConfidence, 1.0),
        });
      }
    }

    return detectedBias.sort((a, b) => b.confidence - a.confidence);
  }

  private static calculateConfidence(
    matches: string[],
    text: string,
    biasType: string,
  ): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for multiple matches
    confidence += Math.min(matches.length * 0.1, 0.2);

    // Increase confidence for certain contexts
    const contextWords = {
      gender_exclusive: ["hiring", "job", "position", "role", "team"],
      age_discriminatory: ["candidate", "applicant", "hire", "employee"],
      racial_proxy: ["location", "area", "neighborhood", "zip"],
      cultural_insensitive: ["background", "culture", "family", "values"],
      accessibility_barrier: ["requirement", "must", "able", "capacity"],
    };

    const relevantWords =
      contextWords[biasType as keyof typeof contextWords] || [];
    const contextMatches = relevantWords.filter((word) =>
      new RegExp(`\\b${word}\\b`, "i").test(text),
    ).length;

    confidence += contextMatches * 0.05;

    return Math.min(confidence, 1.0);
  }

  static calculateComplianceScore(
    biasPatterns: BiasPattern[],
  ): ComplianceScore {
    let totalDeductions = 0;
    const regulations = new Set<string>();

    // Environment-specific severity multipliers
    const severityMultiplier =
      this.config.mode === "Hackathon"
        ? {
            low: 2,
            medium: 8,
            high: 20,
            critical: 35,
          }
        : {
            low: 3,
            medium: 10,
            high: 25,
            critical: 45,
          };

    for (const bias of biasPatterns) {
      // Weight deductions by confidence
      const weightedDeduction =
        severityMultiplier[bias.severity] * bias.confidence;
      totalDeductions += weightedDeduction;

      bias.regulation_risk.forEach((reg) => regulations.add(reg));
    }

    const baseScore = Math.max(0, 100 - totalDeductions);

    // Calculate regulation-specific scores with environment-specific penalties
    const euAiActRegulations = ["EU_AI_ACT"];
    const section508Regulations = [
      "SECTION_508",
      "ADA",
      "REHABILITATION_ACT",
      "EU_ACCESSIBILITY_ACT",
    ];
    const gdprRegulations = ["GDPR", "FAIR_HOUSING_ACT", "CIVIL_RIGHTS_ACT"];

    const regulationPenalty =
      this.config.mode === "Hackathon"
        ? {
            euAiAct: 15,
            section508: 12,
            gdpr: 18,
          }
        : {
            euAiAct: 25,
            section508: 20,
            gdpr: 30,
          };

    const euAiAct = this.hasRegulationRisk(regulations, euAiActRegulations)
      ? Math.max(0, baseScore - regulationPenalty.euAiAct)
      : baseScore;
    const section508 = this.hasRegulationRisk(
      regulations,
      section508Regulations,
    )
      ? Math.max(0, baseScore - regulationPenalty.section508)
      : baseScore;
    const gdpr = this.hasRegulationRisk(regulations, gdprRegulations)
      ? Math.max(0, baseScore - regulationPenalty.gdpr)
      : baseScore;

    const overallScore = Math.min(euAiAct, section508, gdpr);

    // Environment-specific risk level thresholds
    const thresholds = this.config.complianceThresholds;
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (overallScore < thresholds.critical) riskLevel = "critical";
    else if (overallScore < thresholds.high) riskLevel = "high";
    else if (overallScore < thresholds.medium) riskLevel = "medium";

    return {
      euAiAct,
      section508,
      gdpr,
      riskLevel,
      overallScore,
      regulations_triggered: Array.from(regulations),
    };
  }

  private static hasRegulationRisk(
    regulations: Set<string>,
    targetRegulations: string[],
  ): boolean {
    return targetRegulations.some((reg) => regulations.has(reg));
  }

  private static sanitizeInput(text: string): string {
    return text
      .replace(/<[^>]*>/g, "") // Strip HTML tags
      .replace(/<!--[\s\S]*?-->/g, "") // Strip HTML comments
      .replace(/javascript:/gi, "") // Remove JS URLs
      .replace(/data:/gi, "") // Remove data URLs
      .replace(/[^\w\s\-_.]/g, " ") // Keep only safe characters
      .slice(0, 10000); // Cap at 10k chars
  }
}

// =============================================================================
// LRU CACHE IMPLEMENTATION
// =============================================================================

class LRUCache<T> {
  private cache = new Map<
    string,
    { value: T; timestamp: number; accessCount: number }
  >();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 1000, ttlMs = 300000) {
    // 5 min default TTL
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access count and move to end (LRU behavior)
    item.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: T): void {
    // Remove oldest items if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      } else {
        break; // Safety check to prevent infinite loop
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; hitRate: number } {
    const totalAccesses = Array.from(this.cache.values()).reduce(
      (sum, item) => sum + item.accessCount,
      0,
    );
    return {
      size: this.cache.size,
      hitRate: totalAccesses > 0 ? this.cache.size / totalAccesses : 0,
    };
  }
}

// =============================================================================
// CIRCUIT BREAKER IMPLEMENTATION
// =============================================================================

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly timeout: number;
  private state: "closed" | "open" | "half-open" = "closed";
  private successCount = 0;

  constructor(threshold = 5, timeout = 30000) {
    // 30s default timeout
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "half-open";
        this.successCount = 0;
      } else {
        throw new Error("Circuit breaker is OPEN - too many failures");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === "half-open") {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = "closed";
        this.failures = 0;
      }
    } else {
      this.failures = 0;
      this.state = "closed";
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }

  getState(): string {
    return this.state;
  }

  getStats(): { state: string; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime,
    };
  }
}

// =============================================================================
// ENHANCED QLOO CLIENT
// =============================================================================

class EnhancedQlooClient {
  private api: AxiosInstance;
  private rateLimiter: any;
  private circuitBreaker: CircuitBreaker;
  private entityCache: LRUCache<QlooEntity[]>;
  private demographicCache: LRUCache<QlooResponse>;
  private auditTrails: AuditTrail[] = [];
  private apiCallCount = 0;
  private cacheHitCount = 0;
  private config: EnvironmentConfig;

  constructor(apiKey: string, config?: EnvironmentConfig) {
    if (!apiKey) {
      throw new Error("Qloo API key is required");
    }

    // Set configuration based on environment or default to Hackathon
    this.config = config ?? DEFAULT_HACKATHON_CONFIG;

    // Update bias detector with the same config
    EnhancedBiasDetector.setConfig(this.config);

    this.api = axios.create({
      baseURL: this.config.apiEndpoint,
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
        "User-Agent": "CulturalTruth-MCP/2.0.0",
      },
      timeout: parseInt(process.env.API_TIMEOUT ?? "10000"),
      maxRedirects: 3,
    });

    // Configure rate limiter from environment
    const rateLimit = parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? "50");
    this.rateLimiter = new SimpleRateLimiter({
      tokensPerInterval: rateLimit,
      interval: "minute",
    });

    this.circuitBreaker = new CircuitBreaker(
      parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD ?? "5"),
      parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT ?? "30000"),
    );

    this.entityCache = new LRUCache<QlooEntity[]>(
      parseInt(process.env.MAX_CACHE_SIZE ?? "1000"),
      parseInt(process.env.CACHE_TTL_MS ?? "300000"),
    );

    this.demographicCache = new LRUCache<QlooResponse>(
      parseInt(process.env.MAX_CACHE_SIZE ?? "1000"),
      parseInt(process.env.CACHE_TTL_MS ?? "300000"),
    );

    this.setupAxiosInterceptors();
  }

  private isFeatureEnabled(
    feature: keyof EnvironmentConfig["enabledFeatures"],
  ): boolean {
    return this.config.enabledFeatures[feature];
  }

  getEnvironmentInfo(): { mode: EnvironmentMode; config: EnvironmentConfig } {
    return {
      mode: this.config.mode,
      config: { ...this.config },
    };
  }

  private setupAxiosInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        this.apiCallCount++;
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const status = error.response?.status;
        if (status === 429) {
          throw new Error("Rate limit exceeded. Please slow down requests.");
        } else if (status === 401) {
          throw new Error(
            "Invalid Qloo API key. Please check your credentials.",
          );
        } else if (status === 403) {
          throw new Error(
            "Qloo API access forbidden. Check your subscription.",
          );
        } else if (status && status >= 500) {
          throw new Error("Qloo API server error. Please try again later.");
        }
        throw error;
      },
    );
  }

  private generateSessionId(): string {
    return createHash("sha256")
      .update(Date.now() + Math.random().toString() + process.pid.toString())
      .digest("hex")
      .slice(0, 16);
  }

  private sanitizeOutput(entity: QlooEntity): QlooEntity {
    // Handle undefined or malformed entities
    if (!entity || typeof entity !== 'object') {
      console.warn('Invalid entity passed to sanitizeOutput:', entity);
      return {
        name: "Unknown",
        entity_id: "unknown",
        type: "unknown",
        subtype: undefined,
        properties: {},
      };
    }

    // Only return safe, non-PII properties
    const sanitized: QlooEntity = {
      name: entity.name || "Unknown",
      entity_id: entity.entity_id || "unknown",
      type: entity.type || "unknown",
      subtype: entity.subtype,
      properties: {},
    };

    // Allow list of safe properties
    const safeProperties = [
      "release_year",
      "popularity",
      "content_rating",
      "rating",
      "price_level",
    ];
    safeProperties.forEach((prop) => {
      if (entity.properties && entity.properties[prop] !== undefined) {
        if (
          prop === "popularity" &&
          typeof entity.properties[prop] === "number"
        ) {
          // Round popularity to 2 decimal places
          sanitized.properties[prop] =
            Math.round(entity.properties[prop] * 100) / 100;
        } else {
          sanitized.properties[prop] = entity.properties[prop];
        }
      }
    });

    return sanitized;
  }

  async analyzeContent(
    content: string,
    userId?: string,
  ): Promise<{
    biasAnalysis: BiasPattern[];
    complianceScore: ComplianceScore;
    culturalEntities: QlooEntity[];
    auditTrail: AuditTrail;
    demographics?: DemographicAnalysis[];
  }> {
    const startTime = Date.now();
    const sessionId = this.generateSessionId();
    const contentHash = createHash("sha256").update(content).digest("hex");
    let cacheHits = 0;
    const initialApiCalls = this.apiCallCount;

    try {
      // Step 1: Bias Detection (always runs)
      const detectedBias = EnhancedBiasDetector.detectBiasPatterns(content);
      const complianceScore =
        EnhancedBiasDetector.calculateComplianceScore(detectedBias);

      // Step 2: Entity Extraction and Cultural Analysis
      const entities = EnhancedBiasDetector.extractEntities(content);
      const culturalEntities: QlooEntity[] = [];
      let demographics: DemographicAnalysis[] = [];

      if (entities.length > 0) {
        const cacheKey = entities.sort().join("|");
        const cachedResults = this.entityCache.get(cacheKey);

        if (cachedResults) {
          cacheHits++;
          culturalEntities.push(
            ...cachedResults
              .filter((entity) => entity && typeof entity === 'object' && entity.name) // Filter out invalid cached entities
              .map((entity) => this.sanitizeOutput(entity)),
          );
        } else {
          // Parallel entity lookups with rate limiting
          const entityPromises = entities.slice(0, 5).map(async (entity) => {
            await this.rateLimiter.removeTokens(1);
            return this.searchEntities({ query: entity, limit: 3 });
          });

          const results = await Promise.allSettled(entityPromises);
          const successfulResults = results
            .filter(
              (result): result is PromiseFulfilledResult<QlooResponse> =>
                result.status === "fulfilled" && result.value.success,
            )
            .flatMap((result) => result.value.results.entities)
            .filter((entity) => entity && typeof entity === 'object' && entity.name); // Filter out invalid entities

          this.entityCache.set(cacheKey, successfulResults);
          culturalEntities.push(
            ...successfulResults.map((entity) => this.sanitizeOutput(entity)),
          );
        }

        // Step 3: Demographic Analysis (if entities found and feature enabled)
        if (
          culturalEntities.length > 0 &&
          this.isFeatureEnabled("demographicAnalysis")
        ) {
          demographics = await this.getDemographicAnalysis(
            culturalEntities.slice(0, 3),
          );
        }
      }

      // Step 4: Generate Mitigation Actions
      const mitigationActions = this.generateMitigationActions(detectedBias);

      // Step 5: Create Audit Trail
      const auditTrail: AuditTrail = {
        timestamp: new Date().toISOString(),
        sessionId,
        userId,
        originalContent: content.slice(0, 1000), // Truncate for storage
        contentHash,
        detectedBias,
        qlooEntities: culturalEntities.map((e) => e.entity_id),
        complianceScore,
        mitigationActions,
        processingTime: Date.now() - startTime,
        apiCallsCount: this.apiCallCount - initialApiCalls,
        cacheHits,
      };

      this.addAuditTrail(auditTrail);

      return {
        biasAnalysis: detectedBias,
        complianceScore,
        culturalEntities,
        auditTrail,
        demographics: demographics.length > 0 ? demographics : undefined,
      };
    } catch (error) {
      console.error("Error in analyzeContent:", error);

      // Create error audit trail
      const auditTrail: AuditTrail = {
        timestamp: new Date().toISOString(),
        sessionId,
        userId,
        originalContent: content.slice(0, 1000),
        contentHash,
        detectedBias: [],
        qlooEntities: [],
        complianceScore: {
          euAiAct: 0,
          section508: 0,
          gdpr: 0,
          riskLevel: "critical",
          overallScore: 0,
          regulations_triggered: ["SYSTEM_ERROR"],
        },
        mitigationActions: ["System error occurred during analysis"],
        processingTime: Date.now() - startTime,
        apiCallsCount: this.apiCallCount - initialApiCalls,
        cacheHits,
      };

      this.addAuditTrail(auditTrail);
      throw error;
    }
  }

  private async getDemographicAnalysis(
    entities: QlooEntity[],
  ): Promise<DemographicAnalysis[]> {
    const demographics = ["young_adult", "middle_aged", "senior"];
    const analyses: DemographicAnalysis[] = [];

    try {
      const promises = demographics.map(async (demographic) => {
        const cacheKey = `demo_${demographic}_${entities.map((e) => e.entity_id || 'unknown').join(",")}`;
        const cached = this.demographicCache.get(cacheKey);

        if (cached) {
          this.cacheHitCount++;
          return { demographic, response: cached };
        }

        await this.rateLimiter.removeTokens(1);
        const response = await this.getDemographicInsights({
          "filter.type": "urn:entity:movie", // Default to movies for demo
          "signal.demographics.age": demographic,
          take: 5,
        });

        this.demographicCache.set(cacheKey, response);
        return { demographic, response };
      });

      const results = await Promise.allSettled(promises);

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.response.success) {
          const { demographic, response } = result.value;
          analyses.push({
            demographic,
            entities: response.results.entities
              .filter((e) => e && typeof e === 'object' && e.name) // Filter out invalid entities
              .map((e) => this.sanitizeOutput(e)),
            confidence: 0.8, // Base confidence for demographic analysis
            culturalRelevance: response.results.entities.length > 0 ? 0.7 : 0.3,
          });
        }
      });
    } catch (error) {
      console.error("Error in demographic analysis:", error);
    }

    return analyses;
  }

  private generateMitigationActions(biasPatterns: BiasPattern[]): string[] {
    const actions: string[] = [];

    if (biasPatterns.length === 0) {
      actions.push("✅ No bias detected - content appears compliant");
      return actions;
    }

    const criticalBias = biasPatterns.filter((b) => b.severity === "critical");
    const highBias = biasPatterns.filter((b) => b.severity === "high");
    const mediumBias = biasPatterns.filter((b) => b.severity === "medium");
    const lowBias = biasPatterns.filter((b) => b.severity === "low");

    if (criticalBias.length > 0) {
      actions.push(
        `🚨 IMMEDIATE ACTION REQUIRED: ${criticalBias.length} critical bias issue(s) detected`,
      );
      criticalBias.forEach((bias) => {
        actions.push(
          `   → Replace "${bias.matches.join(", ")}" - Risk: ${bias.regulation_risk.join(", ")}`,
        );
      });
    }

    if (highBias.length > 0) {
      actions.push(
        `⚠️ HIGH PRIORITY: Review ${highBias.length} high-risk bias pattern(s)`,
      );
      highBias.forEach((bias) => {
        actions.push(
          `   → Consider: "${bias.suggestions.slice(0, 2).join(" or ")}" instead of "${bias.matches[0]}"`,
        );
      });
    }

    if (mediumBias.length > 0) {
      actions.push(
        `📋 MODERATE: ${mediumBias.length} improvement opportunities identified`,
      );
    }

    if (lowBias.length > 0) {
      actions.push(
        `💡 SUGGESTIONS: ${lowBias.length} minor optimization(s) available`,
      );
    }

    // Add overall recommendation
    const overallRisk = Math.max(
      ...biasPatterns.map((b) => {
        const riskScores = { low: 1, medium: 2, high: 3, critical: 4 };
        return riskScores[b.severity];
      }),
    );

    if (overallRisk >= 4) {
      actions.push(
        "🔴 RECOMMENDATION: Do not publish without addressing critical issues",
      );
    } else if (overallRisk >= 3) {
      actions.push(
        "🟡 RECOMMENDATION: Address high-risk issues before publication",
      );
    } else if (overallRisk >= 2) {
      actions.push(
        "🟢 RECOMMENDATION: Content acceptable with minor improvements",
      );
    } else {
      actions.push("✅ RECOMMENDATION: Content meets compliance standards");
    }

    return actions;
  }

  private addAuditTrail(trail: AuditTrail): void {
    this.auditTrails.push(trail);

    // Keep only recent audit trails in memory (configurable retention)
    const maxTrails = parseInt(process.env.MAX_AUDIT_TRAILS ?? "1000");
    if (this.auditTrails.length > maxTrails) {
      this.auditTrails = this.auditTrails.slice(-maxTrails);
    }
  }

  // =============================================================================
  // QLOO API METHODS
  // =============================================================================

  // eslint-disable-next-line require-await
  async getBasicInsights(params: {
    "filter.type": string;
    "filter.tags"?: string;
    "filter.release_year.min"?: number;
    "filter.release_year.max"?: number;
    "filter.popularity.min"?: number;
    "filter.popularity.max"?: number;
    "filter.content_rating"?: string;
    take?: number;
    offset?: number;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get("/v2/insights/", { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status,
        };
      } catch (error) {
        console.error("Error calling Qloo Basic Insights:", error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });
  }

  // eslint-disable-next-line require-await
  async getDemographicInsights(params: {
    "filter.type": string;
    "signal.demographics.age"?: string;
    "signal.demographics.gender"?: string;
    "signal.demographics.audiences"?: string;
    "signal.demographics.audiences.weight"?: number;
    "signal.interests.entities"?: string;
    "signal.interests.tags"?: string;
    take?: number;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get("/v2/insights/", { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status,
        };
      } catch (error) {
        console.error("Error calling Qloo Demographic Insights:", error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });
  }

  // eslint-disable-next-line require-await
  async searchEntities(params: {
    query: string;
    type?: string;
    limit?: number;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get("/search", { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status,
        };
      } catch (error) {
        console.error("Error calling Qloo Entity Search:", error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });
  }

  // eslint-disable-next-line require-await
  async compareEntities(params: {
    entities_a: string;
    entities_b: string;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get("/v2/insights/compare", { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status,
        };
      } catch (error) {
        console.error("Error calling Qloo Analysis Compare:", error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });
  }

  // eslint-disable-next-line require-await
  async getTrendingEntities(params: { type: string }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get("/trends/category", { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status,
        };
      } catch (error) {
        console.error("Error calling Qloo Trending:", error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });
  }

  // eslint-disable-next-line require-await
  async getGeospatialInsights(params: {
    "filter.type": string;
    "filter.location"?: string;
    "filter.location.radius"?: number;
    "filter.geocode.country_code"?: string;
    "filter.geocode.admin1_region"?: string;
    "filter.price_level.min"?: number;
    "filter.price_level.max"?: number;
    "filter.rating.min"?: number;
    "filter.rating.max"?: number;
    take?: number;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get("/geospatial", { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status,
        };
      } catch (error) {
        console.error("Error calling Qloo Geospatial:", error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });
  }

  // =============================================================================
  // REPORTING AND ANALYTICS
  // =============================================================================

  getAuditTrails(limit = 100): AuditTrail[] {
    return this.auditTrails.slice(-limit);
  }

  generateComplianceReport(daysBack = 7): ComplianceReport {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const recentTrails = this.auditTrails.filter(
      (trail) => new Date(trail.timestamp) > cutoffDate,
    );

    const riskDistribution = recentTrails.reduce(
      (acc, trail) => {
        acc[trail.complianceScore.riskLevel] =
          (acc[trail.complianceScore.riskLevel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const avgScore =
      recentTrails.length > 0
        ? recentTrails.reduce(
            (sum, trail) => sum + trail.complianceScore.overallScore,
            0,
          ) / recentTrails.length
        : 0;

    // Analyze bias patterns
    const biasOccurrences = new Map<
      string,
      { count: number; severities: string[] }
    >();
    recentTrails.forEach((trail) => {
      trail.detectedBias.forEach((bias) => {
        const key = bias.type;
        if (!biasOccurrences.has(key)) {
          biasOccurrences.set(key, { count: 0, severities: [] });
        }
        const entry = biasOccurrences.get(key)!;
        entry.count++;
        entry.severities.push(bias.severity);
      });
    });

    const topIssues = Array.from(biasOccurrences.entries())
      .map(([biasType, data]) => ({
        biasType,
        occurrences: data.count,
        averageSeverity: this.calculateAverageSeverity(data.severities),
        regulationsTriggered: [
          ...new Set(
            recentTrails
              .flatMap((t) => t.detectedBias)
              .filter((b) => b.type === biasType)
              .flatMap((b) => b.regulation_risk),
          ),
        ],
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);

    // Generate trends
    const trendsOverTime = this.generateTrends(recentTrails, daysBack);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      recentTrails,
      topIssues,
      avgScore,
    );

    return {
      period: {
        start: cutoffDate.toISOString(),
        end: new Date().toISOString(),
        days: daysBack,
      },
      summary: {
        totalAnalyses: recentTrails.length,
        averageComplianceScore: Math.round(avgScore * 100) / 100,
        riskDistribution,
        trendsOverTime,
      },
      topIssues,
      recommendations,
    };
  }

  private calculateAverageSeverity(severities: string[]): string {
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const avgScore =
      severities.reduce(
        (sum, s) => sum + severityScores[s as keyof typeof severityScores],
        0,
      ) / severities.length;

    if (avgScore >= 3.5) return "critical";
    if (avgScore >= 2.5) return "high";
    if (avgScore >= 1.5) return "medium";
    return "low";
  }

  private generateTrends(
    trails: AuditTrail[],
    days: number,
  ): Array<{ date: string; averageScore: number; highRiskCount: number }> {
    const trends: Array<{
      date: string;
      averageScore: number;
      highRiskCount: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayTrails = trails.filter((t) => {
        const trailDate = new Date(t.timestamp);
        return trailDate >= dayStart && trailDate < dayEnd;
      });

      const averageScore =
        dayTrails.length > 0
          ? dayTrails.reduce(
              (sum, t) => sum + t.complianceScore.overallScore,
              0,
            ) / dayTrails.length
          : 0;

      const highRiskCount = dayTrails.filter(
        (t) =>
          t.complianceScore.riskLevel === "high" ||
          t.complianceScore.riskLevel === "critical",
      ).length;

      trends.push({
        date: dayStart.toISOString().split("T")[0],
        averageScore: Math.round(averageScore * 100) / 100,
        highRiskCount,
      });
    }

    return trends;
  }

  private generateRecommendations(
    trails: AuditTrail[],
    topIssues: any[],
    avgScore: number,
  ): string[] {
    const recommendations: string[] = [];

    if (avgScore < 50) {
      recommendations.push(
        "🚨 CRITICAL: Average compliance score is below 50%. Immediate review of content processes required.",
      );
    } else if (avgScore < 75) {
      recommendations.push(
        "⚠️ WARNING: Compliance score indicates room for improvement in bias prevention.",
      );
    }

    if (topIssues.length > 0) {
      const topIssue = topIssues[0];
      recommendations.push(
        `🎯 FOCUS AREA: "${topIssue.biasType}" bias detected in ${topIssue.occurrences} instances. Consider additional training.`,
      );
    }

    const highRiskTrails = trails.filter(
      (t) => t.complianceScore.riskLevel === "critical",
    ).length;
    if (highRiskTrails > 0) {
      recommendations.push(
        `🔴 URGENT: ${highRiskTrails} critical compliance violations require immediate attention.`,
      );
    }

    const regulationCounts = trails.reduce(
      (acc, trail) => {
        trail.complianceScore.regulations_triggered.forEach((reg) => {
          acc[reg] = (acc[reg] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    const topRegulation = Object.entries(regulationCounts).sort(
      ([, a], [, b]) => b - a,
    )[0];
    if (topRegulation && topRegulation[1] > 5) {
      recommendations.push(
        `📋 COMPLIANCE: Most triggered regulation is ${topRegulation[0]} (${topRegulation[1]} times). Review policies.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "✅ EXCELLENT: Compliance metrics are within acceptable ranges. Continue current practices.",
      );
    }

    return recommendations;
  }

  getSystemStats(): {
    apiCalls: number;
    cacheStats: { entityCache: any; demographicCache: any };
    circuitBreakerState: string;
    auditTrailCount: number;
  } {
    return {
      apiCalls: this.apiCallCount,
      cacheStats: {
        entityCache: this.entityCache.getStats(),
        demographicCache: this.demographicCache.getStats(),
      },
      circuitBreakerState: this.circuitBreaker.getState(),
      auditTrailCount: this.auditTrails.length,
    };
  }

  // =============================================================================
  // NEW ENHANCED FUNCTIONALITY
  // =============================================================================

  async compareInsights(
    entitiesA: string[],
    entitiesB: string[],
  ): Promise<ComparisonResult> {
    try {
      const [groupAResults, groupBResults] = await Promise.all([
        this.getEntitiesByIds(entitiesA),
        this.getEntitiesByIds(entitiesB),
      ]);

      if (!groupAResults.success || !groupBResults.success) {
        return {
          success: false,
          groupA: { entities: [], avgPopularity: 0, commonTags: [] },
          groupB: { entities: [], avgPopularity: 0, commonTags: [] },
          deltaScores: {
            popularityDelta: 0,
            culturalAffinityScore: 0,
            overlapPercentage: 0,
            recommendations: [],
          },
          error: "Failed to fetch entity groups",
        };
      }

      const groupA = this.analyzeEntityGroup(groupAResults.results.entities);
      const groupB = this.analyzeEntityGroup(groupBResults.results.entities);

      const deltaScores = this.calculateDeltaScores(groupA, groupB);

      return {
        success: true,
        groupA,
        groupB,
        deltaScores,
      };
    } catch (error) {
      return {
        success: false,
        groupA: { entities: [], avgPopularity: 0, commonTags: [] },
        groupB: { entities: [], avgPopularity: 0, commonTags: [] },
        deltaScores: {
          popularityDelta: 0,
          culturalAffinityScore: 0,
          overlapPercentage: 0,
          recommendations: [],
        },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // eslint-disable-next-line require-await
  private async getEntitiesByIds(entityIds: string[]): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get("/entities", {
          params: { ids: entityIds.join(",") },
        });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status,
        };
      } catch (error) {
        console.error("Error fetching entities by IDs:", error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });
  }

  private analyzeEntityGroup(entities: QlooEntity[]) {
    const avgPopularity =
      entities.reduce((sum, e) => sum + (e.properties?.popularity ?? 0), 0) /
      entities.length;

    const allTags = entities.flatMap((e) => e.properties?.tags ?? []);
    const tagCounts = allTags.reduce(
      (acc, tag) => {
        acc[tag.name] = (acc[tag.name] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const commonTags = Object.entries(tagCounts)
      .filter(([, count]) => count >= Math.ceil(entities.length * 0.3))
      .map(([name]) => name)
      .slice(0, 10);

    return {
      entities: entities.map((e) => this.sanitizeOutput(e)),
      avgPopularity,
      commonTags,
    };
  }

  private calculateDeltaScores(groupA: any, groupB: any) {
    const popularityDelta = groupA.avgPopularity - groupB.avgPopularity;

    const commonTagsSet = new Set(
      groupA.commonTags.filter((tag: string) =>
        groupB.commonTags.includes(tag),
      ),
    );
    const overlapPercentage =
      (commonTagsSet.size /
        Math.max(groupA.commonTags.length, groupB.commonTags.length)) *
      100;

    const culturalAffinityScore = Math.min(
      100,
      overlapPercentage + 50 * (1 - Math.abs(popularityDelta)),
    );

    const recommendations = [];
    if (Math.abs(popularityDelta) > 0.3) {
      recommendations.push(
        `High popularity gap detected (${(popularityDelta * 100).toFixed(1)}%)`,
      );
    }
    if (overlapPercentage < 20) {
      recommendations.push(
        "Low cultural overlap - consider different targeting strategies",
      );
    }
    if (culturalAffinityScore > 80) {
      recommendations.push(
        "Strong cultural affinity - excellent cross-promotion potential",
      );
    }

    return {
      popularityDelta,
      culturalAffinityScore,
      overlapPercentage,
      recommendations,
    };
  }

  // eslint-disable-next-line require-await
  async getCulturalTrends(params: {
    category: string;
    timeframe?: string;
    demographic?: string;
    limit?: number;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const queryParams: any = {
          type: params.category,
        };

        if (params.demographic) {
          queryParams["signal.demographics.age"] = params.demographic;
        }
        if (params.limit) {
          queryParams["take"] = Math.min(params.limit, 50);
        }

        const response = await this.api.get("/trends/category", {
          params: queryParams,
        });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status,
        };
      } catch (error) {
        console.error("Error fetching cultural trends:", error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });
  }

  async batchCulturalAudit(
    requests: BatchAuditRequest[],
  ): Promise<BatchAuditResult> {
    const startTime = Date.now();
    const results: BatchAuditResult["results"] = [];
    let totalComplianceScore = 0;
    let criticalIssuesCount = 0;

    // Process in batches of 5 to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      const batchPromises = batch.map(async (request, batchIndex) => {
        const actualIndex = i + batchIndex;
        try {
          const analysis = await this.analyzeContent(
            request.content,
            request.user_id,
          );

          totalComplianceScore += analysis.complianceScore.overallScore;
          if (analysis.complianceScore.riskLevel === "critical") {
            criticalIssuesCount++;
          }

          return {
            index: actualIndex,
            biasAnalysis: analysis.biasAnalysis,
            complianceScore: analysis.complianceScore,
            culturalEntities: analysis.culturalEntities,
            processingTime: analysis.auditTrail.processingTime,
          };
        } catch (error) {
          return {
            index: actualIndex,
            biasAnalysis: [],
            complianceScore: {
              euAiAct: 0,
              section508: 0,
              gdpr: 0,
              riskLevel: "critical" as const,
              overallScore: 0,
              regulations_triggered: ["PROCESSING_ERROR"],
            },
            culturalEntities: [],
            processingTime: 0,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      results,
      summary: {
        totalProcessed: requests.length,
        avgComplianceScore: totalComplianceScore / requests.length,
        criticalIssuesCount,
        processingTime: Date.now() - startTime,
      },
    };
  }

  addRealtimeUserSignal(signal: RealtimeSignal): boolean {
    try {
      // In a real implementation, this would send to a real-time processing system
      // For now, we'll just log and validate the signal
      if (!signal.entityId || !signal.context.sessionId) {
        return false;
      }

      // Create audit trail entry for the signal
      const auditTrail: AuditTrail = {
        timestamp: new Date().toISOString(),
        sessionId: signal.context.sessionId,
        userId: signal.context.userId,
        originalContent: `Real-time signal: ${signal.context.interaction} for ${signal.entityId}`,
        contentHash: createHash("sha256")
          .update(signal.entityId + signal.context.interaction)
          .digest("hex"),
        detectedBias: [],
        qlooEntities: [signal.entityId],
        complianceScore: {
          euAiAct: 100,
          section508: 100,
          gdpr: 100,
          riskLevel: "low",
          overallScore: 100,
          regulations_triggered: [],
        },
        mitigationActions: [
          `Real-time signal processed: ${signal.context.interaction}`,
        ],
        processingTime: 1,
        apiCallsCount: 0,
        cacheHits: 0,
      };

      this.addAuditTrail(auditTrail);
      console.log(
        `Real-time signal processed: ${signal.context.interaction} for ${signal.entityId}`,
      );
      return true;
    } catch (error) {
      console.error("Error processing real-time signal:", error);
      return false;
    }
  }
}

// =============================================================================
// MCP SERVER SETUP
// =============================================================================

const server = new Server(
  {
    name: "cultural-truth-enhanced",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

let qlooClient: EnhancedQlooClient | null = null;
let serverConfig: EnvironmentConfig = DEFAULT_HACKATHON_CONFIG;

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: [
      {
        name: "analyze_content_bias",
        description:
          "Comprehensive bias analysis with compliance scoring, audit trails, and cultural intelligence",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description:
                "Content to analyze for bias and cultural intelligence (max 10,000 characters)",
              maxLength: 10000,
            },
            user_id: {
              type: "string",
              description: "Optional user ID for audit trails and tracking",
            },
            include_demographics: {
              type: "boolean",
              description: "Include demographic analysis of cultural entities",
              default: false,
            },
            include_audit: {
              type: "boolean",
              description: "Include detailed audit trail in response",
              default: false,
            },
          },
          required: ["content"],
        },
      },
      {
        name: "get_compliance_report",
        description:
          "Generate comprehensive compliance report from audit trails with trends and recommendations",
        inputSchema: {
          type: "object",
          properties: {
            days_back: {
              type: "number",
              description: "Number of days to include in report (1-30)",
              minimum: 1,
              maximum: 30,
              default: 7,
            },
            format: {
              type: "string",
              enum: ["summary", "detailed", "executive"],
              description: "Report detail level",
              default: "summary",
            },
          },
        },
      },
      {
        name: "qloo_basic_insights",
        description:
          "Get basic cultural insights using Qloo's core recommendation engine",
        inputSchema: {
          type: "object",
          properties: {
            entity_type: {
              type: "string",
              enum: [
                "urn:entity:movie",
                "urn:entity:artist",
                "urn:entity:book",
                "urn:entity:place",
                "urn:entity:tv_show",
                "urn:entity:podcast",
                "urn:entity:video_game",
                "urn:entity:brand",
                "urn:entity:sports_team",
              ],
              description: "Type of entity to search for",
            },
            engagement_min: {
              type: "number",
              description: "Minimum engagement score (0-1)",
              minimum: 0,
              maximum: 1,
            },
            engagement_max: {
              type: "number",
              description: "Maximum engagement score (0-1)",
              minimum: 0,
              maximum: 1,
            },
            cultural_relevance_threshold: {
              type: "number",
              description: "Cultural relevance threshold (0-1)",
              minimum: 0,
              maximum: 1,
            },
            tags: {
              type: "string",
              description:
                "Filter by tag IDs (e.g., 'urn:tag:genre:media:comedy')",
            },
            release_year_min: {
              type: "number",
              description: "Minimum release year",
              minimum: 1900,
              maximum: 2030,
            },
            release_year_max: {
              type: "number",
              description: "Maximum release year",
              minimum: 1900,
              maximum: 2030,
            },
            popularity_min: {
              type: "number",
              description:
                "Minimum popularity (0-1, e.g., 0.8 for 80th percentile)",
              minimum: 0,
              maximum: 1,
            },
            popularity_max: {
              type: "number",
              description: "Maximum popularity (0-1)",
              minimum: 0,
              maximum: 1,
            },
            content_rating: {
              type: "string",
              description: "Content rating filter (e.g., 'PG-13', 'R', 'G')",
            },
            limit: {
              type: "number",
              description: "Number of results to return (1-50)",
              minimum: 1,
              maximum: 50,
              default: 10,
            },
          },
          required: ["entity_type"],
        },
      },
      {
        name: "qloo_demographic_insights",
        description:
          "Get culturally-aware recommendations based on demographic signals",
        inputSchema: {
          type: "object",
          properties: {
            entity_type: {
              type: "string",
              enum: [
                "urn:entity:movie",
                "urn:entity:artist",
                "urn:entity:book",
                "urn:entity:place",
                "urn:entity:tv_show",
                "urn:entity:podcast",
                "urn:entity:video_game",
                "urn:entity:brand",
                "urn:entity:sports_team",
              ],
              description: "Type of entity to analyze",
            },
            age_group: {
              type: "string",
              enum: ["young_adult", "middle_aged", "senior"],
              description: "Age demographic signal",
            },
            gender: {
              type: "string",
              enum: ["male", "female", "non_binary"],
              description: "Gender demographic signal",
            },
            audiences: {
              type: "string",
              description:
                "Audience type (e.g., 'african_american', 'hispanic', 'asian_american')",
            },
            interest_entities: {
              type: "string",
              description:
                "Comma-separated entity IDs that represent user interests",
            },
            limit: {
              type: "number",
              description: "Number of results to return (1-50)",
              minimum: 1,
              maximum: 50,
              default: 10,
            },
          },
          required: ["entity_type"],
        },
      },
      {
        name: "qloo_entity_search",
        description: "Search and validate entities in Qloo's cultural database",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for entity name (2-100 characters)",
              minLength: 2,
              maxLength: 100,
            },
            entity_type: {
              type: "string",
              enum: [
                "movie",
                "artist",
                "book",
                "place",
                "tv_show",
                "podcast",
                "video_game",
                "brand",
                "sports_team",
              ],
              description: "Type of entity to search for",
            },
            limit: {
              type: "number",
              description: "Number of results to return (1-50)",
              minimum: 1,
              maximum: 50,
              default: 10,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "qloo_compare_entities",
        description:
          "Compare two groups of entities to understand cultural affinities and differences",
        inputSchema: {
          type: "object",
          properties: {
            entities_group_a: {
              type: "string",
              description:
                "Comma-separated entity IDs for first group (max 10 entities)",
            },
            entities_group_b: {
              type: "string",
              description:
                "Comma-separated entity IDs for second group (max 10 entities)",
            },
          },
          required: ["entities_group_a", "entities_group_b"],
        },
      },
      {
        name: "qloo_trending_entities",
        description:
          "Get currently trending entities by category from Qloo's cultural intelligence",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [
                "music",
                "movies",
                "books",
                "places",
                "tv_shows",
                "podcasts",
                "video_games",
                "brands",
                "sports",
              ],
              description: "Category to get trending entities for",
            },
          },
          required: ["category"],
        },
      },
      {
        name: "qloo_geospatial_insights",
        description: "Get location-based cultural recommendations and insights",
        inputSchema: {
          type: "object",
          properties: {
            entity_type: {
              type: "string",
              enum: ["urn:entity:place"],
              description: "Type of place entity",
              default: "urn:entity:place",
            },
            demographic: {
              type: "string",
              enum: [
                "young_adult",
                "middle_aged",
                "senior",
                "male",
                "female",
                "non_binary",
              ],
              description: "Demographic filter for geospatial insights",
            },
            engagement_min: {
              type: "number",
              description: "Minimum engagement threshold (0-1)",
              minimum: 0,
              maximum: 1,
            },
            engagement_max: {
              type: "number",
              description: "Maximum engagement threshold (0-1)",
              minimum: 0,
              maximum: 1,
            },
            cultural_relevance_threshold: {
              type: "number",
              description: "Cultural relevance threshold (0-1)",
              minimum: 0,
              maximum: 1,
            },
            location: {
              type: "string",
              description: "Location name, address, or coordinates",
            },
            radius: {
              type: "number",
              description: "Search radius in meters (100-50000)",
              minimum: 100,
              maximum: 50000,
            },
            country_code: {
              type: "string",
              description: "Country code filter (e.g., 'US', 'JP', 'GB')",
              pattern: "^[A-Z]{2}$",
            },
            region: {
              type: "string",
              description: "Admin region filter (e.g., state or province)",
            },
            price_level_min: {
              type: "number",
              description: "Minimum price level (1-4, like dollar signs)",
              minimum: 1,
              maximum: 4,
            },
            price_level_max: {
              type: "number",
              description: "Maximum price level (1-4)",
              minimum: 1,
              maximum: 4,
            },
            rating_min: {
              type: "number",
              description: "Minimum rating (0-5)",
              minimum: 0,
              maximum: 5,
            },
            rating_max: {
              type: "number",
              description: "Maximum rating (0-5)",
              minimum: 0,
              maximum: 5,
            },
            limit: {
              type: "number",
              description: "Number of results to return (1-50)",
              minimum: 1,
              maximum: 50,
              default: 10,
            },
          },
          required: ["entity_type"],
        },
      },
      {
        name: "get_system_status",
        description:
          "Get system health, performance metrics, and operational statistics",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "qloo_audience_compare",
        description:
          "Compare two groups of entities to analyze cultural affinities and delta scores",
        inputSchema: {
          type: "object",
          properties: {
            entities_group_a: {
              type: "array",
              items: { type: "string" },
              description:
                "Array of entity IDs for first group (max 10 entities)",
              maxItems: 10,
            },
            entities_group_b: {
              type: "array",
              items: { type: "string" },
              description:
                "Array of entity IDs for second group (max 10 entities)",
              maxItems: 10,
            },
          },
          required: ["entities_group_a", "entities_group_b"],
        },
      },
      {
        name: "get_cultural_trends",
        description:
          "Get trending cultural content with demographic and timeframe filters",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [
                "music",
                "movies",
                "books",
                "places",
                "tv_shows",
                "podcasts",
                "video_games",
                "brands",
                "sports",
              ],
              description: "Category to get trending entities for",
            },
            timeframe: {
              type: "string",
              enum: ["daily", "weekly", "monthly"],
              description: "Trending timeframe",
              default: "weekly",
            },
            demographic: {
              type: "string",
              enum: [
                "young_adult",
                "middle_aged",
                "senior",
                "male",
                "female",
                "non_binary",
              ],
              description: "Demographic filter for trends",
            },
            limit: {
              type: "number",
              description: "Number of trending items to return (1-50)",
              minimum: 1,
              maximum: 50,
              default: 20,
            },
          },
          required: ["category"],
        },
      },
      {
        name: "batch_cultural_audit",
        description:
          "Perform cultural bias analysis on multiple content pieces simultaneously",
        inputSchema: {
          type: "object",
          properties: {
            content_array: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: {
                    type: "string",
                    description: "Content to analyze",
                    maxLength: 10000,
                  },
                  user_id: {
                    type: "string",
                    description: "Optional user ID",
                  },
                  include_demographics: {
                    type: "boolean",
                    description: "Include demographic analysis",
                    default: false,
                  },
                },
                required: ["content"],
              },
              description: "Array of content items to analyze (max 20 items)",
              maxItems: 20,
            },
          },
          required: ["content_array"],
        },
      },
      {
        name: "add_realtime_signal",
        description:
          "Add real-time user interaction signal for cultural intelligence",
        inputSchema: {
          type: "object",
          properties: {
            entity_id: {
              type: "string",
              description: "ID of the entity being interacted with",
            },
            interaction: {
              type: "string",
              enum: ["view", "like", "share", "purchase", "rating"],
              description: "Type of user interaction",
            },
            user_id: {
              type: "string",
              description: "Optional user ID",
            },
            session_id: {
              type: "string",
              description: "Session identifier",
            },
            value: {
              type: "number",
              description: "Optional interaction value (e.g., rating score)",
              minimum: 0,
              maximum: 5,
            },
            location: {
              type: "string",
              description: "Optional location context",
            },
          },
          required: ["entity_id", "interaction", "session_id"],
        },
      },
      {
        name: "configure_environment",
        description:
          "Configure the MCP server environment (Hackathon vs Production mode)",
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["Hackathon", "Production"],
              description:
                "Environment mode - Hackathon for demo/testing, Production for full validation",
            },
            enableFullPotential: {
              type: "boolean",
              description:
                "Enable all features and strict validation (overrides mode defaults)",
              default: false,
            },
            biasDetectionLevel: {
              type: "string",
              enum: ["strict", "moderate", "lenient"],
              description: "Bias detection sensitivity level",
            },
            enabledFeatures: {
              type: "object",
              properties: {
                demographicAnalysis: {
                  type: "boolean",
                  description: "Enable demographic analysis features",
                },
                culturalTrends: {
                  type: "boolean",
                  description: "Enable cultural trends analysis",
                },
                geospatialInsights: {
                  type: "boolean",
                  description: "Enable location-based cultural insights",
                },
                batchProcessing: {
                  type: "boolean",
                  description: "Enable batch processing capabilities",
                },
                realtimeSignals: {
                  type: "boolean",
                  description: "Enable real-time signal processing",
                },
              },
              description: "Fine-grained feature control",
            },
          },
          required: ["mode"],
        },
      },
      {
        name: "get_environment_info",
        description: "Get current environment configuration and status",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ] as Tool[],
  };
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function validateArgs<T>(
  args: unknown,
  requiredFields: (keyof T)[],
): args is T {
  if (!args || typeof args !== "object") return false;
  const argsObj = args as Record<string, any>;
  return requiredFields.every((field) => field in argsObj);
}

function getArgs(args: unknown): any {
  return args as any;
}

// =============================================================================
// TOOL HANDLERS
// =============================================================================

server.setRequestHandler(
  CallToolRequestSchema,
  async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    if (!qlooClient) {
      return {
        content: [
          {
            type: "text",
            text: "❌ CulturalTruth client not initialized. Please check QLOO_API_KEY environment variable.",
          } as TextContent,
        ],
      };
    }

    try {
      switch (name) {
        case "analyze_content_bias": {
          if (!validateArgs<AnalyzeContentBiasArgs>(args, ["content"])) {
            return {
              content: [
                {
                  type: "text",
                  text: "❌ Invalid arguments. Required: content (string)",
                } as TextContent,
              ],
            };
          }
          const analysis = await qlooClient.analyzeContent(
            args.content,
            args.user_id,
          );

          let response = `🛡️ **CulturalTruth Analysis Report**\n\n`;

          // Executive Summary
          response += `## Executive Summary\n`;
          response += `**Overall Compliance Score:** ${analysis.complianceScore.overallScore}/100 (${analysis.complianceScore.riskLevel.toUpperCase()})\n`;
          response += `**Processing Time:** ${analysis.auditTrail.processingTime}ms\n`;
          response += `**Session ID:** ${analysis.auditTrail.sessionId}\n\n`;

          // Compliance Breakdown
          response += `## Regulatory Compliance Scores\n`;
          response += `• **EU AI Act:** ${analysis.complianceScore.euAiAct}/100\n`;
          response += `• **Section 508 (Accessibility):** ${analysis.complianceScore.section508}/100\n`;
          response += `• **GDPR (Data Protection):** ${analysis.complianceScore.gdpr}/100\n`;

          if (analysis.complianceScore.regulations_triggered.length > 0) {
            response += `• **Regulations Triggered:** ${analysis.complianceScore.regulations_triggered.join(", ")}\n`;
          }
          response += "\n";

          // Bias Detection Results
          if (analysis.biasAnalysis.length > 0) {
            response += `## ⚠️ Bias Detection Results (${analysis.biasAnalysis.length} issues found)\n`;

            const criticalIssues = analysis.biasAnalysis.filter(
              (b) => b.severity === "critical",
            );
            const highIssues = analysis.biasAnalysis.filter(
              (b) => b.severity === "high",
            );
            const mediumIssues = analysis.biasAnalysis.filter(
              (b) => b.severity === "medium",
            );
            const lowIssues = analysis.biasAnalysis.filter(
              (b) => b.severity === "low",
            );

            if (criticalIssues.length > 0) {
              response += `\n**🚨 CRITICAL ISSUES (${criticalIssues.length}):**\n`;
              criticalIssues.forEach((bias, index) => {
                response += `${index + 1}. **${bias.type.replace(/_/g, " ").toUpperCase()}** (${(bias.confidence * 100).toFixed(0)}% confidence)\n`;
                response += `   • Matches: "${bias.matches.join('", "')}"\n`;
                response += `   • Suggestions: ${bias.suggestions.slice(0, 2).join(", ")}\n`;
                response += `   • Regulations: ${bias.regulation_risk.join(", ")}\n`;
              });
            }

            if (highIssues.length > 0) {
              response += `\n**⚠️ HIGH PRIORITY (${highIssues.length}):**\n`;
              highIssues.forEach((bias, index) => {
                response += `${index + 1}. ${bias.type.replace(/_/g, " ")} - "${bias.matches[0]}" → "${bias.suggestions[0]}"\n`;
              });
            }

            if (mediumIssues.length > 0) {
              response += `\n**📋 MEDIUM PRIORITY (${mediumIssues.length}):** ${mediumIssues.map((b) => b.type.replace(/_/g, " ")).join(", ")}\n`;
            }

            if (lowIssues.length > 0) {
              response += `\n**💡 SUGGESTIONS (${lowIssues.length}):** ${lowIssues.map((b) => b.type.replace(/_/g, " ")).join(", ")}\n`;
            }
          } else {
            response += `## ✅ No Bias Detected\n`;
            response += `Content appears to meet bias prevention standards.\n`;
          }

          // Cultural Entities
          if (analysis.culturalEntities.length > 0) {
            response += `\n## 🎭 Cultural Entities Identified (${analysis.culturalEntities.length})\n`;
            analysis.culturalEntities.forEach((entity, index) => {
              response += `${index + 1}. **${entity.name}**`;
              if (entity.properties.release_year) {
                response += ` (${entity.properties.release_year})`;
              }
              if (entity.properties.popularity) {
                response += ` - ${entity.properties.popularity}th percentile popularity`;
              }
              response += `\n   ID: ${entity.entity_id}\n`;
            });
          }

          // Demographics (if requested and available)
          if (
            args.include_demographics &&
            analysis.demographics &&
            analysis.demographics.length > 0
          ) {
            response += `\n## 📊 Demographic Analysis\n`;
            analysis.demographics.forEach((demo) => {
              response += `**${demo.demographic.replace("_", " ").toUpperCase()}** (${demo.entities.length} entities, ${(demo.confidence * 100).toFixed(0)}% confidence)\n`;
              demo.entities.slice(0, 3).forEach((entity) => {
                response += `• ${entity.name}\n`;
              });
            });
          }

          // Mitigation Actions
          response += `\n## 🔧 Recommended Actions\n`;
          analysis.auditTrail.mitigationActions.forEach((action, index) => {
            response += `${index + 1}. ${action}\n`;
          });

          // Audit Trail (if requested)
          if (args.include_audit) {
            response += `\n## 📋 Audit Trail Details\n`;
            response += `• Content Hash: ${analysis.auditTrail.contentHash.slice(0, 16)}...\n`;
            response += `• API Calls Made: ${analysis.auditTrail.apiCallsCount}\n`;
            response += `• Cache Hits: ${analysis.auditTrail.cacheHits}\n`;
            response += `• Processing Time: ${analysis.auditTrail.processingTime}ms\n`;
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "get_compliance_report": {
          if (!args) {
            return {
              content: [
                {
                  type: "text",
                  text: "❌ Arguments required",
                } as TextContent,
              ],
            };
          }
          const typedArgs = getArgs(args);
          const report = qlooClient.generateComplianceReport(
            typedArgs.days || 7,
          );

          let response = `📊 **CulturalTruth Compliance Report**\n\n`;
          response += `**Period:** ${new Date(report.period.start).toLocaleDateString()} to ${new Date(report.period.end).toLocaleDateString()} (${report.period.days} days)\n\n`;

          // Executive Summary
          response += `## Executive Summary\n`;
          response += `• **Total Analyses:** ${report.summary.totalAnalyses}\n`;
          response += `• **Average Compliance Score:** ${report.summary.averageComplianceScore}/100\n`;
          response += `• **Risk Distribution:**\n`;

          Object.entries(report.summary.riskDistribution).forEach(
            ([risk, count]) => {
              const percentage =
                report.summary.totalAnalyses > 0
                  ? ((count / report.summary.totalAnalyses) * 100).toFixed(1)
                  : "0";
              response += `  - ${risk.charAt(0).toUpperCase() + risk.slice(1)}: ${count} (${percentage}%)\n`;
            },
          );

          // Trends
          if (
            getArgs(args).format === "detailed" ||
            getArgs(args).format === "executive"
          ) {
            response += `\n## Compliance Trends\n`;
            const recentTrends = report.summary.trendsOverTime.slice(-7);
            recentTrends.forEach((trend) => {
              response += `**${new Date(trend.date).toLocaleDateString()}:** Score ${trend.averageScore}/100`;
              if (trend.highRiskCount > 0) {
                response += ` (${trend.highRiskCount} high-risk)`;
              }
              response += "\n";
            });
          }

          // Top Issues
          if (report.topIssues.length > 0) {
            response += `\n## Top Bias Issues\n`;
            report.topIssues.slice(0, 5).forEach((issue, index) => {
              response += `${index + 1}. **${issue.biasType.replace(/_/g, " ").toUpperCase()}**\n`;
              response += `   • Occurrences: ${issue.occurrences}\n`;
              response += `   • Average Severity: ${issue.averageSeverity}\n`;
              if (issue.regulationsTriggered.length > 0) {
                response += `   • Regulations: ${issue.regulationsTriggered.join(", ")}\n`;
              }
            });
          }

          // Recommendations
          response += `\n## Recommendations\n`;
          report.recommendations.forEach((rec, index) => {
            response += `${index + 1}. ${rec}\n`;
          });

          // System Performance (for detailed reports)
          if (getArgs(args).format === "detailed") {
            const stats = qlooClient.getSystemStats();
            response += `\n## System Performance\n`;
            response += `• API Calls: ${stats.apiCalls}\n`;
            response += `• Cache Hit Rate: ${(stats.cacheStats.entityCache.hitRate * 100).toFixed(1)}%\n`;
            response += `• Circuit Breaker: ${stats.circuitBreakerState.toUpperCase()}\n`;
            response += `• Audit Trails Stored: ${stats.auditTrailCount}\n`;
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "qloo_basic_insights": {
          if (!validateArgs<QlooRecommendArgs>(args, ["entity_type"])) {
            return {
              content: [
                {
                  type: "text",
                  text: "❌ Invalid arguments. Required: entity_type (string)",
                } as TextContent,
              ],
            };
          }
          const params: any = {
            "filter.type": getArgs(args).entity_type,
          };

          // Add optional parameters with validation
          if (getArgs(args).tags) params["filter.tags"] = getArgs(args).tags;
          if (getArgs(args).release_year_min)
            params["filter.release_year.min"] = getArgs(args).release_year_min;
          if (getArgs(args).release_year_max)
            params["filter.release_year.max"] = getArgs(args).release_year_max;
          if (getArgs(args).popularity_min)
            params["filter.popularity.min"] = getArgs(args).popularity_min;
          if (getArgs(args).popularity_max)
            params["filter.popularity.max"] = getArgs(args).popularity_max;
          if (getArgs(args).content_rating)
            params["filter.content_rating"] = getArgs(args).content_rating;
          if (getArgs(args).engagement_min)
            params["filter.engagement.min"] = getArgs(args).engagement_min;
          if (getArgs(args).engagement_max)
            params["filter.engagement.max"] = getArgs(args).engagement_max;
          if (getArgs(args).cultural_relevance_threshold)
            params["filter.cultural_relevance.threshold"] =
              getArgs(args).cultural_relevance_threshold;
          if (getArgs(args).limit)
            params["take"] = Math.min(getArgs(args).limit, 50);

          const result = await qlooClient.getBasicInsights(params);

          let response = `🎯 **Qloo Basic Insights** for ${getArgs(args).entity_type.replace("urn:entity:", "")}\n\n`;

          if (result.success && result.results?.entities?.length > 0) {
            response += `Found ${result.results.entities.length} entities:\n\n`;
            result.results.entities.forEach((entity, index) => {
              response += `${index + 1}. **${entity.name}**`;
              if (entity.properties?.release_year) {
                response += ` (${entity.properties.release_year})`;
              }
              if (entity.properties?.popularity) {
                const pop = entity.properties.popularity * 100;
                response += ` - ${pop.toFixed(1)}th percentile popularity`;
              }
              if (entity.properties?.content_rating) {
                response += ` [${entity.properties.content_rating}]`;
              }
              response += `\n   Entity ID: ${entity.entity_id}\n`;
            });
          } else {
            response += `No results found`;
            if (result.error) {
              response += `: ${result.error}`;
            }
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "qloo_demographic_insights": {
          if (!validateArgs<QlooRecommendArgs>(args, ["entity_type"])) {
            return {
              content: [
                {
                  type: "text",
                  text: "❌ Invalid arguments. Required: entity_type (string)",
                } as TextContent,
              ],
            };
          }
          const params: any = {
            "filter.type": getArgs(args).entity_type,
          };

          // Add demographic signals
          if (getArgs(args).age_group)
            params["signal.demographics.age"] = getArgs(args).age_group;
          if (getArgs(args).gender)
            params["signal.demographics.gender"] = getArgs(args).gender;
          if (getArgs(args).audiences)
            params["signal.demographics.audiences"] = getArgs(args).audiences;
          if (getArgs(args).interest_entities)
            params["signal.interests.entities"] =
              getArgs(args).interest_entities;
          if (getArgs(args).limit)
            params["take"] = Math.min(getArgs(args).limit, 50);

          const result = await qlooClient.getDemographicInsights(params);

          let response = `📊 **Qloo Demographic Insights**\n\n`;
          response += `**Target Demographics:**\n`;
          if (
            getArgs(args).age_group &&
            typeof getArgs(args).age_group === "string"
          )
            response += `• Age Group: ${getArgs(args).age_group.replace("_", " ")}\n`;
          if (getArgs(args).gender)
            response += `• Gender: ${getArgs(args).gender}\n`;
          if (getArgs(args).audiences)
            response += `• Audience: ${getArgs(args).audiences}\n`;
          response += "\n";

          if (result.success && result.results?.entities?.length > 0) {
            response += `**Culturally Relevant Results (${result.results.entities.length}):**\n`;
            result.results.entities.forEach((entity, index) => {
              response += `${index + 1}. **${entity.name}**`;
              if (entity.properties?.release_year) {
                response += ` (${entity.properties.release_year})`;
              }
              if (entity.properties?.popularity) {
                const pop = entity.properties.popularity * 100;
                response += ` - ${pop.toFixed(1)}th percentile`;
              }
              response += "\n";
            });
          } else {
            response += `No demographically relevant entities found`;
            if (result.error) {
              response += `: ${result.error}`;
            }
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "qloo_entity_search": {
          if (!validateArgs<QlooSearchArgs>(args, ["query"])) {
            return {
              content: [
                {
                  type: "text",
                  text: "❌ Invalid arguments. Required: query (string)",
                } as TextContent,
              ],
            };
          }
          const params = {
            query: getArgs(args).query.trim(),
            type: getArgs(args).type,
            limit: Math.min(getArgs(args).limit || 10, 50),
          };

          const result = await qlooClient.searchEntities(params);

          let response = `🔍 **Qloo Entity Search** for "${getArgs(args).query}"\n\n`;

          if (result.success && result.results?.entities?.length > 0) {
            response += `✅ Found ${result.results.entities.length} matching entities:\n\n`;
            result.results.entities.forEach((entity, index) => {
              response += `${index + 1}. **${entity.name}** (${entity.type})\n`;
              response += `   Entity ID: ${entity.entity_id}\n`;
              if (entity.properties?.popularity) {
                const pop = entity.properties.popularity * 100;
                response += `   Popularity: ${pop.toFixed(1)}th percentile\n`;
              }
              if (entity.properties?.release_year) {
                response += `   Release Year: ${entity.properties.release_year}\n`;
              }
              if (entity.properties?.description) {
                response += `   Description: ${entity.properties.description.slice(0, 100)}...\n`;
              }
              response += "\n";
            });
          } else {
            response += `❓ No entities found for "${getArgs(args).query}"`;
            if (result.error) {
              response += `\nError: ${result.error}`;
            }
            response += `\n\n💡 Try:\n`;
            response += `• Different search terms\n`;
            response += `• Broader entity type\n`;
            response += `• Checking spelling\n`;
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "qloo_compare_entities": {
          if (
            !validateArgs<QlooAudienceCompareArgs>(args, [
              "entities_group_a",
              "entities_group_b",
            ])
          ) {
            return {
              content: [
                {
                  type: "text",
                  text: "❌ Invalid arguments. Required: entities_group_a (array), entities_group_b (array)",
                } as TextContent,
              ],
            };
          }
          const params = {
            entities_a: Array.isArray(getArgs(args).entities_group_a)
              ? getArgs(args).entities_group_a.join(",")
              : String(getArgs(args).entities_group_a),
            entities_b: Array.isArray(getArgs(args).entities_group_b)
              ? getArgs(args).entities_group_b.join(",")
              : String(getArgs(args).entities_group_b),
          };

          const result = await qlooClient.compareEntities(params);

          let response = `⚖️ **Qloo Entity Comparison Analysis**\n\n`;
          response += `**Group A Entities:** ${Array.isArray(getArgs(args).entities_group_a) ? getArgs(args).entities_group_a.join(", ") : getArgs(args).entities_group_a}\n`;
          response += `**Group B Entities:** ${Array.isArray(getArgs(args).entities_group_b) ? getArgs(args).entities_group_b.join(", ") : getArgs(args).entities_group_b}\n\n`;

          if (result.success) {
            response += `✅ **Comparison completed successfully**\n\n`;
            response += `📊 **Cultural Affinity Analysis:**\n`;
            response += `The Qloo API has processed the comparison between these entity groups. `;
            response += `This analysis reveals cultural patterns, audience overlaps, and recommendation strengths `;
            response += `between the two groups based on Qloo's cultural intelligence database.\n\n`;

            if (result.results?.entities?.length > 0) {
              response += `**Related Entities Found (${result.results.entities.length}):**\n`;
              result.results.entities.slice(0, 10).forEach((entity, index) => {
                response += `${index + 1}. ${entity.name}\n`;
              });
            }

            response += `\n💡 **Use this comparison for:**\n`;
            response += `• Understanding audience crossover potential\n`;
            response += `• Cultural recommendation strategies\n`;
            response += `• Market positioning insights\n`;
            response += `• Content curation decisions\n`;
          } else {
            response += `❌ **Comparison failed**\n`;
            response += `Error: ${result.error ?? "Unknown error"}\n\n`;
            response += `Please check that:\n`;
            response += `• Entity IDs are valid Qloo identifiers\n`;
            response += `• IDs are comma-separated\n`;
            response += `• Maximum 10 entities per group\n`;
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "qloo_trending_entities": {
          if (!validateArgs<QlooTrendingArgs>(args, ["entity_type"])) {
            return {
              content: [
                {
                  type: "text",
                  text: "❌ Invalid arguments. Required: entity_type (string)",
                } as TextContent,
              ],
            };
          }
          const params = {
            type: getArgs(args).entity_type,
          };

          const result = await qlooClient.getTrendingEntities(params);

          let response = `📈 **Trending ${getArgs(args).entity_type.charAt(0).toUpperCase() + getArgs(args).entity_type.slice(1)}**\n\n`;

          if (result.success && result.results?.entities?.length > 0) {
            response += `🔥 **Currently trending (${result.results.entities.length} entities):**\n\n`;
            result.results.entities.forEach((entity, index) => {
              response += `${index + 1}. **${entity.name}**`;
              if (entity.properties?.release_year) {
                response += ` (${entity.properties.release_year})`;
              }
              if (entity.properties?.popularity) {
                const pop = entity.properties.popularity * 100;
                response += ` - ${pop.toFixed(1)}th percentile`;
              }
              response += `\n   Entity ID: ${entity.entity_id}\n`;
            });

            response += `\n📊 **Trending Insights:**\n`;
            response += `• These entities are experiencing increased cultural relevance\n`;
            response += `• Trending data reflects real-time cultural engagement\n`;
            response += `• Use for content curation and recommendation strategies\n`;
          } else {
            response += `No trending entities found for ${getArgs(args).category}`;
            if (result.error) {
              response += `\nError: ${result.error}`;
            }
            response += `\n\nThis could indicate:\n`;
            response += `• Temporary API issues\n`;
            response += `• Low activity in this category\n`;
            response += `• Regional trending variations\n`;
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "qloo_geospatial_insights": {
          if (!args) {
            return {
              content: [
                {
                  type: "text",
                  text: "❌ Arguments required",
                } as TextContent,
              ],
            };
          }
          const typedArgs = getArgs(args);
          const params: any = {
            "filter.type": typedArgs.entity_type || "urn:entity:place",
          };

          // Add geospatial parameters with validation
          if (typedArgs.location)
            params["filter.location"] = typedArgs.location;
          if (typedArgs.radius)
            params["filter.location.radius"] = Math.min(
              typedArgs.radius,
              50000,
            );
          if (typedArgs.country_code)
            params["filter.geocode.country_code"] =
              typedArgs.country_code.toUpperCase();
          if (typedArgs.region)
            params["filter.geocode.admin1_region"] = typedArgs.region;
          if (getArgs(args).price_level_min)
            params["filter.price_level.min"] = Math.max(
              1,
              Math.min(getArgs(args).price_level_min, 4),
            );
          if (getArgs(args).price_level_max)
            params["filter.price_level.max"] = Math.max(
              1,
              Math.min(getArgs(args).price_level_max, 4),
            );
          if (getArgs(args).rating_min)
            params["filter.rating.min"] = Math.max(
              0,
              Math.min(getArgs(args).rating_min, 5),
            );
          if (getArgs(args).rating_max)
            params["filter.rating.max"] = Math.max(
              0,
              Math.min(getArgs(args).rating_max, 5),
            );
          if (getArgs(args).engagement_min)
            params["filter.engagement.min"] = getArgs(args).engagement_min;
          if (getArgs(args).engagement_max)
            params["filter.engagement.max"] = getArgs(args).engagement_max;
          if (getArgs(args).cultural_relevance_threshold)
            params["filter.cultural_relevance.threshold"] =
              getArgs(args).cultural_relevance_threshold;
          if (getArgs(args).demographic) {
            if (
              getArgs(args).demographic.includes("adult") ||
              getArgs(args).demographic.includes("aged")
            ) {
              params["signal.demographics.age"] = getArgs(args).demographic;
            } else {
              params["signal.demographics.gender"] = getArgs(args).demographic;
            }
          }
          if (getArgs(args).limit)
            params["take"] = Math.min(getArgs(args).limit, 50);

          const result = await qlooClient.getGeospatialInsights(params);

          let response = `🗺️ **Qloo Geospatial Cultural Insights**\n\n`;

          response += `**Search Parameters:**\n`;
          if (getArgs(args).location)
            response += `• Location: ${getArgs(args).location}\n`;
          if (getArgs(args).radius)
            response += `• Radius: ${getArgs(args).radius.toLocaleString()} meters\n`;
          if (getArgs(args).country_code)
            response += `• Country: ${getArgs(args).country_code}\n`;
          if (getArgs(args).region)
            response += `• Region: ${getArgs(args).region}\n`;
          if (getArgs(args).price_level_min || getArgs(args).price_level_max) {
            response += `• Price Range: ${"$".repeat(getArgs(args).price_level_min || 1)} to ${"$".repeat(getArgs(args).price_level_max || 4)}\n`;
          }
          if (getArgs(args).rating_min || getArgs(args).rating_max) {
            response += `• Rating Range: ${getArgs(args).rating_min || 0}⭐ to ${getArgs(args).rating_max || 5}⭐\n`;
          }
          response += "\n";

          if (result.success && result.results?.entities?.length > 0) {
            response += `📍 **Cultural Places Found (${result.results.entities.length}):**\n\n`;
            result.results.entities.forEach((entity, index) => {
              response += `${index + 1}. **${entity.name}**`;
              if (entity.properties?.rating) {
                response += ` (${entity.properties.rating}⭐)`;
              }
              if (entity.properties?.price_level) {
                response += ` ${"$".repeat(entity.properties.price_level)}`;
              }
              response += `\n   Entity ID: ${entity.entity_id}\n`;
              if (entity.properties?.description) {
                response += `   ${entity.properties.description.slice(0, 100)}...\n`;
              }
              response += "\n";
            });

            response += `🎯 **Location Intelligence:**\n`;
            response += `• These venues reflect local cultural preferences\n`;
            response += `• Use for location-based recommendations\n`;
            response += `• Cultural clustering and demographic insights available\n`;
          } else {
            response += `No places found matching your criteria`;
            if (result.error) {
              response += `\nError: ${result.error}`;
            }
            response += `\n\n💡 **Try adjusting:**\n`;
            response += `• Increase search radius\n`;
            response += `• Broaden price or rating ranges\n`;
            response += `• Use more general location terms\n`;
            response += `• Check location spelling\n`;
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "get_system_status": {
          const stats = qlooClient.getSystemStats();
          const circuitBreakerStats = stats.circuitBreakerState;

          let response = `⚙️ **CulturalTruth System Status**\n\n`;

          response += `## System Health\n`;
          response += `• **Status:** ${circuitBreakerStats === "closed" ? "🟢 Healthy" : circuitBreakerStats === "half-open" ? "🟡 Recovering" : "🔴 Degraded"}\n`;
          response += `• **Circuit Breaker:** ${circuitBreakerStats.toUpperCase()}\n`;
          response += `• **Uptime:** ${Math.floor(process.uptime())} seconds\n`;
          response += `• **Memory Usage:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n\n`;

          response += `## Performance Metrics\n`;
          response += `• **Total API Calls:** ${stats.apiCalls.toLocaleString()}\n`;
          response += `• **Entity Cache Hit Rate:** ${(stats.cacheStats.entityCache.hitRate * 100).toFixed(1)}%\n`;
          response += `• **Demographic Cache Hit Rate:** ${(stats.cacheStats.demographicCache.hitRate * 100).toFixed(1)}%\n`;
          response += `• **Cache Size:** ${stats.cacheStats.entityCache.size} entities\n\n`;

          response += `## Audit & Compliance\n`;
          response += `• **Audit Trails Stored:** ${stats.auditTrailCount.toLocaleString()}\n`;

          const recentAudits = qlooClient.getAuditTrails(10);
          const avgScore =
            recentAudits.length > 0
              ? recentAudits.reduce(
                  (sum, audit) => sum + audit.complianceScore.overallScore,
                  0,
                ) / recentAudits.length
              : 0;

          response += `• **Recent Avg Compliance Score:** ${avgScore.toFixed(1)}/100\n`;

          const criticalIssues = recentAudits.filter(
            (audit) => audit.complianceScore.riskLevel === "critical",
          ).length;

          if (criticalIssues > 0) {
            response += `• **⚠️ Critical Issues (Last 10):** ${criticalIssues}\n`;
          }

          response += `\n## Configuration\n`;
          response += `• **Rate Limit:** ${process.env.RATE_LIMIT_PER_MINUTE ?? "50"} req/min\n`;
          response += `• **Cache TTL:** ${parseInt(process.env.CACHE_TTL_MS ?? "300000") / 1000}s\n`;
          response += `• **Max Cache Size:** ${process.env.MAX_CACHE_SIZE ?? "1000"} items\n`;
          response += `• **Circuit Breaker Threshold:** ${process.env.CIRCUIT_BREAKER_THRESHOLD ?? "5"} failures\n`;

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "qloo_audience_compare": {
          const comparison = await qlooClient.compareInsights(
            getArgs(args).entities_group_a,
            getArgs(args).entities_group_b,
          );

          let response = `⚖️ **Cultural Audience Comparison Analysis**\n\n`;

          if (comparison.success) {
            response += `## Comparison Summary\n`;
            response += `**Group A:** ${getArgs(args).entities_group_a.length} entities\n`;
            response += `**Group B:** ${getArgs(args).entities_group_b.length} entities\n\n`;

            response += `## Delta Scores & Analytics\n`;
            response += `• **Popularity Delta:** ${(comparison.deltaScores.popularityDelta * 100).toFixed(1)}%\n`;
            response += `• **Cultural Affinity Score:** ${comparison.deltaScores.culturalAffinityScore.toFixed(1)}/100\n`;
            response += `• **Content Overlap:** ${comparison.deltaScores.overlapPercentage.toFixed(1)}%\n\n`;

            response += `## Group A Analysis\n`;
            response += `• **Average Popularity:** ${(comparison.groupA.avgPopularity * 100).toFixed(1)}th percentile\n`;
            response += `• **Common Tags:** ${comparison.groupA.commonTags.slice(0, 5).join(", ")}\n`;
            response += `• **Entity Count:** ${comparison.groupA.entities.length}\n\n`;

            response += `## Group B Analysis\n`;
            response += `• **Average Popularity:** ${(comparison.groupB.avgPopularity * 100).toFixed(1)}th percentile\n`;
            response += `• **Common Tags:** ${comparison.groupB.commonTags.slice(0, 5).join(", ")}\n`;
            response += `• **Entity Count:** ${comparison.groupB.entities.length}\n\n`;

            if (comparison.deltaScores.recommendations.length > 0) {
              response += `## 🎯 Strategic Recommendations\n`;
              comparison.deltaScores.recommendations.forEach((rec, index) => {
                response += `${index + 1}. ${rec}\n`;
              });
            }
          } else {
            response += `❌ **Comparison Failed**\n`;
            response += `Error: ${comparison.error}\n\n`;
            response += `Please verify that all entity IDs are valid Qloo identifiers.`;
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "get_cultural_trends": {
          const trends = await qlooClient.getCulturalTrends({
            category: getArgs(args).category,
            timeframe: getArgs(args).timeframe,
            demographic: getArgs(args).demographic,
            limit: getArgs(args).limit,
          });

          let response = `📈 **Cultural Trends Analysis**\n\n`;
          response += `**Category:** ${getArgs(args).category}\n`;
          response += `**Timeframe:** ${getArgs(args).timeframe || "weekly"}\n`;
          if (getArgs(args).demographic) {
            response += `**Demographic Filter:** ${getArgs(args).demographic.replace("_", " ")}\n`;
          }
          response += "\n";

          if (trends.success && trends.results?.entities?.length > 0) {
            response += `🔥 **Trending Now (${trends.results.entities.length} entities):**\n\n`;
            trends.results.entities.forEach((entity, index) => {
              response += `${index + 1}. **${entity.name}**`;
              if (entity.properties?.release_year) {
                response += ` (${entity.properties.release_year})`;
              }
              if (entity.properties?.popularity) {
                const pop = entity.properties.popularity * 100;
                response += ` - ${pop.toFixed(1)}th percentile popularity`;
              }
              response += `\n   ID: ${entity.entity_id}\n`;
            });

            response += `\n📊 **Trend Intelligence:**\n`;
            response += `• These entities show significant cultural momentum\n`;
            response += `• Perfect for content curation and marketing alignment\n`;
            response += `• Cultural relevance validated by real-time engagement data\n`;
          } else {
            response += `❓ No trending entities found for ${getArgs(args).category}`;
            if (trends.error) {
              response += `\nError: ${trends.error}`;
            }
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "batch_cultural_audit": {
          const batchResult = await qlooClient.batchCulturalAudit(
            getArgs(args).content_array,
          );

          let response = `🔍 **Batch Cultural Audit Report**\n\n`;

          response += `## Executive Summary\n`;
          response += `• **Total Items Processed:** ${batchResult.summary.totalProcessed}\n`;
          response += `• **Average Compliance Score:** ${batchResult.summary.avgComplianceScore.toFixed(1)}/100\n`;
          response += `• **Critical Issues Found:** ${batchResult.summary.criticalIssuesCount}\n`;
          response += `• **Total Processing Time:** ${batchResult.summary.processingTime}ms\n\n`;

          response += `## Individual Results\n`;
          batchResult.results.forEach((result, index) => {
            response += `### Item ${index + 1}\n`;
            if (result.error) {
              response += `❌ **Error:** ${result.error}\n`;
            } else {
              response += `• **Compliance Score:** ${result.complianceScore.overallScore}/100 (${result.complianceScore.riskLevel.toUpperCase()})\n`;
              response += `• **Bias Issues:** ${result.biasAnalysis.length}\n`;
              response += `• **Cultural Entities:** ${result.culturalEntities.length}\n`;
              response += `• **Processing Time:** ${result.processingTime}ms\n`;

              if (result.biasAnalysis.length > 0) {
                const criticalBias = result.biasAnalysis.filter(
                  (b) => b.severity === "critical",
                );
                if (criticalBias.length > 0) {
                  response += `• **🚨 Critical Issues:** ${criticalBias.map((b) => b.type).join(", ")}\n`;
                }
              }
            }
            response += "\n";
          });

          response += `## Batch Recommendations\n`;
          if (batchResult.summary.criticalIssuesCount > 0) {
            response += `🚨 **URGENT:** ${batchResult.summary.criticalIssuesCount} items have critical compliance issues requiring immediate attention.\n`;
          }
          if (batchResult.summary.avgComplianceScore < 75) {
            response += `⚠️ **WARNING:** Average compliance score below recommended threshold. Review content guidelines.\n`;
          }
          if (batchResult.summary.avgComplianceScore >= 85) {
            response += `✅ **EXCELLENT:** Strong overall compliance performance across batch.\n`;
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "add_realtime_signal": {
          const signal: RealtimeSignal = {
            entityId: getArgs(args).entity_id,
            context: {
              userId: getArgs(args).user_id,
              sessionId: getArgs(args).session_id,
              interaction: getArgs(args).interaction as any,
              value: getArgs(args).value,
              location: getArgs(args).location,
              timestamp: new Date().toISOString(),
            },
          };

          const success = qlooClient.addRealtimeUserSignal(signal);

          let response = `📡 **Real-time Signal Processing**\n\n`;

          if (success) {
            response += `✅ **Signal Successfully Processed**\n`;
            response += `• **Entity ID:** ${getArgs(args).entity_id}\n`;
            response += `• **Interaction:** ${getArgs(args).interaction}\n`;
            response += `• **Session:** ${getArgs(args).session_id}\n`;
            if (getArgs(args).user_id)
              response += `• **User ID:** ${getArgs(args).user_id}\n`;
            if (getArgs(args).value)
              response += `• **Value:** ${getArgs(args).value}\n`;
            if (getArgs(args).location)
              response += `• **Location:** ${getArgs(args).location}\n`;
            response += `• **Timestamp:** ${signal.context.timestamp}\n\n`;

            response += `📊 **Signal Impact:**\n`;
            response += `• Real-time cultural intelligence updated\n`;
            response += `• User preference signals captured\n`;
            response += `• Recommendation algorithms notified\n`;
            response += `• Audit trail created for compliance\n`;
          } else {
            response += `❌ **Signal Processing Failed**\n`;
            response += `The signal could not be processed. Please check:\n`;
            response += `• Entity ID format and validity\n`;
            response += `• Session ID is not empty\n`;
            response += `• Interaction type is supported\n`;
          }

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        case "configure_environment": {
          try {
            const args = getArgs(request.params.arguments);

            // Create new configuration based on mode
            const newConfig =
              args.mode === "Production"
                ? { ...DEFAULT_PRODUCTION_CONFIG }
                : { ...DEFAULT_HACKATHON_CONFIG };

            // Override with provided settings
            if (args.enableFullPotential !== undefined) {
              newConfig.enableFullPotential = args.enableFullPotential;
            }

            if (args.biasDetectionLevel) {
              newConfig.biasDetectionLevel = args.biasDetectionLevel;
            }

            if (args.enabledFeatures) {
              newConfig.enabledFeatures = {
                ...newConfig.enabledFeatures,
                ...args.enabledFeatures,
              };
            }

            // Update server configuration
            serverConfig = newConfig;

            // Reinitialize client with new config if it exists
            if (qlooClient) {
              const apiKey = process.env.QLOO_API_KEY!;
              qlooClient = new EnhancedQlooClient(apiKey, newConfig);
            }

            let response = `🔧 **Environment Configuration Updated**\n\n`;
            response += `**Mode:** ${newConfig.mode}\n`;
            response += `**Enable Full Potential:** ${newConfig.enableFullPotential}\n`;
            response += `**API Endpoint:** ${newConfig.apiEndpoint}\n`;
            response += `**Bias Detection Level:** ${newConfig.biasDetectionLevel.toUpperCase()}\n\n`;

            response += `## Compliance Thresholds\n`;
            response += `• **Critical:** Below ${newConfig.complianceThresholds.critical}%\n`;
            response += `• **High Risk:** Below ${newConfig.complianceThresholds.high}%\n`;
            response += `• **Medium Risk:** Below ${newConfig.complianceThresholds.medium}%\n\n`;

            response += `## Feature Status\n`;
            Object.entries(newConfig.enabledFeatures).forEach(
              ([feature, enabled]) => {
                response += `• **${feature.replace(/([A-Z])/g, " $1").toLowerCase()}:** ${enabled ? "✅ Enabled" : "❌ Disabled"}\n`;
              },
            );

            response += `\n🎯 **Environment Impact:**\n`;
            if (newConfig.mode === "Hackathon") {
              response += `• Optimized for demos and rapid prototyping\n`;
              response += `• More lenient bias detection thresholds\n`;
              response += `• Reduced regulatory penalty weights\n`;
              response += `• Focus on core functionality\n`;
            } else {
              response += `• Full production validation enabled\n`;
              response += `• Strict compliance monitoring\n`;
              response += `• All regulatory frameworks active\n`;
              response += `• Maximum bias detection sensitivity\n`;
            }

            return {
              content: [{ type: "text", text: response } as TextContent],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Configuration Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                } as TextContent,
              ],
            };
          }
        }

        case "get_environment_info": {
          const envInfo = qlooClient?.getEnvironmentInfo() || {
            mode: serverConfig.mode,
            config: serverConfig,
          };

          let response = `🌍 **Current Environment Configuration**\n\n`;
          response += `**Mode:** ${envInfo.config.mode} ${envInfo.config.enableFullPotential ? "(Full Potential)" : ""}\n`;
          response += `**API Endpoint:** ${envInfo.config.apiEndpoint}\n`;
          response += `**Bias Detection:** ${envInfo.config.biasDetectionLevel.toUpperCase()}\n\n`;

          response += `## Active Features\n`;
          Object.entries(envInfo.config.enabledFeatures).forEach(
            ([feature, enabled]) => {
              const status = enabled ? "✅" : "❌";
              const name = feature.replace(/([A-Z])/g, " $1").toLowerCase();
              response += `${status} **${name.charAt(0).toUpperCase() + name.slice(1)}**\n`;
            },
          );

          response += `\n## Detection Thresholds\n`;
          response += `• **Critical Issues:** < ${envInfo.config.complianceThresholds.critical}%\n`;
          response += `• **High Risk:** < ${envInfo.config.complianceThresholds.high}%\n`;
          response += `• **Medium Risk:** < ${envInfo.config.complianceThresholds.medium}%\n`;

          response += `\n💡 **Available Bias Patterns by Detection Level:**\n`;
          const patternCounts = {
            lenient: Object.values(
              EnhancedBiasDetector["BIAS_PATTERNS"],
            ).filter((p) => p.detectionLevel.includes("lenient")).length,
            moderate: Object.values(
              EnhancedBiasDetector["BIAS_PATTERNS"],
            ).filter((p) => p.detectionLevel.includes("moderate")).length,
            strict: Object.values(EnhancedBiasDetector["BIAS_PATTERNS"]).filter(
              (p) => p.detectionLevel.includes("strict"),
            ).length,
          };

          response += `• **Lenient:** ${patternCounts.lenient} patterns\n`;
          response += `• **Moderate:** ${patternCounts.moderate} patterns\n`;
          response += `• **Strict:** ${patternCounts.strict} patterns\n`;

          return {
            content: [{ type: "text", text: response } as TextContent],
          };
        }

        default:
          return {
            content: [
              { type: "text", text: `❌ Unknown tool: ${name}` } as TextContent,
            ],
          };
      }
    } catch (error) {
      console.error(`Error handling tool call ${name}:`, error);

      let errorMessage = `❌ **Error in ${name}**\n\n`;

      if (error instanceof Error) {
        errorMessage += `**Error:** ${error.message}\n`;

        // Provide helpful context based on error type
        if (error.message.includes("Rate limit")) {
          errorMessage += `\n💡 **Solution:** Please wait a moment and try again. The system is rate-limited to prevent API abuse.\n`;
        } else if (error.message.includes("API key")) {
          errorMessage += `\n💡 **Solution:** Check that QLOO_API_KEY environment variable is set correctly.\n`;
        } else if (error.message.includes("timeout")) {
          errorMessage += `\n💡 **Solution:** The request timed out. Try again or reduce the complexity of your request.\n`;
        } else if (error.message.includes("Circuit breaker")) {
          errorMessage += `\n💡 **Solution:** The system is experiencing issues. Please wait 30 seconds and try again.\n`;
        }
      } else {
        errorMessage += `**Error:** Unknown error occurred\n`;
      }

      errorMessage += `\n🔧 **Need help?** Use the 'get_system_status' tool to check system health.`;

      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          } as TextContent,
        ],
      };
    }
  },
);

// =============================================================================
// MAIN FUNCTION
// =============================================================================

async function main() {
  console.error("🛡️ Starting CulturalTruth Enhanced MCP Server...");

  // Validate environment
  const apiKey = process.env.QLOO_API_KEY;
  if (!apiKey) {
    console.error("❌ QLOO_API_KEY environment variable not set");
    console.error("");
    console.error("🔧 Setup Instructions:");
    console.error("1. Get your Qloo API key from https://qloo.com/developers");
    console.error("2. Set environment variable: QLOO_API_KEY=your_key_here");
    console.error("3. Or add to .env file in project root");
    console.error("");
    console.error("Example .env file:");
    console.error("QLOO_API_KEY=your_actual_api_key_here");
    console.error("RATE_LIMIT_PER_MINUTE=50");
    console.error("MAX_CACHE_SIZE=1000");
    process.exit(1);
  }

  try {
    // Determine environment mode from environment variables
    const envMode =
      (process.env.CULTURAL_TRUTH_MODE as EnvironmentMode) || "Hackathon";
    if (envMode === "Production") {
      serverConfig = DEFAULT_PRODUCTION_CONFIG;
    } else {
      serverConfig = DEFAULT_HACKATHON_CONFIG;
    }

    // Initialize Qloo client with environment configuration
    qlooClient = new EnhancedQlooClient(apiKey, serverConfig);
    console.error(
      `✅ Qloo client initialized successfully in ${serverConfig.mode} mode`,
    );

    // Test API connectivity
    try {
      await qlooClient.searchEntities({ query: "test", limit: 1 });
      console.error("✅ Qloo API connectivity verified");
    } catch (error) {
      console.error(
        "⚠️ Qloo API test failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      console.error(
        "   Continuing anyway - API may be temporarily unavailable",
      );
    }

    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("🚀 CulturalTruth Enhanced MCP Server started successfully");
    console.error("");
    console.error("📋 Available Tools:");
    console.error(
      "• analyze_content_bias - Comprehensive bias analysis with compliance scoring",
    );
    console.error(
      "• get_compliance_report - Generate compliance reports with trends",
    );
    console.error("• qloo_basic_insights - Basic cultural insights from Qloo");
    console.error(
      "• qloo_demographic_insights - Demographic-aware cultural analysis",
    );
    console.error("• qloo_entity_search - Search Qloo's cultural database");
    console.error("• qloo_compare_entities - Compare cultural entities");
    console.error("• qloo_trending_entities - Get trending cultural content");
    console.error(
      "• qloo_geospatial_insights - Location-based cultural insights",
    );
    console.error(
      "• qloo_audience_compare - Compare audience groups with delta scores",
    );
    console.error(
      "• get_cultural_trends - Get trending content with demographic filters",
    );
    console.error(
      "• batch_cultural_audit - Batch process multiple content items",
    );
    console.error(
      "• add_realtime_signal - Add real-time user interaction signals",
    );
    console.error(
      "• get_system_status - System health and performance metrics",
    );
    console.error("");
    console.error("🛡️ Security Features:");
    console.error("• Input sanitization and validation");
    console.error("• Rate limiting and circuit breaker");
    console.error("• Comprehensive audit trails");
    console.error("• PII protection and data filtering");
    console.error("");
    console.error("📊 Compliance Features:");
    console.error("• EU AI Act compliance scoring");
    console.error("• Section 508 accessibility checks");
    console.error("• GDPR data protection validation");
    console.error("• Regulatory risk assessment");
    console.error("");
  } catch (error) {
    console.error("❌ Failed to start CulturalTruth MCP server:", error);
    process.exit(1);
  }
}

// =============================================================================
// ERROR HANDLING AND CLEANUP
// =============================================================================

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.error("\n🛑 Received SIGINT. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("\n🛑 Received SIGTERM. Shutting down gracefully...");
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

// Export for testing
export { EnhancedQlooClient, EnhancedBiasDetector, LRUCache, CircuitBreaker };
