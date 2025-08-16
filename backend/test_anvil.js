const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testAnvilSimulation() {
  console.log('🧪 Testing Anvil-based Simulation System\n');

  try {
    // Test 1: Health check
    // console.log('1. Testing health check...');
    // const healthResponse = await axios.get(`${BASE_URL}/api/v2/health`);
    // console.log('✅ Health check passed:', healthResponse.data);
    // console.log('');

    // // Test 2: Get stats
    // console.log('2. Getting Anvil stats...');
    // const statsResponse = await axios.get(`${BASE_URL}/api/v2/stats`);
    // console.log('✅ Stats retrieved:', statsResponse.data);
    // console.log('');

    // Test 3: Simple simulation
    console.log('3. Testing simple transaction simulation...');
//     const simulationRequest = {
//   "from": "0x778d3206374f8ac265728e18e3fe2ae6b93e4ce4",
//   "to": "0x28e0f09be2321c1420dc60ee146aacbd68b335fe",
//   "input": "0xf9bfe8a7cc74097f54a34482486e48747b9cb1b59d58a2dadd0e8bb713795ecf24eb542f",
//   "value": "0x259CC5924050",
//   "gas": "0x1E8480",
//   "gasPrice": "0x70ACE654C",
//   "generateAccessList": true,
//   "blockNumber": "latest"
// };

const simulationRequest = {
  "from": "0xE72b3dF298c2fb11e9C29D741A1B70C00b86A523",
  "to": "0x0a0758d937d1059c356D4714e57F5df0239bce1A",
  "input": "0x70a08231000000000000000000000000E72b3dF298c2fb11e9C29D741A1B70C00b86A523",
  "value": "0x0",
  "gas": "0x1E8480",
  "gasPrice": "0x70ACE654C",
  "generateAccessList": true,
  "blockNumber": "latest"
};

    const simulationResponse = await axios.post(
      `${BASE_URL}/api/v2/simulate`,
      simulationRequest,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log('✅ Simulation completed successfully!');
    console.log('📊 Response summary:');
    console.log(`   - Gas used: ${simulationResponse.data.transaction.gas_used || 'N/A'}`);
    console.log(`   - Status: ${simulationResponse.data.simulation?.status || 'N/A'}`);
    console.log(`   - Call trace depth: ${simulationResponse.data.transaction.callTrace?.length || 0}`);
    console.log('');

    // Test 4: Get updated stats
    console.log('4. Getting updated stats after simulation...');
    const updatedStatsResponse = await axios.get(`${BASE_URL}/api/v2/stats`);
    console.log('✅ Updated stats:', updatedStatsResponse.data);
    console.log('');

    console.log('🎉 All tests passed! Anvil-based simulation system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   npm run dev');
    }
    
    process.exit(1);
  }
}

// Run the test
testAnvilSimulation();
