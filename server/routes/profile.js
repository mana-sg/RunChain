import express from 'express';
import { User } from '../models/index.js'; // Adjust path as needed

const router = express.Router();

/**
 * GET /api/user/profile
 * Protected Route: Requires valid JWT authentication.
 * Returns details for the currently authenticated user.
 */
router.get('/profile', async (req, res) => {
    // The authenticateToken middleware should have run before this handler,
    // verifying the JWT and attaching the payload to req.user.
    const authenticatedUserId = req.user?.userId; // Get userId from the decoded JWT payload

    console.log(`[ProfileRoute] Received request for profile from authenticated userId: ${authenticatedUserId}`); // DEBUG

    if (!authenticatedUserId) {
        // This generally shouldn't happen if middleware is working, but good defense.
        console.error('[ProfileRoute] Error: req.user.userId missing after auth middleware.');
        return res.status(401).json({ error: 'Authentication data missing.' });
    }

    try {
        console.log(`[ProfileRoute] Fetching user details from DB for userId: ${authenticatedUserId}`); // DEBUG
        const user = await User.findOne({
            where: { userId: authenticatedUserId },
            // Select only the fields you want to return to the frontend
            // Exclude sensitive data like hashed passwords if they existed
            attributes: ['userId', 'firstName', 'lastName', 'email', 'publicCertificate', 'createdAt', 'updatedAt'] // Adjust fields as needed
        });

        if (!user) {
            console.warn(`[ProfileRoute] User data not found in DB for authenticated userId: ${authenticatedUserId}`); // DEBUG
            // User authenticated via token, but no matching DB record? This is unusual.
            return res.status(404).json({ error: 'User profile data not found.' });
        }

        console.log(`[ProfileRoute] Successfully retrieved profile for userId: ${authenticatedUserId}`); // DEBUG
        // Return the selected user details
        res.status(200).json(user); // Send user object (or specific fields)

    } catch (error) {
        console.error(`[ProfileRoute] Error fetching profile for userId ${authenticatedUserId}:`, error);
        res.status(500).json({ error: 'Failed to retrieve user profile.' });
    }
});

// Add other user-related protected routes here if needed (e.g., update profile)

export default router;