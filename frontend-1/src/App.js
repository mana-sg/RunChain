import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import RunChainRewardsJSON from './contracts/RunChainRewards.json';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import RedeemRewards from './components/RedeemRewards';
import StepTracker from './components/StepTracker';

function App() {
  const [account, setAccount] = useState('');
  const [etherBalance, setEtherBalance] = useState('0');
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeComponent, setActiveComponent] = useState('dashboard');
  const [contractAddress, setContractAddress] = useState(null);

  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        alert("Please install MetaMask to use this application");
        setLoading(false);
        return;
      }

      setLoading(true);

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);

      // Get the provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get user's ETH balance
      const ethBalance = await provider.getBalance(accounts[0]);
      setEtherBalance(ethers.formatEther(ethBalance));

      // Connect to the contract
      const networkId = await window.ethereum.request({ method: 'net_version' });
      const deployedNetwork = RunChainRewardsJSON.networks[networkId];

      if (deployedNetwork) {
        const rewardsContract = new ethers.Contract(
          deployedNetwork.address,
          RunChainRewardsJSON.abi,
          signer
        );

        setContract(rewardsContract);
        setContractAddress(deployedNetwork.address);
        console.log("Connected to contract at:", deployedNetwork.address);
      } else {
        console.error("RunChainRewards contract not deployed to detected network");
      }

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || '');
        connectWallet();
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (window.ethereum && account) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(account);
        setEtherBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error("Error refreshing balance:", error);
      }
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loading">Loading blockchain data...</div>;
    }

    switch (activeComponent) {
      case 'dashboard':
        return <Dashboard
          account={account}
          balance={etherBalance}
          contractAddress={contractAddress}
        />;
      case 'redeem':
        return <RedeemRewards
          contract={contract}
          account={account}
          refreshBalance={refreshBalance}
        />;
      case 'steps':
        return <StepTracker
          account={account}
        />;
      default:
        return <Dashboard
          account={account}
          balance={etherBalance}
          contractAddress={contractAddress}
        />;
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
        {!account && !loading ? (
          <div className="alert alert-warning">
            <strong>Not connected!</strong> Please connect your MetaMask wallet to use this application.
            <button className="btn btn-primary ms-3" onClick={connectWallet}>Connect Wallet</button>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
}

export default App;