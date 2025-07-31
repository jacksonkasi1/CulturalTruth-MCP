/**
 * Environment Configuration - CulturalTruth MCP
 * Default configurations for Hackathon and Production modes
 */

import { EnvironmentConfig } from "../types/index.js";

export const DEFAULT_HACKATHON_CONFIG: EnvironmentConfig = {
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

export const DEFAULT_PRODUCTION_CONFIG: EnvironmentConfig = {
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
