import React from 'react';

function Dashboard({ account, balance }) {
  return (
    <div className="dashboard card">
      <div className="card-header bg-primary text-white">
        <h4 className="mb-0">Reward Points Dashboard</h4>
      </div>
      <div className="card-body">
        {account ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="balance-circle">
                <span className="balance-number">{parseFloat(balance).toFixed(2)}</span>
                <span className="balance-label">POINTS</span>
              </div>
            </div>
            
            <h5>Account Information</h5>
            <p className="text-muted">
              <strong>Wallet Address:</strong> {account}
            </p>
            
            <div className="row mt-4">
              <div className="col-md-6">
                <div className="card bg-light mb-3">
                  <div className="card-body text-center">
                    <h5 className="card-title">Earn Points</h5>
                    <p className="card-text">Make purchases to earn reward points</p>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => document.querySelector('button[data-target="earn"]')?.click()}
                    >
                      <i className="fas fa-plus-circle me-2"></i>
                      Earn Rewards
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card bg-light mb-3">
                  <div className="card-body text-center">
                    <h5 className="card-title">Redeem Points</h5>
                    <p className="card-text">Use your points for discounts and rewards</p>
                    <button 
                      className="btn btn-success"
                      onClick={() => document.querySelector('button[data-target="redeem"]')?.click()}
                    >
                      <i className="fas fa-exchange-alt me-2"></i>
                      Redeem Rewards
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="alert alert-warning">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Please connect your MetaMask wallet to view your rewards dashboard
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard; 