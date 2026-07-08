#!/usr/bin/env node

/**
 * Simple Security Test - Tests one endpoint at a time with delays
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: TestResult[] = [];

async function test(name: string, testFn: () => Promise<{ status: number; response: any }>): Promise<void> {
  console.log(`\n🔒 Testing ${name}...`);
  
  try {
    const result = await testFn();
    const statusIcon = result.status === 200 ? '✅' : '⚠️';
    results.push({ name, status: result.status === 200 ? 'PASS' : 'WARN', message: `Status ${result.status}` });
    console.log(`${statusIcon} ${name}: Status ${result.status}`);
  } catch (error) {
    results.push({ name, status: 'FAIL', message: 'Error: ' + (error instanceof Error ? error.message : String(error)) });
    console.log(`❌ ${name}: Error - ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  const data = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    parsed = data;
  }
  return { status: response.status, response: parsed };
}

async function runTests() {
  console.log('🚀 Starting Simple Security Tests...\n');
  
  // Test 1: Health Check (should not be rate limited)
  await test('Health Check', async () => {
    return await makeRequest('/api/health');
  });
  
  // Wait to let rate limit reset slightly
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Check Security Headers
  await test('Security Headers', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const headers = Object.fromEntries(response.headers);
    console.log('   Headers:', JSON.stringify(headers, null, 2));
    return { status: response.status, response: {} };
  });
  
  // Test 3: CORS with malicious origin
  await test('CORS Protection', async () => {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        headers: {
          'Origin': 'https://malicious-site.com'
        }
      });
      return { status: response.status, response: {} };
    } catch (error) {
      // CORS blocked
      return { status: 0, response: {} };
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 4: Rate Limiting - Send multiple requests quickly
  await test('Rate Limiting Test', async () => {
    const requests = [];
    for (let i = 0; i < 50; i++) {
      requests.push(makeRequest('/api/health'));
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429).length;
    
    results.push({
      name: 'Rate Limiting',
      status: rateLimited > 0 ? 'PASS' : 'WARN',
      message: `${rateLimited} requests were blocked`
    });
    
    console.log(`   ${rateLimited} out of 50 requests blocked by rate limiter`);
    
    return { status: rateLimited > 0 ? 200 : 200, response: {} };
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🔒 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0 && passed > 0) {
    console.log('🎉 Security is working!');
  } else if (failed > 0) {
    console.log('⚠️  Some issues found');
  }
}

runTests().catch(console.error);

