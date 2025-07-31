#!/usr/bin/env node

/**
 * CulturalTruth MCP Server - Main Entry Point
 *
 * This file serves as the main entry point for the CulturalTruth MCP server.
 * It imports and starts the MCP server from the mcp/server.ts file.
 */

// Re-export everything from the MCP server
export * from './mcp/server.js';

// When run directly, start the server
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('index.ts')) {
  // Import and run the main function from server.ts
  import('./mcp/server.js').catch((error) => {
    console.error('❌ Failed to start CulturalTruth MCP server:', error);
    process.exit(1);
  });
}
