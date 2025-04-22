import React from 'react';

function Navbar({ account, setActiveComponent, activeComponent }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <a className="navbar-brand" href="#!">
          <i className="fas fa-award me-2"></i>
          RunChain
        </a>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <button
                className={`nav-link btn btn-link ${activeComponent === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveComponent('dashboard')}
              >
                Dashboard
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link btn btn-link ${activeComponent === 'steps' ? 'active' : ''}`}
                onClick={() => setActiveComponent('steps')}
              >
                <i className="fas fa-walking me-1"></i>
                Step Tracker
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link btn btn-link ${activeComponent === 'redeem' ? 'active' : ''}`}
                onClick={() => setActiveComponent('redeem')}
              >
                Redeem Rewards
              </button>
            </li>
          </ul>

          <div className="d-flex align-items-center">
            <div className="wallet-info text-light">
              <small>
                {account ? (
                  <>
                    <i className="fas fa-wallet me-1"></i>
                    {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
                  </>
                ) : (
                  'Connect MetaMask'
                )}
              </small>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;