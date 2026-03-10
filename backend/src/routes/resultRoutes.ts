import { Response, Router } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { Result } from '../models/Result';
import { User } from '../models/User';
import { redisClient } from '../config/redis';

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

    // 1. Find user in MongoDB (assuming they were created on signup)
    // If not found, we auto-create them for this demo. 
    // In a real app, a dedicated /signup route handles this.
    let user = await User.findOne({ firebaseUid });
    if (!user) {
      user = await User.create({
        firebaseUid,
        email: req.user?.email || `user_${firebaseUid}@example.com`,
        displayName: `User_${firebaseUid.substring(0, 5)}`
      });
    }

    // 2. Save result
    const newResult = await Result.create({
      userId: user._id,
      wpm,
      accuracy,
      wordCount,
      timeTakenMs,
    });

    // 3. (Optional) Invalidate leaderboard cache in Redis 
    // redisClient.del('leaderboard_top_100');

    res.status(201).json(newResult);
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(500).json({ error: 'Server error saving result' });
  }
});

// @route   GET /api/results/me
// @desc    Gets the user's past 10 typing results
// @access  Private
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const firebaseUid = req.user?.uid;
        const user = await User.findOne({ firebaseUid });
        
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const stats = await Result.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching results' });
    }
});

export default router;
