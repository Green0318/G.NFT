// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__NeedMoreETHSent();
error RandomIpfsNft__TransferFailed();

contract RandomIpfsNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    // when we mint NFT , we will trigger a Chainlink VRF call to get us random number
    // using that number, we will get a random NFT
    // Grass, Sea, Viola
    // Grass super rare
    // Sea sort of rare
    // Viola common

    // users have to pay to mint NFT
    // the owner of the contract can withdraw the ETH

    // Type declaration
    enum Category {
        VIOLA,
        SEA,
        GRASS
    }

    // Chainlink VRF variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gaslane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // VRF helpers
    mapping(uint256 => address) public s_requestIdToSender;

    // NFT variables
    uint256 public s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_nftTokenUris;
    uint256 internal i_mintFee;

    // Events
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Category nftCategory, address minter);

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        string[3] memory nftTokenUris,
        uint256 mintFee
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
        // for _safeMint() work
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gaslane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_nftTokenUris = nftTokenUris;
        i_mintFee = mintFee;
    }

    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {
            revert RandomIpfsNft__NeedMoreETHSent();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gaslane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address nftOwner = s_requestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter;

        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;
        Category nftCategory = getCategoryFromModdedRng(moddedRng);
        s_tokenCounter = s_tokenCounter + 1;
        _safeMint(nftOwner, newTokenId);
        _setTokenURI(newTokenId, s_nftTokenUris[uint256(nftCategory)]);
        emit NftMinted(nftCategory, nftOwner);
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIpfsNft__TransferFailed();
        }
    }

    function getCategoryFromModdedRng(uint256 moddedRng) public pure returns (Category) {
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        // moddedRng = 25
        // i = 0
        // cumulativeSum = 0
        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < cumulativeSum + chanceArray[i]) {
                return Category(i);
            }
            cumulativeSum += chanceArray[i];
        }
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        return [10, 30, MAX_CHANCE_VALUE]; // 10% - index 0 , 30% - index 1, 100 - (10+30) = 60 % - index 2
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getNftTokenUris(uint256 index) public view returns (string memory) {
        return s_nftTokenUris[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
