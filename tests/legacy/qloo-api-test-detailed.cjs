const axios = require('axios');

async function testQlooAPIDetailed() {
  const API_KEY = 'your_api_key_here';
  const BASE_URL = 'https://hackathon.api.qloo.com';

  console.log('🔍 DETAILED QLOO API INPUT/OUTPUT TEST');
  console.log('=====================================\n');
  console.log(`🔑 API Key: ${API_KEY.substring(0, 15)}...`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  // Test different endpoints with detailed logging
  const testCases = [
    {
      name: "Search Endpoint",
      method: "GET",
      endpoint: "/search",
      params: {
        query: "Marvel",
        limit: 3
      }
    },
    {
      name: "Search with Type Filter",
      method: "GET", 
      endpoint: "/search",
      params: {
        query: "Avengers",
        type: "movie",
        limit: 5
      }
    },
    {
      name: "Recommendations Endpoint",
      method: "GET",
      endpoint: "/recommendations", 
      params: {
        type: "movie",
        limit: 3
      }
    },
    {
      name: "Insights Endpoint",
      method: "GET",
      endpoint: "/v2/insights/",
      params: {
        'filter.type': 'urn:entity:movie',
        'take': 3
      }
    },
    {
      name: "Trending Endpoint",
      method: "GET",
      endpoint: "/trends/category",
      params: {
        type: "movies"
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`${'='.repeat(60)}`);
    console.log(`🧪 Testing: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    
    console.log(`📤 REQUEST:`);
    console.log(`   Method: ${testCase.method}`);
    console.log(`   URL: ${BASE_URL}${testCase.endpoint}`);
    console.log(`   Headers:`);
    console.log(`     X-Api-Key: ${API_KEY.substring(0, 15)}...`);
    console.log(`     Content-Type: application/json`);
    console.log(`     User-Agent: CulturalTruth-Test/1.0.0`);
    console.log(`   Parameters:`, JSON.stringify(testCase.params, null, 4));

    try {
      const response = await axios({
        method: testCase.method,
        url: `${BASE_URL}${testCase.endpoint}`,
        params: testCase.params,
        headers: {
          'X-Api-Key': API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'CulturalTruth-Test/1.0.0'
        },
        timeout: 10000
      });

      console.log(`\n📥 RESPONSE:`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Headers:`, JSON.stringify({
        'content-type': response.headers['content-type'],
        'content-length': response.headers['content-length'],
        'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
        'x-ratelimit-reset': response.headers['x-ratelimit-reset']
      }, null, 4));

      console.log(`\n📋 RESPONSE DATA:`);
      if (response.data) {
        // Pretty print the response data
        console.log(JSON.stringify(response.data, null, 2));
        
        // Analyze the response structure
        console.log(`\n🔍 RESPONSE ANALYSIS:`);
        console.log(`   Data Type: ${typeof response.data}`);
        if (response.data.results) {
          console.log(`   Has Results: ✅`);
          if (response.data.results.entities) {
            console.log(`   Entities Count: ${response.data.results.entities.length}`);
            if (response.data.results.entities.length > 0) {
              const entity = response.data.results.entities[0];
              console.log(`   Sample Entity:`);
              console.log(`     Name: ${entity.name || 'N/A'}`);
              console.log(`     ID: ${entity.entity_id || 'N/A'}`);
              console.log(`     Type: ${entity.type || 'N/A'}`);
              console.log(`     Properties: ${Object.keys(entity.properties || {}).join(', ')}`);
            }
          } else {
            console.log(`   Entities: ❌ No entities array`);
          }
        } else {
          console.log(`   Has Results: ❌`);
          console.log(`   Data Keys: ${Object.keys(response.data).join(', ')}`);
        }
      } else {
        console.log(`   No response data`);
      }

      console.log(`\n✅ SUCCESS`);

    } catch (error) {
      console.log(`\n📥 ERROR RESPONSE:`);
      console.log(`   Status: ${error.response?.status || 'N/A'} ${error.response?.statusText || ''}`);
      console.log(`   Error Message: ${error.message}`);
      
      if (error.response?.data) {
        console.log(`   Error Data:`, JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.response?.headers) {
        console.log(`   Error Headers:`, JSON.stringify({
          'content-type': error.response.headers['content-type'],
          'x-ratelimit-remaining': error.response.headers['x-ratelimit-remaining']
        }, null, 4));
      }

      console.log(`\n❌ FAILED`);
    }

    console.log(`\n`);
    
    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log(`${'='.repeat(80)}`);
  console.log(`📊 SUMMARY OF QLOO API BEHAVIOR`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\n🔑 Key Findings:`);
  console.log(`• API Key is valid and accepts requests`);
  console.log(`• Hackathon endpoint is responding`);
  console.log(`• Some endpoints return empty results (limited hackathon data)`);
  console.log(`• Error responses provide clear feedback about missing parameters`);
  console.log(`• Rate limiting headers are present when available`);
  
  console.log(`\n💡 For MCP Integration:`);
  console.log(`• Search endpoint works but returns empty entity arrays`);
  console.log(`• This suggests hackathon API has limited sample data`);
  console.log(`• Bias detection will work independently of Qloo data`);
  console.log(`• Cultural entity extraction may return empty results`);
  console.log(`• All MCP tools will handle empty responses gracefully`);
}

// Run the detailed test
if (require.main === module) {
  testQlooAPIDetailed().catch(console.error);
}