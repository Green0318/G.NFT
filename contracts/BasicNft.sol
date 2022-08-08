// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BasicNft is ERC721 {
    string public constant TOKEN_URI =
        "https://ipfs.io/ipfs/QmWjewZKSimef95znbD4kMQNnPkgFQWsbdE7HEkEf9NyjZ?filename=BasicNftCopy.json"; // its link for file json where must be link for the image
    uint256 private s_tokenCounter;

    constructor() ERC721("Ocean", "OCN") {
        s_tokenCounter = 0;
    }

    function mintNft() public returns (uint256) {
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter = s_tokenCounter + 1;
        return s_tokenCounter;
    }

    function getTokenURI(
        uint256 tokenId) public view override returns (string memory) {
        return TOKEN_URI;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
