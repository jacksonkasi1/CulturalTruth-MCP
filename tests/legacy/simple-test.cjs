const axios = require('axios');

async function testQlooAPI() {
  const API_KEY = process.env.QLOO_API_KEY || 'your_api_key_here';
  const BASE_URL = 'https://hackathon.api.qloo.com';

  console.log('🧪 Testing Qloo Hackathon API...');
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`🌐 Base URL: ${BASE_URL}`);

  try {
    // Test basic search endpoint
    console.log('\n📍 Testing Search Endpoint...');
    const searchResponse = await axios.get(`${BASE_URL}/search`, {
      params: {
        query: 'Marvel',
        limit: 3
      },
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'CulturalTruth-Test/1.0.0'
      },
      timeout: 10000
    });

    console.log('✅ Search API Response:', {
      status: searchResponse.status,
      statusText: searchResponse.statusText,
      dataKeys: Object.keys(searchResponse.data),
      hasResults: !!searchResponse.data.results,
      entityCount: searchResponse.data.results?.entities?.length || 0
    });

    if (searchResponse.data.results?.entities?.length > 0) {
      console.log('\n📋 Sample Entities:');
      searchResponse.data.results.entities.slice(0, 3).forEach((entity, index) => {
        console.log(`${index + 1}. ${entity.name} (${entity.type})`);
        console.log(`   ID: ${entity.entity_id}`);
      });
    }

  } catch (error) {
    console.error('❌ Search API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }

  try {
    // Test recommendations endpoint (more commonly used)
    console.log('\n📍 Testing Recommendations Endpoint...');
    const insightsResponse = await axios.get(`${BASE_URL}/recommendations`, {
      params: {
        'type': 'movie',
        'entity_id': 'urn:entity:movie:1',
        'limit': 3
      },
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'CulturalTruth-Test/1.0.0'
      },
      timeout: 10000
    });

    console.log('✅ Insights API Response:', {
      status: insightsResponse.status,
      statusText: insightsResponse.statusText,
      dataKeys: Object.keys(insightsResponse.data),
      hasResults: !!insightsResponse.data.results,
      entityCount: insightsResponse.data.results?.entities?.length || 0
    });

    if (insightsResponse.data.results?.entities?.length > 0) {
      console.log('\n📋 Movie Insights:');
      insightsResponse.data.results.entities.slice(0, 3).forEach((entity, index) => {
        console.log(`${index + 1}. ${entity.name}`);
        if (entity.properties?.release_year) {
          console.log(`   Year: ${entity.properties.release_year}`);
        }
        if (entity.properties?.popularity) {
          console.log(`   Popularity: ${(entity.properties.popularity * 100).toFixed(1)}th percentile`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Insights API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: JSON.stringify(error.response?.data, null, 2)
    });
  }

  console.log('\n✅ API Test Complete');
}

testQlooAPI().catch(console.error);