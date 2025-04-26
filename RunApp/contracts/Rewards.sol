// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RunChainRewards
 * @dev Allows users to redeem points for ETH rewards
 */
contract RunChainRewards {
    address public owner;
    
    // Redemption tracking
    mapping(address => uint256) public lastRedemptionTimestamp;
    mapping(address => uint256) public totalPointsRedeemed;
    
    // Events
    event RewardRedeemed(address indexed user, uint256 points, uint256 ethAmount);
    event ContractFunded(address indexed funder, uint256 amount);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Redeems ETH based on points value
     * @param pointsAmount The amount in ETH to redeem (will convert to appropriate points)
     */
    function redeemForEth(uint256 pointsAmount) external {
        uint256 points;
        uint256 ethAmount;
        
        // Determine which tier was selected based on ETH amount
        if (pointsAmount == 0.001 ether) {
            points = 50;
            ethAmount = 0.001 ether;
        } else if (pointsAmount == 0.005 ether) {
            points = 200;
            ethAmount = 0.005 ether;
        } else if (pointsAmount == 0.01 ether) {
            points = 500;
            ethAmount = 0.01 ether;
        } else {
            revert("Invalid redemption amount");
        }
        
        // Check contract has sufficient funds
        require(address(this).balance >= ethAmount, "Contract has insufficient balance");
        
        // Update redemption tracking
        lastRedemptionTimestamp[msg.sender] = block.timestamp;
        totalPointsRedeemed[msg.sender] += points;
        
        // Send ETH to user
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        // Emit event
        emit RewardRedeemed(msg.sender, points, ethAmount);
    }
    
    /**
     * @dev Get contract's ETH balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Allow the owner to withdraw ETH from contract
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner).transfer(amount);
    }
    
    /**
     * @dev Transfer ownership of the contract
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
    
    /**
     * @dev Function to receive ETH
     */
    receive() external payable {
        emit ContractFunded(msg.sender, msg.value);
    }
}
