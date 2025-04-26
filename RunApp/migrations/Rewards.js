const RunChainRewards = artifacts.require("RunChainRewards");

module.exports = function(deployer) {
  deployer.deploy(RunChainRewards);
};
