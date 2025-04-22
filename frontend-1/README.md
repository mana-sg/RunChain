# Blockchain Reward Points System Frontend

A simple React-based frontend for a blockchain-based reward points system where users can earn and redeem reward points (ERC-20 tokens) for purchases.

## Features

- Connect with MetaMask wallet
- View current reward points balance
- Earn reward points by simulating purchases
- Redeem reward points for rewards/discounts
- Modern, responsive UI

## Tech Stack

- React.js
- Ethers.js for blockchain interaction
- Bootstrap 5 for UI components
- Font Awesome for icons
- MetaMask integration

## Prerequisites

- Node.js and npm installed
- MetaMask browser extension
- A blockchain network (local or testnet) with the deployed RewardToken contract

## Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Smart Contract Integration

This frontend is designed to work with an ERC-20 token contract (`RewardToken`) that has additional functionality for earning and redeeming rewards. The contract should implement:

- Standard ERC-20 functions
- `earnRewards(address customer, uint256 amount)` - For businesses to give points to customers
- `redeemRewards(uint256 amount)` - For customers to redeem their points

## Usage

1. Connect your MetaMask wallet to the application
2. Navigate to the "Earn Rewards" tab to simulate purchases and earn points
3. Navigate to the "Redeem Rewards" tab to exchange points for rewards

## Development

The project structure follows standard React conventions:

- `/src/components` - React components
- `/src/contracts` - Smart contract ABIs and addresses
- `/src/App.js` - Main application component
- `/src/App.css` - Custom styling

## License

MIT

## Acknowledgements

- OpenZeppelin for ERC-20 implementation
- MetaMask for wallet integration
- Bootstrap for UI components
