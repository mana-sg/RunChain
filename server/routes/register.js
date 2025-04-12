import express from 'express';
import FabricCAServices from 'fabric-ca-client';
import { Wallets } from 'fabric-network';
import path from 'path';
import fs from 'fs';
import { sequelize } from '../models/index.js'; // Import sequelize instance
import { User } from '../models/index.js';

const router = express.Router();

// --- Existing Setup ---
const ccpPath = path.resolve('fabric', 'connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
const ca = new FabricCAServices(caInfo.url);
const walletPath = path.join(process.cwd(), 'wallet');
let wallet;
const getWallet = async () => {
    if (!wallet) wallet = await Wallets.newFileSystemWallet(walletPath);
    return wallet;
};
// --- End Setup ---

// Helper function to normalize PEM strings (use only \n, remove \r)
const normalizePemString = (pemString) => {
    if (!pemString || typeof pemString !== 'string') {
        return pemString; // Return as is if not a valid string
    }
    // Replace Windows-style \r\n with Unix-style \n
    // Then remove any remaining standalone \r characters
    return pemString.replace(/\r\n/g, '\n').replace(/\r/g, '');
};


router.post('/', async (req, res) => {
    const { userId, firstName, lastName, email } = req.body;

    if (!userId || !firstName || !lastName || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const transaction = await sequelize.transaction();

    try {
        const wallet = await getWallet();

        // // Note: Checking for end-user ID in server wallet is unusual.
        // // Consider removing this block if not specifically needed.
        // const userExistsInWallet = await wallet.get(userId);
        // if (userExistsInWallet) {
        //   await transaction.rollback();
        //   return res.status(400).json({ error: 'User already exists in wallet (unusual check)' });
        // }

        const dbUser = await User.findOne({ where: { userId } }, { transaction });
        if (dbUser) {
            await transaction.rollback();
            return res.status(400).json({ error: 'User already exists in database' });
        }

        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            await transaction.rollback();
            return res.status(500).json({ error: 'Admin identity not found in wallet' });
        }

        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: userId,
            role: 'client',
            attrs: [
             { name: 'firstName', value: firstName, ecert: true },
             { name: 'lastName', value: lastName, ecert: true },
             { name: 'email', value: email, ecert: true }
            ]
        }, adminUser);

        const enrollment = await ca.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret
        });

        // --- NORMALIZE PEM STRINGS ---
        const certificate = normalizePemString(enrollment.certificate);
        const privateKey = normalizePemString(enrollment.key.toBytes());
        // --- END NORMALIZATION ---

        // Verify that normalization produced non-empty strings (basic check)
        if (!certificate || !privateKey) {
             throw new Error('Failed to retrieve or normalize enrollment credentials.');
        }

        // Store user in MySQL database using NORMALIZED certificate
        await User.create({
            userId,
            firstName,
            lastName,
            email,
            publicCertificate: certificate, // Store normalized version
            // registrationDate and lastActivity are not in your provided User model
            // registrationDate: new Date(),
            // lastActivity: new Date()
        }, { transaction });

        // Commit the transaction
        await transaction.commit();

        console.log(`User ${userId} registered and certificate stored.`); // Added log

        // Return the NORMALIZED user certificate and private key in response
        return res.status(201).json({
            success: true,
            userId,
            firstName,
            lastName,
            email,
            certificate: certificate, // Send normalized certificate
            privateKey: privateKey    // Send normalized private key
        });

    } catch (error) {
        if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
            await transaction.rollback(); // Ensure rollback on any error
        }

        console.error(`Registration error for ${userId}:`, error);

        if (error.message.includes('is already registered')) {
            return res.status(400).json({ error: 'User ID already exists in blockchain network' });
        }
        // Add check for enrollment failure
        if (error.message.includes('Enrollment failed')) {
             return res.status(401).json({ error: 'Enrollment failed, likely incorrect secret or ID.' });
        }

        return res.status(500).json({
            error: 'Failed to register user',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;