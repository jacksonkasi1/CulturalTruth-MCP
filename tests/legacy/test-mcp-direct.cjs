const { spawn } = require('child_process');

async function testMCPTools() {
    console.log('🧪 Testing CulturalTruth MCP Server...');
    
    // Set environment
    process.env.QLOO_API_KEY = 'your_api_key_here';
    
    // Test cases
    const testCases = [
        {
            name: "Content Bias Analysis",
            request: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "analyze_content_bias",
                    arguments: {
                        content: "Looking for young energetic developers who are digital natives to join our rockstar team. Must be able to lift 50 pounds and work in a fast-paced environment.",
                        user_id: "test_user_123",
                        include_demographics: false,
                        include_audit: true
                    }
                }
            }
        },
        {
            name: "System Status Check",
            request: {
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: {
                    name: "get_system_status",
                    arguments: {}
                }
            }
        },
        {
            name: "Qloo Entity Search",
            request: {
                jsonrpc: "2.0",
                id: 3,
                method: "tools/call",
                params: {
                    name: "qloo_entity_search",
                    arguments: {
                        query: "Marvel",
                        limit: 3
                    }
                }
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 Testing: ${testCase.name}`);
        console.log(`${'='.repeat(60)}`);

        try {
            const result = await runSingleTest(testCase);
            console.log('✅ Test Result:');
            console.log(result);
        } catch (error) {
            console.log('❌ Test Failed:');
            console.log(error.message);
        }
    }
}

function runSingleTest(testCase) {
    return new Promise((resolve, reject) => {
        // Start MCP server
        const mcpProcess = spawn('node', ['dist/index.js'], {
            cwd: __dirname,
            env: { ...process.env, QLOO_API_KEY: 'your_api_key_here' },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let hasResponse = false;

        // Handle stdout
        mcpProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            
            // Check for JSON response
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.trim() && (line.includes('"result"') || line.includes('"error"'))) {
                    try {
                        const response = JSON.parse(line);
                        if (response.result || response.error) {
                            hasResponse = true;
                            mcpProcess.kill();
                            
                            if (response.error) {
                                reject(new Error(`MCP Error: ${JSON.stringify(response.error, null, 2)}`));
                            } else {
                                resolve(response.result.content[0].text.substring(0, 500) + '...');
                            }
                            return;
                        }
                    } catch (e) {
                        // Not JSON, continue
                    }
                }
            }
        });

        // Handle stderr
        mcpProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // Handle close
        mcpProcess.on('close', (code) => {
            if (!hasResponse) {
                if (code !== 0) {
                    reject(new Error(`Process failed with code ${code}\nStderr: ${stderr}`));
                } else {
                    reject(new Error(`No response received\nStderr: ${stderr}`));
                }
            }
        });

        // Send request after server starts
        setTimeout(() => {
            const requestLine = JSON.stringify(testCase.request) + '\n';
            mcpProcess.stdin.write(requestLine);
        }, 2000);

        // Timeout
        setTimeout(() => {
            if (!hasResponse) {
                mcpProcess.kill();
                reject(new Error('Test timeout (15s)'));
            }
        }, 15000);
    });
}

// Run tests
if (require.main === module) {
    testMCPTools().catch(console.error);
}