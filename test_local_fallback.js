const connectDB = require('./config/db');
const Owner = require('./models/Owner');

async function run() {
  try {
    await connectDB();
    // wait a moment for the connection to establish
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Querying Owner by local ID "gdint0fha"...');
    const owner = await Owner.findById('gdint0fha');
    console.log('Result:', owner);
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    process.exit(0);
  }
}

run();
