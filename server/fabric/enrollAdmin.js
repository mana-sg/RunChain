import FabricCAServices from 'fabric-ca-client';
import { Wallets } from 'fabric-network';
import path from 'path';
import fs from 'fs';

// Path to your connection profile
const ccpPath = path.resolve('fabric', 'connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

// Create Fabric CA client
const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
const ca = new FabricCAServices(caInfo.url);

// Wallet directory
const walletPath = path.join(process.cwd(), 'wallet');

const enrollAdmin = async () => {
  try {
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if admin is already enrolled
    const identity = await wallet.get('admin');
    if (identity) {
      console.log('✅ Admin identity already exists in the wallet');
      return;
    }

    // Enroll the admin
    const enrollment = await ca.enroll({
      enrollmentID: 'admin',
      enrollmentSecret: 'adminpw', // This must match your CA's bootstrap identity
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP', // This must match the org MSP in your config
      type: 'X.509',
    };

    await wallet.put('admin', x509Identity);
    console.log('✅ Successfully enrolled admin and stored in the wallet');

  } catch (error) {
    console.error('❌ Failed to enroll admin:', error);
    process.exit(1);
  }
};

enrollAdmin();
