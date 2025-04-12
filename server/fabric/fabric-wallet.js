import { FileSystemWallet, Gateway } from 'fabric-network';
import path from 'path';

const walletPath = path.join(process.cwd(), 'wallet'); // Path where the wallet will be stored
const wallet = new FileSystemWallet(walletPath);

export const getAdminIdentity = async () => {
  const userExists = await wallet.exists('admin');
  if (!userExists) {
    throw new Error('Admin identity does not exist in the wallet');
  }
  const adminIdentity = await wallet.get('admin');
  return adminIdentity;
};

export const createWallet = async () => {
  // Setup logic if the wallet doesn't exist
  if (!wallet.exists) {
    console.log('Wallet does not exist. Creating one...');
    await wallet.put('admin', adminIdentity); // Example of adding the admin identity
  }
};
