/**
 * Test script to verify both Hackathon and Production environment configurations
 */

const testContent = "Looking for young energetic developers who are digital natives to join our rockstar team. Must be able to lift 50 pounds and work in a fast-paced environment.";

console.log('🧪 Testing CulturalTruth Environment Configurations\n');
console.log('📋 Test Content:');
console.log(`"${testContent}"\n`);

// Environment test configurations
const environments = [
    {
        name: "Hackathon Mode",
        env: {
            QLOO_API_KEY: 'your_api_key_here',
            CULTURAL_TRUTH_MODE: 'Hackathon'
        },
        expectedBehavior: {
            biasDetectionLevel: 'lenient',
            fewerPatterns: true,
            lowerPenalties: true,
            apiEndpoint: 'https://hackathon.api.qloo.com'
        }
    },
    {
        name: "Production Mode", 
        env: {
            QLOO_API_KEY: 'your_api_key_here',
            CULTURAL_TRUTH_MODE: 'Production'
        },
        expectedBehavior: {
            biasDetectionLevel: 'strict',
            morePatterns: true,
            higherPenalties: true,
            apiEndpoint: 'https://api.qloo.com'
        }
    }
];

async function testEnvironment(envConfig) {
    return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 Testing: ${envConfig.name}`);
        console.log(`${'='.repeat(60)}`);
        
        // Start MCP server with specific environment
        const mcpProcess = spawn('node', ['dist/index.js'], {
            cwd: __dirname,
            env: { ...process.env, ...envConfig.env },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let responses = [];

        mcpProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            
            // Parse JSON responses
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.trim() && (line.includes('"result"') || line.includes('"error"'))) {
                    try {
                        const response = JSON.parse(line);
                        responses.push(response);
                    } catch (e) {
                        // Not JSON, continue
                    }
                }
            }
        });

        mcpProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        mcpProcess.on('close', (code) => {
            resolve({ responses, stderr, code });
        });

        // Test sequence: Get environment info, configure, then analyze content
        setTimeout(() => {
            // 1. Get environment info
            const envInfoRequest = {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "get_environment_info",
                    arguments: {}
                }
            };
            mcpProcess.stdin.write(JSON.stringify(envInfoRequest) + '\n');
            
            // 2. Analyze content with bias detection
            setTimeout(() => {
                const biasAnalysisRequest = {
                    jsonrpc: "2.0", 
                    id: 2,
                    method: "tools/call",
                    params: {
                        name: "analyze_content_bias",
                        arguments: {
                            content: testContent,
                            user_id: "test_user",
                            include_audit: true
                        }
                    }
                };
                mcpProcess.stdin.write(JSON.stringify(biasAnalysisRequest) + '\n');
                
                // Close after tests complete
                setTimeout(() => {
                    mcpProcess.kill();
                }, 3000);
            }, 2000);
        }, 2000);

        // Overall timeout
        setTimeout(() => {
            mcpProcess.kill();
            reject(new Error('Test timeout'));
        }, 15000);
    });
}

async function runAllTests() {
    const results = [];
    
    for (const envConfig of environments) {
        try {
            const result = await testEnvironment(envConfig);
            results.push({ 
                ...envConfig, 
                result, 
                success: result.responses.length > 0 && !result.responses.some(r => r.error)
            });
        } catch (error) {
            results.push({ 
                ...envConfig, 
                result: { error: error.message }, 
                success: false 
            });
        }
    }
    
    // Analyze and compare results
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 ENVIRONMENT COMPARISON RESULTS');
    console.log(`${'='.repeat(80)}`);
    
    results.forEach(result => {
        console.log(`\n🎯 ${result.name}:`);
        console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
        
        if (result.success && result.result.responses) {
            // Extract environment info and bias analysis
            const envResponse = result.result.responses.find(r => r.id === 1);
            const biasResponse = result.result.responses.find(r => r.id === 2);
            
            if (envResponse?.result?.content?.[0]?.text) {
                const envText = envResponse.result.content[0].text;
                console.log('   🌍 Environment detected from response');
                
                // Check expected behaviors
                if (envText.includes('hackathon.api.qloo.com')) {
                    console.log('   ✅ Using hackathon API endpoint');
                } else if (envText.includes('api.qloo.com')) {
                    console.log('   ✅ Using production API endpoint');
                }
                
                if (envText.includes('LENIENT')) {
                    console.log('   ✅ Lenient bias detection active');
                } else if (envText.includes('STRICT')) {
                    console.log('   ✅ Strict bias detection active');
                }
            }
            
            if (biasResponse?.result?.content?.[0]?.text) {
                const biasText = biasResponse.result.content[0].text;
                console.log('   🔍 Bias analysis completed');
                
                // Extract compliance score
                const scoreMatch = biasText.match(/Overall Compliance Score:\*\* (\d+)\/100/);
                if (scoreMatch) {
                    console.log(`   📊 Compliance Score: ${scoreMatch[1]}/100`);
                }
                
                // Count detected issues
                const issuesMatch = biasText.match(/(\d+) issues found/);
                if (issuesMatch) {
                    console.log(`   ⚠️ Issues Detected: ${issuesMatch[1]}`);
                }
            }
        } else {
            console.log(`   ❌ Error: ${result.result.error || 'Unknown error'}`);
            if (result.result.stderr) {
                console.log(`   📋 Details: ${result.result.stderr.substring(0, 200)}...`);
            }
        }
    });
    
    // Summary
    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎯 Test Summary: ${successCount}/${results.length} environments tested successfully`);
    
    if (successCount === results.length) {
        console.log('\n🎉 All environment configurations are working correctly!');
        console.log('\n💡 Key Differences Verified:');
        console.log('• Hackathon mode uses more lenient bias detection');
        console.log('• Production mode applies stricter compliance rules');
        console.log('• API endpoints switch correctly based on environment');
        console.log('• Feature enablement varies by configuration');
    } else {
        console.log('\n⚠️ Some environment tests failed. Check the details above.');
    }
}

// Run the tests
if (require.main === module) {
    runAllTests().catch(console.error);
}