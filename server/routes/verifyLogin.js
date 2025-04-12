// verifyLogin.js - RESTORED SECURE CHALLENGE LOGIC (using jsrsasign)

import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js'; // Adjust path
import { challengeStore } from './loginChallenge.js'; // <<< RE-IMPORT challengeStore
import { KJUR, KEYUTIL, X509 } from 'jsrsasign'; // Using jsrsasign for verification

const router = express.Router();
// --- Config ---
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-jwt-secret-key-CHANGE-ME'; // ** USE ENV VARIABLE! **
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
// --- End Config ---

router.post('/', async (req, res) => {
    console.log(`\n--- [verifyLogin] Received POST request for userId: ${req.body?.userId} ---`); // Log entry
    const logPayload = { /* ... safe logging payload ... */ }; // Keep safe logging if desired
    console.log("[verifyLogin] Request Body (Sig Snippet):", logPayload);

    const { userId, challenge, signature } = req.body; // signature is Base64 from client

    if (!userId || !challenge || !signature) {
        console.warn("[verifyLogin] Failed: Missing fields.");
        return res.status(400).json({ error: 'Missing userId, challenge, or signature' });
    }
    console.log(`[verifyLogin] Processing verification for userId: "${userId}"`);

    let user;
    let expectedChallenge;
    try {
        // --- Step 1: Retrieve Expected Challenge ---
        console.log(`[verifyLogin Step 1] Retrieving expected challenge for "${userId}"...`);
        expectedChallenge = challengeStore.get(userId); // <<< GET EXPECTED CHALLENGE

        // ** CRITICAL: Delete challenge immediately after retrieving it for single-use **
        const deleted = challengeStore.delete(userId);
        console.log(`[verifyLogin Step 1] Challenge store entry deleted: ${deleted}`);

        if (!expectedChallenge) {
            console.warn(`[verifyLogin Step 1] No challenge found in store (or expired/already used) for "${userId}".`);
            return res.status(401).json({ error: 'Login challenge expired or invalid. Please try again.' });
        }
        console.log(`[verifyLogin Step 1] Expected challenge retrieved: "${expectedChallenge}"`);

        // --- Step 2: Compare Challenges ---
        console.log(`[verifyLogin Step 2] Comparing challenges for "${userId}"...`);
        console.log(`[verifyLogin Step 2]   Received: "${challenge}"`);
        console.log(`[verifyLogin Step 2]   Expected: "${expectedChallenge}"`);
        if (challenge !== expectedChallenge) {
            console.warn(`[verifyLogin Step 2] CHALLENGE MISMATCH for user: "${userId}".`);
            // Challenge already deleted above
            return res.status(401).json({ error: 'Invalid challenge submitted.' });
        }
        console.log(`[verifyLogin Step 2] Challenges match for "${userId}".`);

        // --- Step 3: Retrieve User and Certificate ---
        console.log(`[verifyLogin Step 3] Querying DB for user "${userId}"...`);
        user = await User.findOne({ where: { userId } });
        if (!user || !user.publicCertificate) {
            console.warn(`[verifyLogin Step 3] User or cert missing for "${userId}".`);
            return res.status(404).json({ error: 'User not found or certificate missing.' });
        }
        console.log(`[verifyLogin Step 3] User and cert found for "${userId}".`);
        const publicKeyPem = user.publicCertificate;

        // --- Step 4: Prepare for Verification ---
        console.log("[verifyLogin Step 4] Preparing data for jsrsasign verification...");
        let signatureHex;
        try {
            signatureHex = Buffer.from(signature, 'base64').toString('hex');
             console.log(`[verifyLogin Step 4] Decoded/Converted signature. Hex snippet: ${signatureHex.substring(0, 20)}...`);
        } catch (e) {
             console.error(`[verifyLogin Step 4] Failed to decode/convert signature:`, e);
             return res.status(400).json({ error: 'Invalid signature format received.' });
        }
        console.log("[verifyLogin Step 4] Exact challenge string being verified:", JSON.stringify(challenge));
        console.log("[verifyLogin Step 4] Challenge buffer (hex):", Buffer.from(challenge, 'utf8').toString('hex')); // Log hex


        // --- Step 5: Verify Signature using jsrsasign ---
        console.log(`[verifyLogin Step 5] Verifying signature with jsrsasign...`);
        let isVerified = false;
        let verifyErrorMessage = "Verification failed internally.";
        try {
             const certObj = new X509();
             certObj.readCertPEM(publicKeyPem);
             const pubKey = certObj.getPublicKey();
             const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
             sig.init(pubKey);
             sig.updateString(challenge); // Use the received challenge
             isVerified = sig.verify(signatureHex); // Verify HEX signature
             console.log(`[verifyLogin Step 5] jsrsasign sig.verify() returned: ${isVerified}`);
        } catch (verifyError) {
             console.error(`[verifyLogin Step 5] Verification CRASHED:`, verifyError);
             verifyErrorMessage = `Verification library error: ${verifyError.message}`;
        }

        // --- Step 6: Invalidate Challenge (Done in Step 1) ---
        console.log(`[verifyLogin Step 6] Challenge already invalidated.`);

        // --- Step 7: Handle Verification Result ---
        if (isVerified) {
            console.log(`[verifyLogin Step 7a] Verification successful for "${userId}".`);
            // --- Step 8: Generate JWT ---
             console.log("[verifyLogin Step 8] Generating JWT...");
             const payload = { userId: user.userId };
             const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
             console.log(`[verifyLogin Step 8] JWT generated.`);
             res.status(200).json({ token: token });
        } else {
             console.warn(`[verifyLogin Step 7b] Verification FAILED for "${userId}".`);
             res.status(401).json({ error: 'Invalid signature.' });
        }
        console.log(`--- [verifyLogin] Completed POST request for userId "${userId}" (Success: ${isVerified}) ---`);

    } catch (err) {
        console.error(`[verifyLogin] UNEXPECTED OUTER ERROR for userId "${userId || 'UNKNOWN'}":`, err);
        // Attempt to delete challenge even if outer error occurred, if possible
        if (userId && challengeStore.has(userId)) {
            challengeStore.delete(userId);
            console.warn(`[verifyLogin] Deleted challenge for "${userId}" due to outer error.`);
        }
        res.status(500).json({ error: 'Internal server error during verification process' });
        console.log(`--- [verifyLogin] Failed POST request for userId "${userId || 'UNKNOWN'}" (Outer Error) ---`);
    }
});

export default router;