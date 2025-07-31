/**
 * Demo script showing the differences between Hackathon and Production modes
 */

console.log('🎯 CulturalTruth Environment Configuration Demo\n');

// Test different content types to show bias detection differences
const testCases = [
    {
        name: "Subtle Gender Bias",
        content: "Looking for a rockstar developer to join our team of coding ninjas.",
        expectedDifference: "Production mode detects 'rockstar' and 'ninja' as gendered role bias, Hackathon mode may skip these."
    },
    {
        name: "Age Discrimination", 
        content: "Seeking young, fresh graduates with digital native skills.",
        expectedDifference: "Both modes detect this, but Production mode has lower tolerance thresholds."
    },
    {
        name: "Accessibility Barrier",
        content: "Must be able to lift 50 pounds and work in high-stress environment.",
        expectedDifference: "Both modes detect this as critical, but Production mode applies higher penalties."
    },
    {
        name: "Education Proxy",
        content: "Ivy League graduates preferred for this position.",
        expectedDifference: "Only Production mode detects education proxies as potential racial bias."
    }
];

console.log('📋 Test Cases for Environment Comparison:\n');
testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. **${testCase.name}**`);
    console.log(`   Content: "${testCase.content}"`);
    console.log(`   Expected: ${testCase.expectedDifference}\n`);
});

console.log('🔧 Configuration Differences:\n');

console.log('**HACKATHON MODE:**');
console.log('• API Endpoint: https://hackathon.api.qloo.com');
console.log('• Bias Detection: Lenient (focuses on critical issues)');
console.log('• Patterns Active: 4/8 patterns (age, location, accessibility, cultural names)');
console.log('• Compliance Thresholds: Critical < 20%, High < 40%, Medium < 60%');
console.log('• Regulatory Penalties: Reduced (EU AI Act: -15%, Section 508: -12%, GDPR: -18%)');
console.log('• Features: Limited (no demographic analysis, no geospatial)');
console.log('• Use Case: Demos, prototypes, hackathons\n');

console.log('**PRODUCTION MODE:**');
console.log('• API Endpoint: https://api.qloo.com');
console.log('• Bias Detection: Strict (all patterns active)');
console.log('• Patterns Active: 8/8 patterns (includes gendered roles, education proxies)');
console.log('• Compliance Thresholds: Critical < 10%, High < 25%, Medium < 50%');
console.log('• Regulatory Penalties: Full (EU AI Act: -25%, Section 508: -20%, GDPR: -30%)');
console.log('• Features: All enabled (demographic analysis, geospatial insights)');
console.log('• Use Case: Production deployments, enterprise compliance\n');

console.log('🎯 How to Switch Environments:\n');

console.log('**Method 1: Environment Variable**');
console.log('```bash');
console.log('# For Hackathon mode');
console.log('export CULTURAL_TRUTH_MODE=Hackathon');
console.log('export QLOO_API_KEY=your_hackathon_key');
console.log('');
console.log('# For Production mode');
console.log('export CULTURAL_TRUTH_MODE=Production');
console.log('export QLOO_API_KEY=your_production_key');
console.log('```\n');

console.log('**Method 2: MCP Tool Call**');
console.log('```json');
console.log(JSON.stringify({
    "name": "configure_environment",
    "arguments": {
        "mode": "Hackathon",
        "enableFullPotential": false
    }
}, null, 2));
console.log('```\n');

console.log('**Method 3: Custom Configuration**');
console.log('```json');
console.log(JSON.stringify({
    "name": "configure_environment", 
    "arguments": {
        "mode": "Production",
        "biasDetectionLevel": "moderate",
        "enabledFeatures": {
            "demographicAnalysis": true,
            "culturalTrends": true,
            "geospatialInsights": false,
            "batchProcessing": true,
            "realtimeSignals": false
        }
    }
}, null, 2));
console.log('```\n');

console.log('📊 Expected Bias Analysis Results:\n');

const mockResults = {
    hackathon: {
        testCase1: { issues: 0, score: 100, reason: "Gendered roles not detected in lenient mode" },
        testCase2: { issues: 2, score: 68, reason: "Age bias detected but with reduced penalties" },
        testCase3: { issues: 1, score: 65, reason: "Accessibility barrier detected as critical" },
        testCase4: { issues: 0, score: 100, reason: "Education proxies not active in lenient mode" }
    },
    production: {
        testCase1: { issues: 2, score: 45, reason: "Both 'rockstar' and 'ninja' detected as gendered bias" },
        testCase2: { issues: 2, score: 32, reason: "Age bias with full production penalties" },
        testCase3: { issues: 2, score: 15, reason: "Both accessibility barriers detected with high penalties" }, 
        testCase4: { issues: 1, score: 52, reason: "Education proxy detected as racial bias indicator" }
    }
};

console.log('**Hackathon Mode Results:**');
Object.entries(mockResults.hackathon).forEach(([test, result], index) => {
    console.log(`${index + 1}. ${result.issues} issues, ${result.score}/100 score - ${result.reason}`);
});

console.log('\n**Production Mode Results:**');
Object.entries(mockResults.production).forEach(([test, result], index) => {
    console.log(`${index + 1}. ${result.issues} issues, ${result.score}/100 score - ${result.reason}`);
});

console.log('\n✅ Key Benefits of Dynamic Configuration:');
console.log('• **Flexibility**: Same codebase works for both demo and production');
console.log('• **Appropriate Sensitivity**: Hackathon mode avoids false positives');
console.log('• **Full Compliance**: Production mode meets regulatory requirements');
console.log('• **Feature Control**: Enable/disable features based on use case');
console.log('• **API Adaptation**: Automatically uses correct endpoints');
console.log('• **Real-time Switching**: Change configuration without restart');

console.log('\n🚀 Ready to test! Use the MCP tools to switch between environments and see the differences in action.');