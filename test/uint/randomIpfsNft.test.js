const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip // if we not on development chain - skip it
    : describe("RandomIpfsNft", async function () {
          let randomIpfs, deployer, mintFee, deployerConnect

          const chainId = network.config.chainId

          beforeEach(async function () {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              nOwner = accounts[1]
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfs = await ethers.getContract("RandomIpfsNft")
              otherAccount = randomIpfs.connect(nOwner)
              deployerConnect = randomIpfs.connect(deployer)
              mintFee = await randomIpfs.getMintFee()
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
          })

          it("token counter should be 0 at start, mint fee should be correct", async function () {
              const tokenCounter = await randomIpfs.getTokenCounter()
              const mintFee = await randomIpfs.getMintFee()
              assert.equal(tokenCounter.toString(), "0")
              assert.equal(mintFee.toString(), networkConfig[chainId]["mintFee"])
          })

          it("should be reverted with error when don't pay enough", async function () {
              await expect(randomIpfs.requestNft()).to.be.revertedWith(
                  "RandomIpfsNft__NeedMoreETHSent"
              )
          })
          it("emits event when request nft", async function () {
              await expect(randomIpfs.requestNft({ value: mintFee })).to.be.emit(
                  randomIpfs,
                  "NftRequested"
              )
          })
          it("Not owner can't withdraw", async function () {
              await expect(otherAccount.withdraw()).to.be.revertedWith(
                  "Ownable: caller is not the owner"
              )
          })
          it("set token URIs correctly", async function () {
              const tokenUrisZero = await randomIpfs.getNftTokenUris(0)
              const tokenUrisOne = await randomIpfs.getNftTokenUris(1)
              const tokenUrisTwo = await randomIpfs.getNftTokenUris(2)
              assert(tokenUrisZero.includes("ipfs://"))
              assert(tokenUrisOne.includes("ipfs://"))
              assert(tokenUrisTwo.includes("ipfs://"))
          })
          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfs.once("NftMinted", async () => {
                          try {
                              const tokenUri = await randomIpfs.getNftTokenUris("0")
                              const tokenCounter = await randomIpfs.getTokenCounter()
                              assert(tokenUri.toString().includes("ipfs://"))
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const requestNftResponse = await randomIpfs.requestNft({
                              value: mintFee,
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIpfs.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })
      })
