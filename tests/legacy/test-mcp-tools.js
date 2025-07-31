#!/usr/bin/env node

/**
 * Manual Test Script for CulturalTruth MCP Tools
 * Tests the Qloo API integration with provided hackathon credentials
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set environment variables for the test
const API_KEY = 'your_api_key_here';
const API_URL = 'https://hackathon.api.qloo.com';

// Test cases to run
const testCases = [
    {
        name: "Basic Entity Search",
        tool: "qloo_entity_search",
        args: {
            query: "Marvel",
            limit: 5
        }
    },
    {
        name: "Movie Insights",
        tool: "qloo_basic_insights",
        args: {
            entity_type: "urn:entity:movie",
            limit: 3
        }
    },
    {
        name: "Demographic Insights",
        tool: "qloo_demographic_insights",
        args: {
            entity_type: "urn:entity:movie",
            age_group: "young_adult",
            limit: 3
        }
    },
    {
        name: "Trending Movies",
        tool: "qloo_trending_entities",
        args: {
            category: "movies"
        }
    },
    {
        name: "Content Bias Analysis",
        tool: "analyze_content_bias",
        args: {
            content: "Looking for young energetic developers who are digital natives to join our rockstar team. Must be able to lift 50 pounds and work in a fast-paced environment.",
            user_id: "test_user_123",
            include_demographics: true,
            include_audit: true
        }
    },
    {
        name: "System Status Check",
        tool: "get_system_status",
        args: {}
    }
];

async function runTest(testCase) {
    console.log(`\n🧪 Running Test: ${testCase.name}`);
    console.log("=" .repeat(50));
    
    return new Promise((resolve, reject) => {
        // Set environment for the child process
        const env = { 
            ...process.env, 
            QLOO_API_KEY: API_KEY,
            NODE_ENV: 'test'
        };

        // Create the MCP server process
        const mcpProcess = spawn('node', ['index.ts'], {
            cwd: __dirname,
            env: env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let responseReceived = false;

        // Handle stdout (MCP responses)
        mcpProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            
            // Look for JSON-RPC response
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.trim() && line.includes('"result"')) {
                    try {
                        const response = JSON.parse(line);
                        if (response.result && response.result.content) {
                            console.log("✅ MCP Response Received:");
                            console.log(response.result.content[0].text);
                            responseReceived = true;
                            mcpProcess.kill();
                            resolve({ success: true, response: response.result.content[0].text });
                            return;
                        }
                    } catch (e) {
                        // Not JSON, continue
                    }
                }
            }
        });

        // Handle stderr (logs and errors)
        mcpProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // Handle process events
        mcpProcess.on('error', (error) => {
            console.error("❌ Process Error:", error.message);
            reject({ success: false, error: error.message });
        });

        mcpProcess.on('close', (code) => {
            if (!responseReceived) {
                console.log("📋 Server Logs:");
                console.log(stderr);
                
                if (code !== 0) {
                    reject({ success: false, error: `Process exited with code ${code}`, stderr });
                } else {
                    reject({ success: false, error: "No response received", stderr });
                }
            }
        });

        // Send the MCP request after a short delay
        setTimeout(() => {
            const request = {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: testCase.tool,
                    arguments: testCase.args
                }
            };

            const requestLine = JSON.stringify(request) + '\n';
            console.log("📤 Sending MCP Request:");
            console.log(JSON.stringify(request, null, 2));
            
            mcpProcess.stdin.write(requestLine);
        }, 2000);

        // Timeout after 30 seconds
        setTimeout(() => {
            if (!responseReceived) {
                mcpProcess.kill();
                reject({ success: false, error: "Test timeout (30s)", stderr });
            }
        }, 30000);
    });
}

async function runAllTests() {
    console.log("🚀 Starting CulturalTruth MCP Tools Test Suite");
    console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
    console.log(`🌐 API URL: ${API_URL}`);
    
    const results = [];

    for (const testCase of testCases) {
        try {
            const result = await runTest(testCase);
            results.push({ ...testCase, ...result });
            console.log("✅ Test passed");
        } catch (error) {
            results.push({ ...testCase, success: false, error: error.error || error.message });
            console.log("❌ Test failed:", error.error || error.message);
            
            // Print stderr for debugging
            if (error.stderr) {
                console.log("📋 Error details:");
                console.log(error.stderr);
            }
        }
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(60));
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (passed < total) {
        console.log("\n🔍 Failed Tests:");
        results.filter(r => !r.success).forEach(result => {
            console.log(`• ${result.name}: ${result.error}`);
        });
    }

    // Print detailed results for successful tests
    console.log("\n📋 Successful Test Details:");
    results.filter(r => r.success).forEach(result => {
        console.log(`\n• ${result.name}:`);
        console.log(`  Tool: ${result.tool}`);
        console.log(`  Status: ✅ Success`);
    });

    if (passed === total) {
        console.log("\n🎉 All tests passed! The MCP server is working correctly with the Qloo API.");
    } else {
        console.log("\n⚠️ Some tests failed. Check the error details above.");
    }
}

// Run the tests
if (require.main === module) {
    runAllTests().catch(error => {
        console.error("💥 Test suite failed:", error);
        process.exit(1);
    });
}

module.exports = { runAllTests, runTest };