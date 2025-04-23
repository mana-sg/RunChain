import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function RedeemRewards({ contract, account, refreshBalance }) {
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [totalPointsRedeemed, setTotalPointsRedeemed] = useState(0);
  const [lastRedemptionTime, setLastRedemptionTime] = useState(null);
  const [contractBalance, setContractBalance] = useState('0');

  // Define the available rewards
  const rewardTiers = [
    { id: 1, points: 50, ethAmount: "0.001", description: "Basic Reward" },
    { id: 2, points: 200, ethAmount: "0.005", description: "Silver Reward" },
    { id: 3, points: 500, ethAmount: "0.01", description: "Gold Reward" }
  ];

  // Load points from localStorage and contract data
  useEffect(() => {
    loadPointsFromStorage();

    if (contract && account) {
      loadContractData();
    }
  }, [contract, account]);

  // Update points in localStorage
  const updatePointsInStorage = (newPoints) => {
    localStorage.setItem('runchain_points', newPoints.toString());
    setPoints(parseInt(newPoints, 10));
  };

  // Load points from localStorage
  const loadPointsFromStorage = () => {
    const savedPoints = localStorage.getItem('runchain_points');
    if (savedPoints) {
      setPoints(parseInt(savedPoints, 10));
    }
  };

  // Load data from the contract
  const loadContractData = async () => {
    if (!contract || !account) return;

    try {
      // Get contract balance
      const balance = await contract.getContractBalance();
      setContractBalance(ethers.formatEther(balance));

      // Get total points redeemed by user
      const redeemed = await contract.totalPointsRedeemed(account);
      setTotalPointsRedeemed(Number(redeemed));

      // Get last redemption timestamp
      const timestamp = await contract.lastRedemptionTimestamp(account);
      if (Number(timestamp) > 0) {
        const date = new Date(Number(timestamp) * 1000);
        setLastRedemptionTime(date.toLocaleString());
      }
    } catch (error) {
      console.error("Error loading contract data:", error);
    }
  };

  const handleRedeem = async (rewardTier) => {
    if (!contract || !account) {
      setMessage({ text: 'Please connect your wallet first', type: 'error' });
      return;
    }

    if (points < rewardTier.points) {
      setMessage({ text: 'Not enough points for this reward', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      // Convert ETH amount to wei
      const ethAmount = ethers.parseEther(rewardTier.ethAmount);

      // Call the contract function to redeem ETH
      const tx = await contract.redeemForEth(ethAmount);
      await tx.wait();

      // Update points in localStorage
      const newPoints = points - rewardTier.points;
      updatePointsInStorage(newPoints);

      // Refresh wallet balance and contract data
      if (refreshBalance) await refreshBalance();
      await loadContractData();

      setMessage({
        text: `Successfully redeemed ${rewardTier.ethAmount} ETH!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error redeeming reward:', error);

      // Extract error message from blockchain error
      let errorMsg = 'Failed to redeem reward. Please try again.';
      if (error.reason) {
        errorMsg = error.reason;
      } else if (error.data && error.data.message) {
        errorMsg = error.data.message;
      } else if (error.message) {
        // Remove technical prefix from error message if present
        errorMsg = error.message.replace(/^.*?:\s*/, '');
        if (errorMsg.includes('execution reverted:')) {
          errorMsg = errorMsg.replace('execution reverted:', '').trim();
        }
      }

      setMessage({
        text: errorMsg,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="redeem-rewards-container">
      <h2 className="mb-4">Redeem Your Rewards</h2>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} mb-4`}>
          {message.text}
        </div>
      )}

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Your Points Balance</h5>
              <h3>{points} <small>points</small></h3>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Reward Statistics</h5>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between">
                  <span>Total Points Redeemed:</span>
                  <strong>{totalPointsRedeemed}</strong>
                </li>
                <li className="list-group-item d-flex justify-content-between">
                  <span>Last Redemption:</span>
                  <strong>{lastRedemptionTime || 'Never'}</strong>
                </li>
                <li className="list-group-item d-flex justify-content-between">
                  <span>Contract Balance:</span>
                  <strong>{contractBalance} ETH</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <h4 className="mb-3">Available Rewards</h4>
      <div className="row">
        {rewardTiers.map((tier) => (
          <div className="col-md-4 mb-4" key={tier.id}>
            <div className="card h-100 reward-card">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">{tier.description}</h5>
              </div>
              <div className="card-body d-flex flex-column">
                <div className="mb-4 text-center">
                  <span className="display-6">{tier.ethAmount}</span>
                  <span className="h4"> ETH</span>
                </div>
                <div className="points-required mb-3 text-center">
                  <span>{tier.points}</span> points required
                </div>
                <button
                  className="btn btn-success mt-auto"
                  onClick={() => handleRedeem(tier)}
                  disabled={loading || points < tier.points || !account || !contract || parseFloat(contractBalance) < parseFloat(tier.ethAmount)}
                >
                  {loading ? 'Processing...' : 'Redeem Now'}
                </button>
                {points < tier.points && (
                  <div className="text-center mt-2">
                    <small className="text-muted">
                      Need {tier.points - points} more points
                    </small>
                  </div>
                )}
                {parseFloat(contractBalance) < parseFloat(tier.ethAmount) && (
                  <div className="text-center mt-2">
                    <small className="text-danger">
                      Insufficient contract balance
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!account && (
        <div className="alert alert-info mt-4">
          Please connect your MetaMask wallet to redeem rewards.
        </div>
      )}
    </div>
  );
}

export default RedeemRewards;