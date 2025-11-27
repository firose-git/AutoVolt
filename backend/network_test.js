const http = require('http');
const os = require('os');

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }

  return ips;
}

async function testEndpoint(hostname, port, path) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname,
      port,
      path,
      method: 'GET',
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data, hostname });
      });
    });

    req.on('error', (err) => {
      resolve({ error: err.message, hostname });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'timeout', hostname });
    });

    req.end();
  });
}

async function testServerAccessibility() {
  console.log('Testing server accessibility...\n');

  // Test localhost
  console.log('Testing localhost:3001...');
  const localhostResult = await testEndpoint('localhost', 3001, '/api/health');
  console.log('Result:', localhostResult);

  // Test 127.0.0.1
  console.log('\nTesting 127.0.0.1:3001...');
  const localIPResult = await testEndpoint('127.0.0.1', 3001, '/api/health');
  console.log('Result:', localIPResult);

  // Test 0.0.0.0
  console.log('\nTesting 0.0.0.0:3001...');
  const zeroIPResult = await testEndpoint('0.0.0.0', 3001, '/api/health');
  console.log('Result:', zeroIPResult);

  // Test local network IPs
  const localIPs = getLocalIPs();
  console.log('\nLocal network IPs found:', localIPs);

  for (const ip of localIPs) {
    console.log(`\nTesting ${ip}:3001...`);
    const networkResult = await testEndpoint(ip, 3001, '/api/health');
    console.log('Result:', networkResult);
  }

  console.log('\nServer accessibility test complete.');
}

testServerAccessibility();