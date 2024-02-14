// const { assert, expect } = require("chai")
// const { network, deployments, ethers } = require("hardhat")
// const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
// const {
//     assertServiceAgreementEmpty,
// } = require("@chainlink/test-helpers/dist/src/contracts/coordinator")

// developmentChains.includes(network.name)
//     ? describe.skip
//     : describe("Raffle Staging Tests", function () {
//           let raffle, raffleContract, vrfCoordinatorV2Mock, raffleEntranceFee, player // , deployer

//           //----
//           //----

//           beforeEach(async () => {
//               accounts = await ethers.getSigners() // could also do with getNamedAccounts
//               deployer = accounts[0]
//               player = accounts[1]
//               await deployments.fixture(["mocks", "raffle"]) // Deploys modules with the tags "mocks" and "raffle"

//               vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock") // Returns a new connection to the VRFCoordinatorV2Mock contract
//               raffleContract = await ethers.getContract("Raffle")
//               //   console.log("VRFCoordinatorV2Mock address:", vrfCoordinatorV2Mock.address)
//               //   console.log("Raffle address:", raffleContract.address) // Returns a new connection to the Raffle contract
//               //   raffle = raffleContract.connect(player) // Returns a new instance of the Raffle contract connected to player
//               raffleEntranceFee = await raffleContract.getEntranceFee()
//           })

//           describe("fullfilRandomWords", function () {
//               it("works with live chainlink keepers and chainlink VRF, we get a random winner", async function () {
//                   //enter the raffle
//                   const startingTimeStamp = await raffleContract.getLastTimeStamp()
//                   const accounts = await ethers.getSigners()

//                   await new Promise(async (resolve, reject) => {
//                       raffleContract.once("WinnnerPicked", async () => {
//                           console.log("Winner picked event fired")
//                           try {
//                               const recentWinner = await raffleContract.getRecentWinner()
//                               const raffleState = await raffleContract.getRaffleState()
//                               const winnerEndingBalance = await accounts[0]
//                               const endingTimeStamp = await raffleContract.getLastTimeStamp()

//                               await expect(raffleContract.getPlayer(0)).to.be.reverted
//                               assert.equal(recentWinner.toString(), accounts[0].address)
//                               assert.equal(raffleState, "0")
//                               assert.equal(
//                                   winnerEndingBalance.toString(),
//                                   winnerStartingBalance.add(raffleEntranceFee).toString(),
//                               )
//                               assert(endingTimeStamp > startingTimeStamp)
//                               resolve()
//                           } catch (e) {
//                               console.log(e)
//                               reject(e)
//                           }
//                       })

//                       // enter the raffle
//                       await raffleContract.enterRaffle({ value: raffleEntranceFee })
//                       const winnerStartingBalance = await accounts[0].getBalance()
//                   })
//               })
//           })
//       })

const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  // enter the raffle
                  console.log("Setting up test...")
                  const startingTimeStamp = await raffle.getLastTimeStamp()
                  const accounts = await ethers.getSigners()

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the raffle
                      // Just in case the blockchain moves REALLY fast
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              // add our asserts here
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await raffle.getLastTimeStamp()

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString(),
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      // Then entering the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()

                      // and this code WONT complete until our listener has finished listening!
                  })
              })
          })
      })
