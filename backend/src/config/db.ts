import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/typeblitz', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Automatically purge any corrupt results (e.g. WPM > 300 from division-by-zero bug)
    try {
      const { Result } = await import('../models/Result');
      const purged = await Result.deleteMany({ wpm: { $gt: 300 } });
      if (purged.deletedCount > 0) {
        console.log(`Cleaned up ${purged.deletedCount} invalid result records with WPM > 300.`);
      }
    } catch {
      // ignore
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`MongoDB Connection Error: ${error.message}. Continuing without DB...`);
    }
  }
};
