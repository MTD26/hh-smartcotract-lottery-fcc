const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, raffleContract, vrfCoordinatorV2Mock, raffleEntranceFee, interval, player // , deployer

          //----
          //----

          beforeEach(async () => {
              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["mocks", "raffle"]) // Deploys modules with the tags "mocks" and "raffle"

              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock") // Returns a new connection to the VRFCoordinatorV2Mock contract
              raffleContract = await ethers.getContract("Raffle")
              //   console.log("VRFCoordinatorV2Mock address:", vrfCoordinatorV2Mock.address)
              //   console.log("Raffle address:", raffleContract.address) // Returns a new connection to the Raffle contract
              //   raffle = raffleContract.connect(player) // Returns a new instance of the Raffle contract connected to player
              raffleEntranceFee = await raffleContract.getEntranceFee()
              interval = await raffleContract.getInterval()
          })

          describe("constructor", function () {
              it("initializes the raffle correctly", async () => {
                  // Ideally, we'd separate these out so that only 1 assert per "it" block
                  // And ideally, we'd make this check everything
                  console.log(await raffleContract.getRaffleState())
                  // console.log(await raffle.getRaffleState())
                  const raffleState = (await raffleContract.getRaffleState()).toString()
                  // Comparisons for Raffle initialization:
                  console.log("--------------------")
                  console.log(raffleState)
                  assert.equal(raffleState, "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId]["keepersUpdateInterval"],
                  )
              })
          })

          describe("enterRaffle", function () {
              it("reverts when you dont pay enough", async function () {
                  await expect(raffleContract.enterRaffle()).to.be.revertedWith(
                      "Raffle__SendMoreToEnterRaffle",
                  )
              })

              it("records players when they enter", async function () {
                  await raffleContract.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffleContract.getPlayer(0)

                  assert.equal(playerFromContract, deployer.address)
              })
              it("emits event on enter", async function () {
                  await expect(raffleContract.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffleContract,
                      "RaffleEnter",
                  )
              })
              it("doesnt allow entrance when raffle is calculating", async function () {
                  await raffleContract.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])

                  //pretend to be a chainlink keeper
                  await raffleContract.performUpkeep([])
                  await expect(
                      raffleContract.enterRaffle({ value: raffleEntranceFee }),
                  ).to.be.revertedWith("Raffle__RaffleNotOpen()")
              })
          })

          describe("checkUpkeep", function () {
              it("returns false if people havent sent any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const upkeepNeeded = await raffleContract.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded.upkeepNeeded)
              })
              it("returns false if raffle isnt open", async function () {
                  await raffleContract.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffleContract.performUpkeep([])
                  const raffleState = await raffleContract.getRaffleState()
                  const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep("0x")
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })

              it("returns false if enough time hasn't passed", async () => {
                  await raffleContract.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffleContract.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("it can only run if checkUpkeep is true", async function () {
                  await raffleContract.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffleContract.performUpkeep([])
                  assert(tx)
              })

              it("reverts when checkUpkeep is false", async function () {
                  await expect(raffleContract.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded",
                  )
              })

              it("updates the raffle state, emits and event , and call the vrf coordinator", async function () {
                  await raffleContract.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await raffleContract.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const raffleState = await raffleContract.getRaffleState()

                  const requestId = txReceipt.events[1].args.requestId
                  assert(requestId.toNumber() > 0)
                  assert.equal(raffleState.toString(), "1")
              })
          })

          describe("fullfilRandomWords", function () {
              beforeEach(async function () {
                  await raffleContract.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
              })
              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffleContract.address),
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffleContract.address),
                  ).to.be.revertedWith("nonexistent request")
              })

              it("picks a winner, resets the lottery and send money", async function () {
                  const additionalEntrants = 3
                  const startingAccountIndex = 1
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffleContract.connect(accounts[i])
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                  }
                  const startingTimeStamp = await raffleContract.getLastTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      raffleContract.once("WinnerPicked", async () => {
                          console.log("found the event")
                          try {
                              const recentWinner = await raffleContract.getRecentWinner()
                              const raffleState = await raffleContract.getRaffleState()
                              const endingTimeStamp = await raffleContract.getLastTimeStamp()
                              const numPlayers = await raffleContract.getNumberOfPlayers()
                              const winnerEndingBalance = await accounts[1].getBalance()

                              assert.equal(numPlayers, "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      raffleEntranceFee
                                          .mul(additionalEntrants)
                                          .add(raffleEntranceFee)
                                          .toString(),
                                  ),
                              )
                          } catch (e) {
                              reject(e)
                          }
                          resolve()
                      })

                      const tx = await raffleContract.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      const winnerStartingBalance = await accounts[1].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffleContract.address,
                      )
                  })
              })
          })
      })
