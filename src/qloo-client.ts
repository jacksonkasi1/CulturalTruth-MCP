/**
 * Enhanced Qloo Client - CulturalTruth MCP
 * Extended client functionality for Qloo API integration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { createHash } from 'crypto';
import {
  EnvironmentConfig,
  EnvironmentMode,
  QlooEntity,
  QlooResponse,
  BiasPattern,
  ComplianceScore,
  AuditTrail,
  DemographicAnalysis,
  ComplianceReport,
  BatchAuditRequest,
  BatchAuditResult,
  ComparisonResult,
  RealtimeSignal,
} from './types/index.js';
import { EnhancedBiasDetector } from './bias-detector.js';
import { SimpleRateLimiter } from './utils/rate-limiter.js';
import { CircuitBreaker } from './utils/circuit-breaker.js';
import { LRUCache } from './utils/lru-cache.js';
import { DEFAULT_HACKATHON_CONFIG } from './config/environment.js';

export class EnhancedQlooClient {
  private api: AxiosInstance;
  private rateLimiter: SimpleRateLimiter;
  private circuitBreaker: CircuitBreaker;
  private entityCache: LRUCache<QlooEntity[]>;
  private demographicCache: LRUCache<QlooResponse>;
  private auditTrails: AuditTrail[] = [];
  private apiCallCount = 0;
  private cacheHitCount = 0;
  private config: EnvironmentConfig;

  constructor(apiKey: string, config?: EnvironmentConfig) {
    if (!apiKey) {
      throw new Error('Qloo API key is required');
    }

    // Set configuration based on environment or default to Hackathon
    this.config = config || DEFAULT_HACKATHON_CONFIG;
    
    // Update bias detector with the same config
    EnhancedBiasDetector.setConfig(this.config);

    this.api = axios.create({
      baseURL: this.config.apiEndpoint,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'CulturalTruth-MCP/2.0.0'
      },
      timeout: parseInt(process.env.API_TIMEOUT || '10000'),
      maxRedirects: 3
    });

    // Configure rate limiter from environment
    const rateLimit = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '50');
    this.rateLimiter = new SimpleRateLimiter({ tokensPerInterval: rateLimit, interval: 'minute' });
    
    this.circuitBreaker = new CircuitBreaker(
      parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
      parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '30000')
    );
    
    this.entityCache = new LRUCache<QlooEntity[]>(
      parseInt(process.env.MAX_CACHE_SIZE || '1000'),
      parseInt(process.env.CACHE_TTL_MS || '300000')
    );
    
    this.demographicCache = new LRUCache<QlooResponse>(
      parseInt(process.env.MAX_CACHE_SIZE || '1000'),
      parseInt(process.env.CACHE_TTL_MS || '300000')
    );

    this.setupAxiosInterceptors();
  }

  private isFeatureEnabled(feature: keyof EnvironmentConfig['enabledFeatures']): boolean {
    return this.config.enabledFeatures[feature];
  }

  getEnvironmentInfo(): { mode: EnvironmentMode; config: EnvironmentConfig } {
    return {
      mode: this.config.mode,
      config: { ...this.config }
    };
  }

  private setupAxiosInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        this.apiCallCount++;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const status = error.response?.status;
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please slow down requests.');
        } else if (status === 401) {
          throw new Error('Invalid Qloo API key. Please check your credentials.');
        } else if (status === 403) {
          throw new Error('Qloo API access forbidden. Check your subscription.');
        } else if (status && status >= 500) {
          throw new Error('Qloo API server error. Please try again later.');
        }
        throw error;
      }
    );
  }

  private generateSessionId(): string {
    return createHash('sha256')
      .update(Date.now() + Math.random().toString() + process.pid.toString())
      .digest('hex')
      .slice(0, 16);
  }

  private sanitizeOutput(entity: QlooEntity): QlooEntity {
    // Only return safe, non-PII properties
    const sanitized: QlooEntity = {
      name: entity.name || 'Unknown',
      entity_id: entity.entity_id,
      type: entity.type,
      subtype: entity.subtype,
      properties: {}
    };

    // Allow list of safe properties
    const safeProperties = ['release_year', 'popularity', 'content_rating', 'rating', 'price_level'];
    safeProperties.forEach(prop => {
      if (entity.properties && entity.properties[prop] !== undefined) {
        if (prop === 'popularity' && typeof entity.properties[prop] === 'number') {
          // Round popularity to 2 decimal places
          sanitized.properties[prop] = Math.round(entity.properties[prop] * 100) / 100;
        } else {
          sanitized.properties[prop] = entity.properties[prop];
        }
      }
    });

    return sanitized;
  }

  async analyzeContent(content: string, userId?: string): Promise<{
    biasAnalysis: BiasPattern[];
    complianceScore: ComplianceScore;
    culturalEntities: QlooEntity[];
    auditTrail: AuditTrail;
    demographics?: DemographicAnalysis[];
  }> {
    const startTime = Date.now();
    const sessionId = this.generateSessionId();
    const contentHash = createHash('sha256').update(content).digest('hex');
    let cacheHits = 0;
    const initialApiCalls = this.apiCallCount;

    try {
      // Step 1: Bias Detection (always runs)
      const detectedBias = EnhancedBiasDetector.detectBiasPatterns(content);
      const complianceScore = EnhancedBiasDetector.calculateComplianceScore(detectedBias);

      // Step 2: Entity Extraction and Cultural Analysis
      const entities = EnhancedBiasDetector.extractEntities(content);
      const culturalEntities: QlooEntity[] = [];
      let demographics: DemographicAnalysis[] = [];

      if (entities.length > 0) {
        const cacheKey = entities.sort().join('|');
        let cachedResults = this.entityCache.get(cacheKey);

        if (cachedResults) {
          cacheHits++;
          culturalEntities.push(...cachedResults.map(entity => this.sanitizeOutput(entity)));
        } else {
          // Parallel entity lookups with rate limiting
          const entityPromises = entities.slice(0, 5).map(async (entity) => {
            await this.rateLimiter.removeTokens(1);
            return this.searchEntities({ query: entity, limit: 3 });
          });

          const results = await Promise.allSettled(entityPromises);
          const successfulResults = results
            .filter((result): result is PromiseFulfilledResult<QlooResponse> => 
              result.status === 'fulfilled' && result.value.success)
            .flatMap(result => result.value.results.entities);

          this.entityCache.set(cacheKey, successfulResults);
          culturalEntities.push(...successfulResults.map(entity => this.sanitizeOutput(entity)));
        }

        // Step 3: Demographic Analysis (if entities found and feature enabled)
        if (culturalEntities.length > 0 && this.isFeatureEnabled('demographicAnalysis')) {
          demographics = await this.getDemographicAnalysis(culturalEntities.slice(0, 3));
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
        qlooEntities: culturalEntities.map(e => e.entity_id),
        complianceScore,
        mitigationActions,
        processingTime: Date.now() - startTime,
        apiCallsCount: this.apiCallCount - initialApiCalls,
        cacheHits
      };

      this.addAuditTrail(auditTrail);

      return {
        biasAnalysis: detectedBias,
        complianceScore,
        culturalEntities,
        auditTrail,
        demographics: demographics.length > 0 ? demographics : undefined
      };

    } catch (error) {
      console.error('Error in analyzeContent:', error);
      
      // Create error audit trail
      const auditTrail: AuditTrail = {
        timestamp: new Date().toISOString(),
        sessionId,
        userId,
        originalContent: content.slice(0, 1000),
        contentHash,
        detectedBias: [],
        qlooEntities: [],
        complianceScore: { euAiAct: 0, section508: 0, gdpr: 0, riskLevel: 'critical', overallScore: 0, regulations_triggered: ['SYSTEM_ERROR'] },
        mitigationActions: ['System error occurred during analysis'],
        processingTime: Date.now() - startTime,
        apiCallsCount: this.apiCallCount - initialApiCalls,
        cacheHits
      };

      this.addAuditTrail(auditTrail);
      throw error;
    }
  }

  private async getDemographicAnalysis(entities: QlooEntity[]): Promise<DemographicAnalysis[]> {
    const demographics = ['young_adult', 'middle_aged', 'senior'];
    const analyses: DemographicAnalysis[] = [];

    try {
      const promises = demographics.map(async (demographic) => {
        const cacheKey = `demo_${demographic}_${entities.map(e => e.entity_id).join(',')}`;
        let cached = this.demographicCache.get(cacheKey);

        if (cached) {
          this.cacheHitCount++;
          return { demographic, response: cached };
        }

        await this.rateLimiter.removeTokens(1);
        const response = await this.getDemographicInsights({
          'filter.type': 'urn:entity:movie', // Default to movies for demo
          'signal.demographics.age': demographic,
          'take': 5
        });

        this.demographicCache.set(cacheKey, response);
        return { demographic, response };
      });

      const results = await Promise.allSettled(promises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.response.success) {
          const { demographic, response } = result.value;
          analyses.push({
            demographic,
            entities: response.results.entities.map(e => this.sanitizeOutput(e)),
            confidence: 0.8, // Base confidence for demographic analysis
            culturalRelevance: response.results.entities.length > 0 ? 0.7 : 0.3
          });
        }
      });

    } catch (error) {
      console.error('Error in demographic analysis:', error);
    }

    return analyses;
  }

  private generateMitigationActions(biasPatterns: BiasPattern[]): string[] {
    const actions: string[] = [];
    
    if (biasPatterns.length === 0) {
      actions.push('✅ No bias detected - content appears compliant');
      return actions;
    }

    const criticalBias = biasPatterns.filter(b => b.severity === 'critical');
    const highBias = biasPatterns.filter(b => b.severity === 'high');
    const mediumBias = biasPatterns.filter(b => b.severity === 'medium');
    const lowBias = biasPatterns.filter(b => b.severity === 'low');

    if (criticalBias.length > 0) {
      actions.push(`🚨 IMMEDIATE ACTION REQUIRED: ${criticalBias.length} critical bias issue(s) detected`);
      criticalBias.forEach(bias => {
        actions.push(`   → Replace "${bias.matches.join(', ')}" - Risk: ${bias.regulation_risk.join(', ')}`);
      });
    }

    if (highBias.length > 0) {
      actions.push(`⚠️ HIGH PRIORITY: Review ${highBias.length} high-risk bias pattern(s)`);
      highBias.forEach(bias => {
        actions.push(`   → Consider: "${bias.suggestions.slice(0, 2).join(' or ')}" instead of "${bias.matches[0]}"`);
      });
    }

    if (mediumBias.length > 0) {
      actions.push(`📋 MODERATE: ${mediumBias.length} improvement opportunities identified`);
    }

    if (lowBias.length > 0) {
      actions.push(`💡 SUGGESTIONS: ${lowBias.length} minor optimization(s) available`);
    }

    // Add overall recommendation
    const overallRisk = Math.max(...biasPatterns.map(b => {
      const riskScores = { low: 1, medium: 2, high: 3, critical: 4 };
      return riskScores[b.severity];
    }));

    if (overallRisk >= 4) {
      actions.push('🔴 RECOMMENDATION: Do not publish without addressing critical issues');
    } else if (overallRisk >= 3) {
      actions.push('🟡 RECOMMENDATION: Address high-risk issues before publication');
    } else if (overallRisk >= 2) {
      actions.push('🟢 RECOMMENDATION: Content acceptable with minor improvements');
    } else {
      actions.push('✅ RECOMMENDATION: Content meets compliance standards');
    }

    return actions;
  }

  private addAuditTrail(trail: AuditTrail): void {
    this.auditTrails.push(trail);
    
    // Keep only recent audit trails in memory (configurable retention)
    const maxTrails = parseInt(process.env.MAX_AUDIT_TRAILS || '1000');
    if (this.auditTrails.length > maxTrails) {
      this.auditTrails = this.auditTrails.slice(-maxTrails);
    }
  }

  // =============================================================================
  // QLOO API METHODS
  // =============================================================================

  async getBasicInsights(params: {
    'filter.type': string;
    'filter.tags'?: string;
    'filter.release_year.min'?: number;
    'filter.release_year.max'?: number;
    'filter.popularity.min'?: number;
    'filter.popularity.max'?: number;
    'filter.content_rating'?: string;
    'take'?: number;
    'offset'?: number;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get('/v2/insights/', { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status
        };
      } catch (error) {
        console.error('Error calling Qloo Basic Insights:', error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  async getDemographicInsights(params: {
    'filter.type': string;
    'signal.demographics.age'?: string;
    'signal.demographics.gender'?: string;
    'signal.demographics.audiences'?: string;
    'signal.demographics.audiences.weight'?: number;
    'signal.interests.entities'?: string;
    'signal.interests.tags'?: string;
    'take'?: number;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get('/v2/insights/', { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status
        };
      } catch (error) {
        console.error('Error calling Qloo Demographic Insights:', error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  async searchEntities(params: {
    query: string;
    type?: string;
    limit?: number;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get('/search', { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status
        };
      } catch (error) {
        console.error('Error calling Qloo Entity Search:', error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  async compareEntities(params: {
    'entities_a': string;
    'entities_b': string;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get('/v2/insights/compare', { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status
        };
      } catch (error) {
        console.error('Error calling Qloo Analysis Compare:', error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  async getTrendingEntities(params: {
    type: string;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get('/trends/category', { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status
        };
      } catch (error) {
        console.error('Error calling Qloo Trending:', error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  async getGeospatialInsights(params: {
    'filter.type': string;
    'filter.location'?: string;
    'filter.location.radius'?: number;
    'filter.geocode.country_code'?: string;
    'filter.geocode.admin1_region'?: string;
    'filter.price_level.min'?: number;
    'filter.price_level.max'?: number;
    'filter.rating.min'?: number;
    'filter.rating.max'?: number;
    'take'?: number;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get('/geospatial', { params });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status
        };
      } catch (error) {
        console.error('Error calling Qloo Geospatial:', error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : 'Unknown error'
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
    const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));
    const recentTrails = this.auditTrails.filter(trail => 
      new Date(trail.timestamp) > cutoffDate
    );

    const riskDistribution = recentTrails.reduce((acc, trail) => {
      acc[trail.complianceScore.riskLevel] = (acc[trail.complianceScore.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgScore = recentTrails.length > 0 
      ? recentTrails.reduce((sum, trail) => sum + trail.complianceScore.overallScore, 0) / recentTrails.length
      : 0;

    // Analyze bias patterns
    const biasOccurrences = new Map<string, { count: number; severities: string[] }>();
    recentTrails.forEach(trail => {
      trail.detectedBias.forEach(bias => {
        const key = bias.type;
        if (!biasOccurrences.has(key)) {
          biasOccurrences.set(key, { count: 0, severities: [] });
        }
        const entry = biasOccurrences.get(key)!;
        entry.count++;
        entry.severities.push(bias.severity);
      });
    });

    const topIssues = Array.from(biasOccurrences.entries()).map(([biasType, data]) => ({
      biasType,
      occurrences: data.count,
      averageSeverity: this.calculateAverageSeverity(data.severities),
      regulationsTriggered: [...new Set(recentTrails
        .flatMap(t => t.detectedBias)
        .filter(b => b.type === biasType)
        .flatMap(b => b.regulation_risk))]
    })).sort((a, b) => b.occurrences - a.occurrences).slice(0, 10);

    // Generate trends
    const trendsOverTime = this.generateTrends(recentTrails, daysBack);

    // Generate recommendations
    const recommendations = this.generateRecommendations(recentTrails, topIssues, avgScore);

    return {
      period: {
        start: cutoffDate.toISOString(),
        end: new Date().toISOString(),
        days: daysBack
      },
      summary: {
        totalAnalyses: recentTrails.length,
        averageComplianceScore: Math.round(avgScore * 100) / 100,
        riskDistribution,
        trendsOverTime
      },
      topIssues,
      recommendations
    };
  }

  private calculateAverageSeverity(severities: string[]): string {
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const avgScore = severities.reduce((sum, s) => sum + severityScores[s as keyof typeof severityScores], 0) / severities.length;
    
    if (avgScore >= 3.5) return 'critical';
    if (avgScore >= 2.5) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }

  private generateTrends(trails: AuditTrail[], days: number): Array<{ date: string; averageScore: number; highRiskCount: number }> {
    const trends: Array<{ date: string; averageScore: number; highRiskCount: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayTrails = trails.filter(t => {
        const trailDate = new Date(t.timestamp);
        return trailDate >= dayStart && trailDate < dayEnd;
      });

      const averageScore = dayTrails.length > 0
        ? dayTrails.reduce((sum, t) => sum + t.complianceScore.overallScore, 0) / dayTrails.length
        : 0;

      const highRiskCount = dayTrails.filter(t => 
        t.complianceScore.riskLevel === 'high' || t.complianceScore.riskLevel === 'critical'
      ).length;

      trends.push({
        date: dayStart.toISOString().split('T')[0],
        averageScore: Math.round(averageScore * 100) / 100,
        highRiskCount
      });
    }

    return trends;
  }

  private generateRecommendations(trails: AuditTrail[], topIssues: any[], avgScore: number): string[] {
    const recommendations: string[] = [];

    if (avgScore < 50) {
      recommendations.push('🚨 CRITICAL: Average compliance score is below 50%. Immediate review of content processes required.');
    } else if (avgScore < 75) {
      recommendations.push('⚠️ WARNING: Compliance score indicates room for improvement in bias prevention.');
    }

    if (topIssues.length > 0) {
      const topIssue = topIssues[0];
      recommendations.push(`🎯 FOCUS AREA: "${topIssue.biasType}" bias detected in ${topIssue.occurrences} instances. Consider additional training.`);
    }

    const highRiskTrails = trails.filter(t => t.complianceScore.riskLevel === 'critical').length;
    if (highRiskTrails > 0) {
      recommendations.push(`🔴 URGENT: ${highRiskTrails} critical compliance violations require immediate attention.`);
    }

    const regulationCounts = trails.reduce((acc, trail) => {
      trail.complianceScore.regulations_triggered.forEach(reg => {
        acc[reg] = (acc[reg] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topRegulation = Object.entries(regulationCounts).sort(([,a], [,b]) => b - a)[0];
    if (topRegulation && topRegulation[1] > 5) {
      recommendations.push(`📋 COMPLIANCE: Most triggered regulation is ${topRegulation[0]} (${topRegulation[1]} times). Review policies.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ EXCELLENT: Compliance metrics are within acceptable ranges. Continue current practices.');
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
        demographicCache: this.demographicCache.getStats()
      },
      circuitBreakerState: this.circuitBreaker.getState(),
      auditTrailCount: this.auditTrails.length
    };
  }

  // =============================================================================
  // NEW ENHANCED FUNCTIONALITY
  // =============================================================================

  async compareInsights(entitiesA: string[], entitiesB: string[]): Promise<ComparisonResult> {
    try {
      const [groupAResults, groupBResults] = await Promise.all([
        this.getEntitiesByIds(entitiesA),
        this.getEntitiesByIds(entitiesB)
      ]);

      if (!groupAResults.success || !groupBResults.success) {
        return {
          success: false,
          groupA: { entities: [], avgPopularity: 0, commonTags: [] },
          groupB: { entities: [], avgPopularity: 0, commonTags: [] },
          deltaScores: { popularityDelta: 0, culturalAffinityScore: 0, overlapPercentage: 0, recommendations: [] },
          error: 'Failed to fetch entity groups'
        };
      }

      const groupA = this.analyzeEntityGroup(groupAResults.results.entities);
      const groupB = this.analyzeEntityGroup(groupBResults.results.entities);
      
      const deltaScores = this.calculateDeltaScores(groupA, groupB);

      return {
        success: true,
        groupA,
        groupB,
        deltaScores
      };
    } catch (error) {
      return {
        success: false,
        groupA: { entities: [], avgPopularity: 0, commonTags: [] },
        groupB: { entities: [], avgPopularity: 0, commonTags: [] },
        deltaScores: { popularityDelta: 0, culturalAffinityScore: 0, overlapPercentage: 0, recommendations: [] },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async getEntitiesByIds(entityIds: string[]): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.api.get('/entities', { 
          params: { ids: entityIds.join(',') } 
        });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status
        };
      } catch (error) {
        console.error('Error fetching entities by IDs:', error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  private analyzeEntityGroup(entities: QlooEntity[]) {
    const avgPopularity = entities.reduce((sum, e) => 
      sum + (e.properties?.popularity || 0), 0) / entities.length;
    
    const allTags = entities.flatMap(e => e.properties?.tags || []);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag.name] = (acc[tag.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const commonTags = Object.entries(tagCounts)
      .filter(([, count]) => count >= Math.ceil(entities.length * 0.3))
      .map(([name]) => name)
      .slice(0, 10);

    return {
      entities: entities.map(e => this.sanitizeOutput(e)),
      avgPopularity,
      commonTags
    };
  }

  private calculateDeltaScores(groupA: any, groupB: any) {
    const popularityDelta = groupA.avgPopularity - groupB.avgPopularity;
    
    const commonTagsSet = new Set(groupA.commonTags.filter((tag: string) => 
      groupB.commonTags.includes(tag)));
    const overlapPercentage = (commonTagsSet.size / 
      Math.max(groupA.commonTags.length, groupB.commonTags.length)) * 100;
    
    const culturalAffinityScore = Math.min(100, overlapPercentage + 
      (50 * (1 - Math.abs(popularityDelta))));
    
    const recommendations = [];
    if (Math.abs(popularityDelta) > 0.3) {
      recommendations.push(`High popularity gap detected (${(popularityDelta * 100).toFixed(1)}%)`);
    }
    if (overlapPercentage < 20) {
      recommendations.push('Low cultural overlap - consider different targeting strategies');
    }
    if (culturalAffinityScore > 80) {
      recommendations.push('Strong cultural affinity - excellent cross-promotion potential');
    }

    return {
      popularityDelta,
      culturalAffinityScore,
      overlapPercentage,
      recommendations
    };
  }

  async getCulturalTrends(params: {
    category: string;
    timeframe?: string;
    demographic?: string;
    limit?: number;
  }): Promise<QlooResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const queryParams: any = {
          type: params.category
        };
        
        if (params.demographic) {
          queryParams['signal.demographics.age'] = params.demographic;
        }
        if (params.limit) {
          queryParams['take'] = Math.min(params.limit, 50);
        }

        const response = await this.api.get('/trends/category', { params: queryParams });
        return {
          success: true,
          results: response.data.results || { entities: [] },
          status: response.status
        };
      } catch (error) {
        console.error('Error fetching cultural trends:', error);
        return {
          success: false,
          results: { entities: [] },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  async batchCulturalAudit(requests: BatchAuditRequest[]): Promise<BatchAuditResult> {
    const startTime = Date.now();
    const results: BatchAuditResult['results'] = [];
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
            request.user_id
          );
          
          totalComplianceScore += analysis.complianceScore.overallScore;
          if (analysis.complianceScore.riskLevel === 'critical') {
            criticalIssuesCount++;
          }

          return {
            index: actualIndex,
            biasAnalysis: analysis.biasAnalysis,
            complianceScore: analysis.complianceScore,
            culturalEntities: analysis.culturalEntities,
            processingTime: analysis.auditTrail.processingTime
          };
        } catch (error) {
          return {
            index: actualIndex,
            biasAnalysis: [],
            complianceScore: {
              euAiAct: 0, section508: 0, gdpr: 0,
              riskLevel: 'critical' as const,
              overallScore: 0,
              regulations_triggered: ['PROCESSING_ERROR']
            },
            culturalEntities: [],
            processingTime: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      results,
      summary: {
        totalProcessed: requests.length,
        avgComplianceScore: totalComplianceScore / requests.length,
        criticalIssuesCount,
        processingTime: Date.now() - startTime
      }
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
        contentHash: createHash('sha256').update(signal.entityId + signal.context.interaction).digest('hex'),
        detectedBias: [],
        qlooEntities: [signal.entityId],
        complianceScore: {
          euAiAct: 100, section508: 100, gdpr: 100,
          riskLevel: 'low',
          overallScore: 100,
          regulations_triggered: []
        },
        mitigationActions: [`Real-time signal processed: ${signal.context.interaction}`],
        processingTime: 1,
        apiCallsCount: 0,
        cacheHits: 0
      };

      this.addAuditTrail(auditTrail);
      console.log(`Real-time signal processed: ${signal.context.interaction} for ${signal.entityId}`);
      return true;
    } catch (error) {
      console.error('Error processing real-time signal:', error);
      return false;
    }
  }
}
