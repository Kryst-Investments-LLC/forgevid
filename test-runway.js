const fetch = require('node-fetch'); // If using Node 18+, you can use global fetch

async function testRunway() {
  const response = await fetch('http://localhost:3000/api/ai/runway', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'A futuristic cityscape at sunset' }),
  });

  const data = await response.json();
  console.log('Runway API response:', data);
}

testRunway();