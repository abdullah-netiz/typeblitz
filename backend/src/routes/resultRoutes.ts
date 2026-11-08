import { Response, Router } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { Result } from '../models/Result';
import { User } from '../models/User';

const router = Router();

// @route   POST /api/results
// @desc    Saves a typing test result
// @access  Private (Requires Auth Token)
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { wpm, accuracy, wordCount, timeTakenMs } = req.body;
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      res.status(401).json({ error: 'User UID missing' });
      return;
    }

    // Reject unrealistically high or invalid WPM values
    if (typeof wpm !== 'number' || wpm <= 0 || wpm > 300) {
      res.status(400).json({ error: 'Invalid WPM value. Must be between 1 and 300.' });
      return;
    }

    // 1. Find user in MongoDB and synchronize display name
    let user = await User.findOne({ firebaseUid });
    const tokenName = req.user?.name;

    if (!user) {
      user = await User.create({
        firebaseUid,
        email: req.user?.email || `user_${firebaseUid}@example.com`,
        displayName: tokenName || `User_${firebaseUid.substring(0, 5)}`,
      });
    } else if (tokenName && (user.displayName.startsWith('User_') || !user.displayName)) {
      user.displayName = tokenName;
      await user.save();
    }

    // 2. Save result
    const newResult = await Result.create({
      userId: user._id,
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy),
      wordCount: Math.round(wordCount),
      timeTakenMs: Math.round(timeTakenMs || 0),
    });

    res.status(201).json(newResult);
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(500).json({ error: 'Server error saving result' });
  }
});

// @route   PUT /api/results/profile
// @desc    Updates user's display name in MongoDB
// @access  Private
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const firebaseUid = req.user?.uid;
    const { displayName } = req.body;

    if (!firebaseUid) {
      res.status(401).json({ error: 'User UID missing' });
      return;
    }

    if (!displayName || typeof displayName !== 'string') {
      res.status(400).json({ error: 'Valid display name required' });
      return;
    }

    const trimmed = displayName.trim().substring(0, 30);
    let user = await User.findOne({ firebaseUid });
    if (!user) {
      user = await User.create({
        firebaseUid,
        email: req.user?.email || `user_${firebaseUid}@example.com`,
        displayName: trimmed,
      });
    } else {
      user.displayName = trimmed;
      await user.save();
    }

    res.status(200).json({ success: true, displayName: user.displayName });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

// @route   ALL /api/results/cleanup-invalid
// @desc    Purge corrupted test results where WPM > 300
// @access  Public
router.all('/cleanup-invalid', async (_req: any, res: Response): Promise<void> => {
  try {
    const deleteResult = await Result.deleteMany({ wpm: { $gt: 300 } });
    res.status(200).json({ success: true, deletedCount: deleteResult.deletedCount });
  } catch (error) {
    console.error('Error cleaning invalid results:', error);
    res.status(500).json({ error: 'Server error cleaning invalid results' });
  }
});

// @route   GET /api/results/leaderboard
// @desc    Gets top 20 users ranked by best WPM (capped at realistic human bounds)
// @access  Public
router.get('/leaderboard', async (_req: any, res: Response): Promise<void> => {
  try {
    // Aggregate: filter valid realistic tests, group by userId, get best WPM per user, join with User for displayName
    const leaderboard = await Result.aggregate([
      {
        $match: {
          wpm: { $gt: 0, $lte: 300 },
        },
      },
      {
        $group: {
          _id: '$userId',
          bestWpm: { $max: '$wpm' },
          bestAccuracy: { $max: '$accuracy' },
          totalTests: { $sum: 1 },
        },
      },
      { $sort: { bestWpm: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          displayName: '$user.displayName',
          bestWpm: { $round: ['$bestWpm', 0] },
          bestAccuracy: { $round: ['$bestAccuracy', 0] },
          totalTests: 1,
        },
      },
    ]);

    // Add rank
    const ranked = leaderboard.map((entry: any, idx: number) => ({
      rank: idx + 1,
      ...entry,
    }));

    res.status(200).json(ranked);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
});

// @route   GET /api/results/me
// @desc    Gets the user's past 10 valid typing results
// @access  Private
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const firebaseUid = req.user?.uid;
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const stats = await Result.find({ userId: user._id, wpm: { $gt: 0, $lte: 300 } })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching results' });
  }
});

export default router;
