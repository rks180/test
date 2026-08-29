'use strict';

const mongoose = require('mongoose');

// One connection per process; worker threads open their own (handled in the worker file).
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set in .env');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  console.log(`[db] connected -> ${mongoose.connection.name}`);
  return mongoose.connection;
}

module.exports = { connectDB };
