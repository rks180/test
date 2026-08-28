const mongoose = require('mongoose');

// Ek hi connection poore process me reuse hota hai. Worker threads apna alag
// connection banate hain (unka apna process-space hota hai) -- wo worker file me handle hai.
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI .env me set nahi hai');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  console.log(`[db] connected -> ${mongoose.connection.name}`);
  return mongoose.connection;
}

module.exports = { connectDB };
