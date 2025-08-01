#!/usr/bin/env node

/**
 * Test script to verify the bias analysis fix
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test content with the same bias as in the original error
const testContent = `We're looking for young, energetic guys to join our rockstar development team! Must be from top-tier universities, able to lift 50 lbs, and work in our fast-paced environment. Native English speakers preferred. Recent graduates welcome!`;

const testArgs = {
  content: testContent,
  include_audit: true,
  include_demographics: true
};

// Create a test MCP client that communicates with the server
const serverPath = join(__dirname, 'build', 'index.js');

console.log('🧪 Testing CulturalTruth bias analysis fix...');
console.log('📝 Test content:', testContent.substring(0, 100) + '...');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send an analyze_content_bias request to the server
const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "analyze_content_bias",
    arguments: testArgs
  }
};

let responseData = '';

server.stdout.on('data', (data) => {
  responseData += data.toString();
  
  // Look for a complete JSON response
  const lines = responseData.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
      try {
        const response = JSON.parse(line);
        if (response.id === 1) {
          console.log('✅ Response received successfully!');
          console.log('📊 Analysis results:');
          
          if (response.result && response.result.content && response.result.content[0]) {
            const resultText = response.result.content[0].text;
            
            // Extract key information from the response
            const overallScoreMatch = resultText.match(/Overall Compliance Score:\*\* (\d+)\/100/);
            const biasIssuesMatch = resultText.match(/(\d+) issues found/);
            const processingTimeMatch = resultText.match(/Processing Time:\*\* (\d+)ms/);
            
            if (overallScoreMatch) {
              console.log(`  🎯 Compliance Score: ${overallScoreMatch[1]}/100`);
            }
            
            if (biasIssuesMatch) {
              console.log(`  ⚠️  Bias Issues Found: ${biasIssuesMatch[1]}`);
            }
            
            if (processingTimeMatch) {
              console.log(`  ⏱️  Processing Time: ${processingTimeMatch[1]}ms`);
            }
            
            // Check if the response contains expected bias types
            if (resultText.includes('gender_exclusive') || 
                resultText.includes('age_discriminatory') || 
                resultText.includes('accessibility_barrier')) {
              console.log('  ✅ Bias detection working correctly');
            }

            console.log('\n🎉 Test completed successfully!');
            console.log("------------------------")
            console.log(resultText)
            console.log("------------------------")
          } else if (response.error) {
            console.log('❌ Error in response:', response.error);
          }
          
          server.kill();
          process.exit(0);
        }
      } catch (e) {
        // Continue waiting for a valid response
      }
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('Server stderr:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code || 0);
});

// Send the request after a short delay to ensure server is ready
setTimeout(() => {
  console.log('📤 Sending bias analysis request...');
  server.stdin.write(JSON.stringify(request) + '\n');
}, 1000);

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout reached');
  server.kill();
  process.exit(1);
}, 30000);