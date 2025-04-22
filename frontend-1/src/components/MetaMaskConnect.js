import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const MetaMaskConnect = ({ onConnect, buttonText = "Connect Wallet" }) => {
    const [account, setAccount] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState('');
    const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

    useEffect(() => {
        const checkMetaMask = async () => {
            // Check if MetaMask is installed
            const isInstalled = typeof window.ethereum !== 'undefined';
            setIsMetaMaskInstalled(isInstalled);

            if (isInstalled) {
                // Check if already connected
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const accounts = await provider.listAccounts();

                    if (accounts.length > 0) {
                        setAccount(accounts[0].address);
                        // Notify parent component about connection
                        if (onConnect) onConnect(accounts[0].address);
                    }

                    // Listen for account changes
                    window.ethereum.on('accountsChanged', (newAccounts) => {
                        if (newAccounts.length === 0) {
                            setAccount('');
                        } else {
                            setAccount(newAccounts[0]);
                            if (onConnect) onConnect(newAccounts[0]);
                        }
                    });
                } catch (err) {
                    console.error("Error checking initial MetaMask state:", err);
                }
            }
        };

        checkMetaMask();

        // Cleanup event listener
        return () => {
            if (window.ethereum) {
                window.ethereum.removeAllListeners('accountsChanged');
            }
        };
    }, [onConnect]);

    const connectWallet = async () => {
        setError('');
        setIsConnecting(true);

        try {
            if (!window.ethereum) {
                throw new Error('MetaMask is not installed');
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send('eth_requestAccounts', []);

            setAccount(accounts[0]);
            if (onConnect) onConnect(accounts[0]);
        } catch (err) {
            console.error('Error connecting wallet:', err);
            setError(err.message || 'Failed to connect wallet');
        } finally {
            setIsConnecting(false);
        }
    };

    if (!isMetaMaskInstalled) {
        return (
            <div className="metamask-container">
                <p>MetaMask is not installed. Please install MetaMask to continue.</p>
                <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="metamask-install-link"
                >
                    Install MetaMask
                </a>
            </div>
        );
    }

    return (
        <div className="metamask-container">
            {!account ? (
                <>
                    <button
                        onClick={connectWallet}
                        disabled={isConnecting}
                        className="connect-button"
                    >
                        {isConnecting ? 'Connecting...' : buttonText}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </>
            ) : (
                <div className="account-info">
                    <p>Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
                </div>
            )}
        </div>
    );
};

export default MetaMaskConnect;