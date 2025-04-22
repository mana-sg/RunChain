import React, { useState, useEffect } from 'react';
import { ethers, formatUnits } from 'ethers';
import './App.css';
import RewardToken from './contracts/RewardToken.json';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import EarnRewards from './components/EarnRewards';
import RedeemRewards from './components/RedeemRewards';
import StepTracker from './components/StepTracker';

function App() {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('0');
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeComponent, setActiveComponent] = useState('dashboard');

  useEffect(() => {
    loadBlockchainData();
  }, []);

  const loadBlockchainData = async () => {
    try {
      // Check if MetaMask is installed
      if (window.ethereum) {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        // Get the provider and signer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Connect to the contract
        const networkId = await window.ethereum.request({ method: 'net_version' });
        const deployedNetwork = RewardToken.networks[networkId];

        if (deployedNetwork) {
          const tokenContract = new ethers.Contract(
            deployedNetwork.address,
            RewardToken.abi,
            signer
          );

          setContract(tokenContract);

          // Get the user's balance
          const userBalance = await tokenContract.balanceOf(accounts[0]);
          setBalance(formatUnits(userBalance, 18));
        } else {
          console.log("RewardToken contract not deployed to detected network.");
        }

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0]);
          loadBlockchainData();
        });

      } else {
        alert("Please install MetaMask to use this application");
      }
    } catch (error) {
      console.error("Error loading blockchain data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (contract && account) {
      const userBalance = await contract.balanceOf(account);
      setBalance(formatUnits(userBalance, 18));
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loading">Loading blockchain data...</div>;
    }

    switch (activeComponent) {
      case 'dashboard':
        return <Dashboard account={account} balance={balance} />;
      case 'redeem':
        return <RedeemRewards contract={contract} account={account} balance={balance} refreshBalance={refreshBalance} />;
      case 'steps':
        return <StepTracker contract={contract} account={account} refreshBalance={refreshBalance} />;
      default:
        return <Dashboard account={account} balance={balance} />;
    }
  };

  return (
    <div className="App">
      <Navbar
        account={account}
        setActiveComponent={setActiveComponent}
        activeComponent={activeComponent}
      />
      <div className="container mt-4">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
