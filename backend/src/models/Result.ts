import mongoose, { Document, Schema } from 'mongoose';

export interface IResult extends Document {
  userId: mongoose.Types.ObjectId;
  wpm: number;
  accuracy: number;
  wordCount: number;
  timeTakenMs: number;
  createdAt: Date;
}

const ResultSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wpm: {
    type: Number,
    required: true,
  },
  accuracy: {
    type: Number,
    required: true,
  },
  wordCount: {
    type: Number,
    required: true,
  },
  timeTakenMs: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Result = mongoose.model<IResult>('Result', ResultSchema);
