// const { deployments, network, ethers } = require("hardhat")
// const {developmentChains, networkConfig} = require("../helper-hardhat-config")
// const { verify } = require("../helper-hardhat-config")

// const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30")

// module.exports = async function({getNamedAccounts, deployments}){
//     const {deploy, log} = deployments
//     const {deployer} = await getNamedAccounts()
//     const chainId = network.config.chainId
//     let vrfCoordinatorV2Address, subscriptionId

//     if(developmentChains.includes(network.name)){
//     const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
//     vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
//     const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
//     const transactionReceipt = await transactionResponse.wait(1)
//     subscriptionId = transactionReceipt.events[0].args.subId

//     // fund the subscription
//     // usually, we would need the link token on a real tetwork (this is a mock example)
//     await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)

//     }else{
//         vrfCoordinatorV2Address = networkConfig[chainId][vrfCoordinatorV2]
//         // here we will get the subscription ID from our helper-config (we will maanage this through chainlinks UI to subcribe and get a direc)
//         subscriptionId = networkConfig[chainId]["subscriptionId"]

//     }

//    const entranceFee = networkConfig[chainId]["entranceFee"]
//    const gasLane = networkConfig[chainId]["gasLane"]
//    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
//    const interval = networkConfig[chainId]["interval"]

//  const args = [vrfCoordinatorV2Address, entranceFee, gasLane, subscriptionId, callbackGasLimit, interval]

//     const raffle = await deploy ("Raffle" , {
//         from: deployer,
//         args: args,
//         log: true,
//         waitConfirmations: network.config.blockConfirmations || 1,

//     })

//     if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY){
//         log("verifying....")
//         await verify(raffle.address, args)
//         log("-------------------------------")

//     }

// }

// module.exports.tags = ["all", "raffle"]

const { network, ethers } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const FUND_AMOUNT = ethers.utils.parseEther("1") // 1 Ether, or 1e18 (10^18) Wei

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    if (chainId == 31337) {
        // create VRFV2 Subscription
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        // Fund the subscription
        // Our mock makes it so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("----------------------------------------------------")
    const arguments = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["interval"],
        networkConfig[chainId]["entranceFee"],
        networkConfig[chainId]["callbackGasLimit"],
    ]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })

    // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
    }

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(raffle.address, arguments)
    }

    // log("Enter lottery with command:")
    // const networkName = network.name == "hardhat" ? "localhost" : network.name
    // log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`)
    // log("----------------------------------------------------")
}

module.exports.tags = ["all", "raffle"]
