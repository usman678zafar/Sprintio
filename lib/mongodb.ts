import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
const isProduction = process.env.NODE_ENV === "production";

if (!MONGODB_URI) {
  const message = "Please define the MONGODB_URI environment variable.";
  if (!isProduction) {
    console.warn(`${message} Falling back to local MongoDB in development.`);
  }
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    if (!MONGODB_URI && isProduction) {
      throw new Error("Missing MONGODB_URI in production environment.");
    }

    const uri = MONGODB_URI || "mongodb://127.0.0.1:27017/sprinto";

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
