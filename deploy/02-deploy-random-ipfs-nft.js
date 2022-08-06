const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")

const imagesLocation = "./images/randomnft/"

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Colorful",
            value: 100,
        },
    ],
}

let tokenUris = [
    "ipfs://QmWmnxsC82Eah5mJgPyHXdCnhSDxvfxhScrhQU35f5dB5A",
    "ipfs://QmUuYwJ9C6d2ppguKNBBSkZn7oAH2V8u3pdV6HG4x3XTtU",
    "ipfs://QmWmsUEaAm7imbxWDt8enpZSoLFnQS3rNtUa3wDgX4ukAV",
]

const FUND_AMOUNT = "1000000000000000000000" // 10 LINK

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // geth the IPFS hashes for images
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris()
    }

    let vrfCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("--------------------")
    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee, // like in contract
    ]

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("--------------------")
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("verifying...")
        await verify(randomIpfsNft.address, args)
    }
}

async function handleTokenUris() {
    tokenUris = []
    // store the image on IPFS
    // store the metadata in IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    for (imageUploadResponseIndex in imageUploadResponses) {
        // create metadata
        // upload the metadata
        let tokenUriMetadata = { ...metadataTemplate }

        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "") // name = without .png
        tokenUriMetadata.description = `Colorful ${tokenUriMetadata.name}`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetadata.name}...`)
        // store the JSON to pinata  / IPFS
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs uploaded! They are: ")
    console.log(tokenUris)

    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
