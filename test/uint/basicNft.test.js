const { assert } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip // if we not on development chain - skip it
    : describe("BasicNft", async function () {
          let basicNft, deployer

          beforeEach(async function () {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["BasicNft"])
              basicNft = await ethers.getContract("BasicNft")
          })

          it("can mint NFT, token URI is correct, counter work correct", async function () {
              const tokenUri = await basicNft.getTokenURI(0)
              // get counter at start
              const tokenCounter = await basicNft.getTokenCounter()
              // testing counter at start, it should be 0
              assert.equal(tokenCounter.toString(), "0")
              // call function mintNft() and wait 1 block
              const txResponse = await basicNft.mintNft()
              await txResponse.wait(1) // waiting 1 block
              // testing counter after, it should be +1
              const tokenCounterAfter = await basicNft.getTokenCounter()
              assert.equal(tokenCounterAfter.toString(), "1")
              // testing token URI
              assert.equal(
                  tokenUri,
                  "https://ipfs.io/ipfs/QmUWgTDruGEkTcms7YFfTFhNbpGDdK5epNcwwbo5qifKJ9?filename=BasicNft.json"
              )
          })
      })
//   })
