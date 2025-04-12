import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/index.js'; // Adjust path as needed

const router = express.Router();

// Temporary in-memory challenge store - REPLACE FOR PRODUCTION
const challengeStore = new Map();
console.log('[loginChallenge] Initialized in-memory challengeStore.');

/**
 * POST /api/login-challenge
 * Body: { userId: string }
 */
router.post('/', async (req, res) => {
    console.log(`--- [loginChallenge] Received POST request for userId: ${req.body?.userId} ---`);
    const { userId } = req.body;

    if (!userId) {
        console.warn("[loginChallenge] Failed: Missing userId.");
        return res.status(400).json({ error: 'Missing userId in request body' });
    }

    try {
        // Step 1: Find User and Certificate
        console.log(`[loginChallenge] Checking user/cert for: ${userId}`);
        const user = await User.findOne({ where: { userId } });

        // Use correct model field name 'publicCertificate'
        if (!user || !user.publicCertificate) {
            console.warn(`[loginChallenge] User or certificate not found for: ${userId}`);
            return res.status(404).json({ error: 'User not found or certificate missing' });
        }
        console.log(`[loginChallenge] User/cert found for: ${userId}`);

        // Step 2: Generate Challenge
        const challenge = uuidv4();
        console.log(`[loginChallenge] Generated challenge for ${userId}: ${challenge.substring(0,8)}...`);

        // Step 3: Store Challenge & Set Expiry
        const challengeExpiryMs = 5 * 60 * 1000; // 5 minutes
        challengeStore.set(userId, challenge);
        console.log(`[loginChallenge] Stored challenge for ${userId}.`);

        setTimeout(() => {
            if (challengeStore.get(userId) === challenge) {
                challengeStore.delete(userId);
                console.log(`[loginChallenge Timeout] Expired challenge deleted for ${userId}.`);
            }
        }, challengeExpiryMs);

        // Step 4: Send Response
        console.log(`[loginChallenge] Sending challenge to client for ${userId}.`);
        res.status(200).json({ challenge });
        console.log(`--- [loginChallenge] Completed POST request for userId: ${userId} ---`);

    } catch (err) {
        console.error(`[loginChallenge] ERROR for userId "${userId}":`, err);
        res.status(500).json({ error: 'Internal server error generating challenge' });
        console.log(`--- [loginChallenge] Failed POST request for userId: ${userId} ---`);
    }
});

// Export the challenge store for use in /verify-login route
export { challengeStore };
export default router;