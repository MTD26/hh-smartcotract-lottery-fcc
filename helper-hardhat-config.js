const { ethers } = require("hardhat")

const networkConfig = {
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "17604",
        callbackGasLimit: "500000",
        interval: "30", //seconds
    },
    11155111: {
        name: "sepolia",
        subscriptionId: "9407",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
        interval: "30",
        entranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
        callbackGasLimit: "500000", // 500,000 gas
        vrfCoordinatorV2: "0x8103b0a8a00be2ddc778e6e7eaa21791cd364625",
    },
    31337: {
        name: "hardhat",
        raffleEntranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "500000",
        keepersUpdateInterval: "30", //seconds
    },
}
const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}
