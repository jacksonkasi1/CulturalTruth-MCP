/**
 * Enhanced Bias Detector - CulturalTruth MCP
 * Advanced logic for bias detection and analysis
 */

import {
  BiasPattern,
  ComplianceScore,
  EnvironmentConfig
} from './types/index.js';

export class EnhancedBiasDetector {
  private static config: EnvironmentConfig;

  static setConfig(config: EnvironmentConfig): void {
    this.config = config;
  }

  private static readonly BIAS_PATTERNS: Record<string, Omit<BiasPattern, 'matches' | 'confidence'> & { detectionLevel: ('strict' | 'moderate' | 'lenient')[] }> = {
    // Gender-exclusive language patterns
    'guys_only': {
      type: 'gender_exclusive',
      pattern: '\\b(?:guys|bros|brotherhood|manpower|man-hours|policeman|fireman|chairman|businessman)\\b',
      severity: 'medium',
      suggestions: ['team', 'colleagues', 'workforce', 'person-hours', 'police officer', 'firefighter', 'chairperson', 'businessperson'],
      regulation_risk: ['EU_AI_ACT', 'EEOC', 'TITLE_VII'],
      detectionLevel: ['strict', 'moderate']
    },

    'gendered_roles': {
      type: 'gender_exclusive',
      pattern: '\\b(?:rockstar|ninja|guru|wizard)\\s+(?:developer|engineer|programmer)\\b',
      severity: 'medium',
      suggestions: ['skilled developer', 'expert engineer', 'experienced programmer', 'talented developer'],
      regulation_risk: ['EU_AI_ACT', 'EEOC'],
      detectionLevel: ['strict']
    },

    // Age discrimination markers
    'age_proxy': {
      type: 'age_discriminatory',
      pattern: '\\b(?:young|recent graduate|digital native|energy|fresh|millennial|gen-z|generation z|under 30|20-something)\\b',
      severity: 'high',
      suggestions: ['qualified', 'experienced', 'skilled', 'motivated', 'enthusiastic', 'tech-savvy'],
      regulation_risk: ['ADEA', 'EU_AI_ACT', 'AGE_DISCRIMINATION_ACT'],
      detectionLevel: ['strict', 'moderate', 'lenient']
    },

    'senior_bias': {
      type: 'age_discriminatory',
      pattern: '\\b(?:overqualified|too experienced|set in ways|old school|traditional methods|not tech-savvy)\\b',
      severity: 'high',
      suggestions: ['highly qualified', 'extensively experienced', 'proven methods', 'established practices'],
      regulation_risk: ['ADEA', 'EU_AI_ACT'],
      detectionLevel: ['strict', 'moderate']
    },

    // Racial/geographic proxies (expanded with real zip codes)
    'location_proxy': {
      type: 'racial_proxy',
      pattern: '\\b(?:94110|94102|10025|10128|90210|90211|60601|60605|inner city|urban|suburban|from the hood|ghetto|barrio)\\b',
      severity: 'critical',
      suggestions: ['location-flexible', 'remote-friendly', 'multiple locations', 'urban area', 'metropolitan area'],
      regulation_risk: ['FAIR_HOUSING_ACT', 'GDPR', 'EU_AI_ACT', 'CIVIL_RIGHTS_ACT'],
      detectionLevel: ['strict', 'moderate', 'lenient']
    },

    'education_proxy': {
      type: 'racial_proxy',
      pattern: '\\b(?:ivy league|tier-1 college|top university|elite school|prestigious institution)\\b',
      severity: 'medium',
      suggestions: ['accredited university', 'relevant education', 'qualified institution', 'recognized degree'],
      regulation_risk: ['EU_AI_ACT', 'EEOC'],
      detectionLevel: ['strict']
    },

    // Cultural assumptions
    'cultural_assumption': {
      type: 'cultural_insensitive',
      pattern: '\\b(?:native speaker|american values|western mindset|traditional family|christian values|normal family|typical american)\\b',
      severity: 'high',
      suggestions: ['fluent in', 'aligned with company values', 'diverse perspectives', 'inclusive values', 'family-friendly'],
      regulation_risk: ['TITLE_VII', 'EU_AI_ACT', 'RELIGIOUS_FREEDOM_ACT'],
      detectionLevel: ['strict', 'moderate']
    },

    'name_bias': {
      type: 'cultural_insensitive',
      pattern: '\\b(?:easy to pronounce name|american sounding name|simple name|anglicized name)\\b',
      severity: 'critical',
      suggestions: ['clear communication skills', 'professional presentation', 'effective communication'],
      regulation_risk: ['TITLE_VII', 'EU_AI_ACT', 'NATIONAL_ORIGIN_DISCRIMINATION'],
      detectionLevel: ['strict', 'moderate', 'lenient']
    },

    // Accessibility barriers
    'ability_exclusive': {
      type: 'accessibility_barrier',
      pattern: '\\b(?:must be able to lift|perfect vision|hearing required|no accommodations|physically demanding|requires standing|manual dexterity required)\\b',
      severity: 'critical',
      suggestions: ['with or without accommodation', 'reasonable accommodations provided', 'essential job functions'],
      regulation_risk: ['ADA', 'SECTION_508', 'EU_ACCESSIBILITY_ACT', 'REHABILITATION_ACT'],
      detectionLevel: ['strict', 'moderate', 'lenient']
    },

    'cognitive_bias': {
      type: 'accessibility_barrier',
      pattern: '\\b(?:fast-paced environment|high-stress|multitasking required|quick thinking|rapid response|immediate decisions)\\b',
      severity: 'medium',
      suggestions: ['dynamic environment', 'collaborative setting', 'efficient workflow', 'effective decision-making'],
      regulation_risk: ['ADA', 'EU_ACCESSIBILITY_ACT'],
      detectionLevel: ['strict']
    }
  };

  // Enhanced entity extraction with proper NER-like logic
  private static readonly ENTITY_STOPLIST = new Set([
    'THE', 'AND', 'OR', 'BUT', 'FOR', 'WITH', 'THIS', 'THAT', 'FROM', 'HAVE', 'WILL', 'WOULD', 'COULD', 'SHOULD',
    'ABOUT', 'AFTER', 'BEFORE', 'DURING', 'WHILE', 'WHERE', 'WHEN', 'WHAT', 'WHO', 'HOW', 'WHY', 'WHICH',
    'SOME', 'MANY', 'MOST', 'ALL', 'EACH', 'EVERY', 'ANY', 'NO', 'NONE', 'BOTH', 'EITHER', 'NEITHER'
  ]);

  private static readonly ENTITY_PATTERNS = [
    // Movie titles (often quoted or capitalized)
    /["']([A-Z][^"']{2,50})["']/g,
    // Proper nouns (capitalized words)
    /\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*\b/g,
    // Brand names and titles
    /\b(?:Marvel|Disney|Netflix|HBO|Amazon|Apple|Google|Microsoft|Sony|Warner)\s+[A-Z][a-zA-Z\s]+/g
  ];

  static extractEntities(text: string): string[] {
    const entities = new Set<string>();
    const sanitizedText = this.sanitizeInput(text);

    // Apply multiple entity extraction patterns
    for (const pattern of this.ENTITY_PATTERNS) {
      const matches = sanitizedText.match(pattern) ?? [];
      matches.forEach(match => {
        const cleaned = match.replace(/["']/g, '').trim();
        if (cleaned.length >= 3 && cleaned.length <= 50 &&
            !this.ENTITY_STOPLIST.has(cleaned.toUpperCase()) &&
            !this.isCommonWord(cleaned)) {
          entities.add(cleaned);
        }
      });
    }

    // Limit to prevent API abuse and return as array
    return Array.from(entities).slice(0, 10);
  }

  private static isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'COMPANY', 'BUSINESS', 'SERVICE', 'PRODUCT', 'SYSTEM', 'PROCESS', 'METHOD', 'APPROACH',
      'SOLUTION', 'TECHNOLOGY', 'PLATFORM', 'APPLICATION', 'SOFTWARE', 'HARDWARE', 'DATA'
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

      const regex = new RegExp(pattern.pattern, 'gi');
      const matches = sanitizedText.match(regex);

      if (matches) {
        // Calculate confidence based on context and frequency
        const confidence = this.calculateConfidence(matches, sanitizedText, pattern.type);

        // Apply environment-specific confidence adjustments
        let adjustedConfidence = confidence;
        if (this.config.mode === 'Hackathon') {
          // In hackathon mode, be more lenient with lower-severity issues
          if (pattern.severity === 'low' || pattern.severity === 'medium') {
            adjustedConfidence *= 0.8;
          }
        } else if (this.config.mode === 'Production') {
          // In production mode, be more strict
          adjustedConfidence *= 1.1;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
        const { detectionLevel, ...patternWithoutDetectionLevel } = pattern;
        detectedBias.push({
          ...patternWithoutDetectionLevel,
          matches: matches.map(m => m.toLowerCase()),
          confidence: Math.min(adjustedConfidence, 1.0)
        });
      }
    }

    return detectedBias.sort((a, b) => b.confidence - a.confidence);
  }

  private static calculateConfidence(matches: string[], text: string, biasType: string): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for multiple matches
    confidence += Math.min(matches.length * 0.1, 0.2);

    // Increase confidence for certain contexts
    const contextWords = {
      'gender_exclusive': ['hiring', 'job', 'position', 'role', 'team'],
      'age_discriminatory': ['candidate', 'applicant', 'hire', 'employee'],
      'racial_proxy': ['location', 'area', 'neighborhood', 'zip'],
      'cultural_insensitive': ['background', 'culture', 'family', 'values'],
      'accessibility_barrier': ['requirement', 'must', 'able', 'capacity']
    };

    const relevantWords = contextWords[biasType as keyof typeof contextWords] || [];
    const contextMatches = relevantWords.filter(word =>
      new RegExp(`\\b${word}\\b`, 'i').test(text)
    ).length;

    confidence += contextMatches * 0.05;

    return Math.min(confidence, 1.0);
  }

  static calculateComplianceScore(biasPatterns: BiasPattern[]): ComplianceScore {
    let totalDeductions = 0;
    const regulations = new Set<string>();

    // Environment-specific severity multipliers
    const severityMultiplier = this.config.mode === 'Hackathon' ? {
      'low': 2,
      'medium': 8,
      'high': 20,
      'critical': 35
    } : {
      'low': 3,
      'medium': 10,
      'high': 25,
      'critical': 45
    };

    for (const bias of biasPatterns) {
      // Weight deductions by confidence
      const weightedDeduction = severityMultiplier[bias.severity] * bias.confidence;
      totalDeductions += weightedDeduction;

      bias.regulation_risk.forEach(reg => regulations.add(reg));
    }

    const baseScore = Math.max(0, 100 - totalDeductions);

    // Calculate regulation-specific scores with environment-specific penalties
    const euAiActRegulations = ['EU_AI_ACT'];
    const section508Regulations = ['SECTION_508', 'ADA', 'REHABILITATION_ACT', 'EU_ACCESSIBILITY_ACT'];
    const gdprRegulations = ['GDPR', 'FAIR_HOUSING_ACT', 'CIVIL_RIGHTS_ACT'];

    const regulationPenalty = this.config.mode === 'Hackathon' ? {
      euAiAct: 15,
      section508: 12,
      gdpr: 18
    } : {
      euAiAct: 25,
      section508: 20,
      gdpr: 30
    };

    const euAiAct = this.hasRegulationRisk(regulations, euAiActRegulations) ? Math.max(0, baseScore - regulationPenalty.euAiAct) : baseScore;
    const section508 = this.hasRegulationRisk(regulations, section508Regulations) ? Math.max(0, baseScore - regulationPenalty.section508) : baseScore;
    const gdpr = this.hasRegulationRisk(regulations, gdprRegulations) ? Math.max(0, baseScore - regulationPenalty.gdpr) : baseScore;

    const overallScore = Math.min(euAiAct, section508, gdpr);

    // Environment-specific risk level thresholds
    const thresholds = this.config.complianceThresholds;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (overallScore < thresholds.critical) riskLevel = 'critical';
    else if (overallScore < thresholds.high) riskLevel = 'high';
    else if (overallScore < thresholds.medium) riskLevel = 'medium';

    return {
      euAiAct,
      section508,
      gdpr,
      riskLevel,
      overallScore,
      regulations_triggered: Array.from(regulations)
    };
  }

  private static hasRegulationRisk(regulations: Set<string>, targetRegulations: string[]): boolean {
    return targetRegulations.some(reg => regulations.has(reg));
  }

  private static sanitizeInput(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .replace(/<!--[\s\S]*?-->/g, '') // Strip HTML comments
      .replace(/javascript:/gi, '') // Remove JS URLs
      .replace(/data:/gi, '') // Remove data URLs
      .replace(/[^\w\s\-_.]/g, ' ') // Keep only safe characters
      .slice(0, 10000); // Cap at 10k chars
  }
}

export default EnhancedBiasDetector;




