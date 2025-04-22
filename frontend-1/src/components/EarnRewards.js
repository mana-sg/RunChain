import React, { useState } from 'react';
import { parseUnits } from 'ethers';

function EarnRewards({ contract, account, refreshBalance }) {
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [rewardPoints, setRewardPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Calculate reward points (1 point per 10 currency units)
  const calculateRewardPoints = (amount) => {
    if (!amount || isNaN(amount)) return 0;
    return Math.floor(parseFloat(amount) / 10);
  };

  const handleAmountChange = (e) => {
    const amount = e.target.value;
    setPurchaseAmount(amount);
    setRewardPoints(calculateRewardPoints(amount));
  };

  const handleEarnRewards = async (e) => {
    e.preventDefault();

    // Reset messages
    setErrorMessage('');
    setSuccessMessage('');

    if (!purchaseAmount || isNaN(purchaseAmount) || parseFloat(purchaseAmount) <= 0) {
      setErrorMessage('Please enter a valid purchase amount');
      return;
    }

    if (!contract) {
      setErrorMessage('Contract not initialized');
      return;
    }

    try {
      setLoading(true);

      // In a real app, we'd process a payment here
      // For this demo, we'll just mint reward tokens

      // Convert reward points to wei (tokens have 18 decimals)
      const pointsToEarn = calculateRewardPoints(purchaseAmount);
      const pointsInWei = parseUnits(pointsToEarn.toString(), 18);

      // Call the smart contract function to earn rewards
      const tx = await contract.earnRewards(account, pointsInWei);

      // Wait for transaction to be mined
      await tx.wait();

      // Refresh the user's balance
      await refreshBalance();

      // Show success message
      setSuccessMessage(`Successfully earned ${pointsToEarn} reward points!`);

      // Reset form
      setPurchaseAmount('');
      setRewardPoints(0);

    } catch (error) {
      console.error('Error earning rewards:', error);
      setErrorMessage('Failed to earn rewards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="earn-rewards card">
      <div className="card-header bg-primary text-white">
        <h4 className="mb-0">Earn Reward Points</h4>
      </div>
      <div className="card-body">
        {account ? (
          <>
            {errorMessage && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-circle me-2"></i>
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="alert alert-success">
                <i className="fas fa-check-circle me-2"></i>
                {successMessage}
              </div>
            )}

            <form onSubmit={handleEarnRewards}>
              <div className="mb-3">
                <label htmlFor="purchaseAmount" className="form-label">Purchase Amount (USD)</label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <input
                    type="number"
                    className="form-control"
                    id="purchaseAmount"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={purchaseAmount}
                    onChange={handleAmountChange}
                    disabled={loading}
                  />
                </div>
                <small className="text-muted">Earn 1 point for every $10 spent</small>
              </div>

              <div className="mb-4 reward-preview">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h5>Reward Preview</h5>
                    <div className="reward-amount">
                      <span>{rewardPoints}</span> Points
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading || !purchaseAmount || parseFloat(purchaseAmount) <= 0}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-coins me-2"></i>
                    Earn Rewards
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <p className="alert alert-warning">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Please connect your MetaMask wallet to earn rewards
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EarnRewards; 