const { developmentChains } = require("../helper-hardhat-config")

const DECIMALS = "18"
const INITIAL_PRICE = ethers.utils.parseUnits("2000", "ether") // from chainlink docs

const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is the premium. It cost 0.25 LINK per request. from chain.link website
const GAS_PRICE_LINK = 1e9 // 1000000000 // link per gas. calculated value based on the gas price of the chain.

// Chainlink nodes pay the gas fees to give us randomness and do external execution

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        // from config: developmentChains = ["hardhat", "localhost"], if on development chains - deploy mocks
        log("Local network detected! Deploying mocks...")
        // deploy a mock vrfcoordinator ...
        // deploying mocks!
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        await deploy("MockV3Aggregator", {
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_PRICE],
        })
        log("Mocks Deployed")
        log("--------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
