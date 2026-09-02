// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RLPReader.sol";

/**
 * @title MerklePatriciaVerifier
 * @notice Real Merkle Patricia Trie Inclusion Proof Verifier in Solidity.
 * @dev Validates transaction receipts and account storage against Ethereum block header roots.
 */
library MerklePatriciaVerifier {
    using RLPReader for RLPReader.RLPItem;
    using RLPReader for RLPReader.Iterator;
    using RLPReader for bytes;

    /**
     * @notice Verifies that `expectedValue` is stored under `path` in a Trie with root `expectedRoot`.
     * @param expectedRoot The Merkle root from the block header (receiptsRoot or stateRoot)
     * @param path The key/path in the Trie (e.g. RLP(txIndex))
     * @param proof An array of RLP-encoded Trie nodes from root to leaf
     * @return isValid Boolean indicating whether the cryptographic proof is valid
     * @return value The extracted leaf value
     */
    function extractValue(
        bytes32 expectedRoot,
        bytes memory path,
        bytes[] memory proof
    ) internal pure returns (bool isValid, bytes memory value) {
        if (proof.length == 0) return (false, "");

        bytes memory nibbles = _bytesToNibbles(path);
        bytes32 expectedHash = expectedRoot;
        uint256 pathPtr = 0;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes memory currentNodeBytes = proof[i];

            // 1. Verify hash continuity
            if (i == 0) {
                if (keccak256(currentNodeBytes) != expectedHash) {
                    return (false, "");
                }
            } else {
                if (currentNodeBytes.length >= 32) {
                    if (keccak256(currentNodeBytes) != expectedHash) {
                        return (false, "");
                    }
                }
            }

            RLPReader.RLPItem memory currentNode = currentNodeBytes.toRlpItem();
            require(currentNode.isList(), "MerkleVerifier: node must be list");
            uint256 numItems = currentNode.numItems();

            if (numItems == 17) {
                // Branch Node
                RLPReader.RLPItem[] memory items = currentNode.toList();

                if (pathPtr >= nibbles.length) {
                    // We are at the end of the path; extract value at index 16
                    bytes memory branchVal = items[16].toBytes();
                    return (true, branchVal);
                }

                uint8 nibble = uint8(nibbles[pathPtr]);
                pathPtr++;

                RLPReader.RLPItem memory childItem = items[nibble];
                bytes memory childBytes = childItem.toBytes();
                if (childBytes.length == 0) {
                    return (false, ""); // Path not found
                }

                if (childBytes.length == 32) {
                    expectedHash = bytes32(childBytes);
                } else {
                    expectedHash = keccak256(childBytes);
                }
            } else if (numItems == 2) {
                // Leaf or Extension Node
                RLPReader.RLPItem[] memory items = currentNode.toList();
                bytes memory encodedPath = items[0].toBytes();
                bytes memory nodePathNibbles = _unpackNibbles(encodedPath);

                uint8 prefix = uint8(encodedPath[0]) >> 4;
                bool isLeaf = (prefix == 2 || prefix == 3);

                // Check if path matches
                for (uint256 k = 0; k < nodePathNibbles.length; k++) {
                    if (pathPtr + k >= nibbles.length || nibbles[pathPtr + k] != nodePathNibbles[k]) {
                        return (false, "");
                    }
                }
                pathPtr += nodePathNibbles.length;

                if (isLeaf) {
                    if (pathPtr != nibbles.length) {
                        return (false, ""); // Extraneous path remaining
                    }
                    bytes memory leafValue = items[1].toBytes();
                    return (true, leafValue);
                } else {
                    // Extension Node
                    bytes memory childBytes = items[1].toBytes();
                    if (childBytes.length == 32) {
                        expectedHash = bytes32(childBytes);
                    } else {
                        expectedHash = keccak256(childBytes);
                    }
                }
            } else {
                return (false, ""); // Invalid node
            }
        }

        return (false, "");
    }

    function _bytesToNibbles(bytes memory b) private pure returns (bytes memory) {
        bytes memory nibbles = new bytes(b.length * 2);
        for (uint256 i = 0; i < b.length; i++) {
            nibbles[i * 2] = bytes1(uint8(b[i]) >> 4);
            nibbles[i * 2 + 1] = bytes1(uint8(b[i]) & 0x0f);
        }
        return nibbles;
    }

    function _unpackNibbles(bytes memory compact) private pure returns (bytes memory) {
        require(compact.length > 0, "Empty compact path");
        uint8 prefix = uint8(compact[0]) >> 4;
        bool isOdd = (prefix == 1 || prefix == 3);

        uint256 nibblesLen = (compact.length - 1) * 2 + (isOdd ? 1 : 0);
        bytes memory nibbles = new bytes(nibblesLen);

        uint256 writePtr = 0;
        if (isOdd) {
            nibbles[writePtr++] = bytes1(uint8(compact[0]) & 0x0f);
        }

        for (uint256 i = 1; i < compact.length; i++) {
            nibbles[writePtr++] = bytes1(uint8(compact[i]) >> 4);
            nibbles[writePtr++] = bytes1(uint8(compact[i]) & 0x0f);
        }

        return nibbles;
    }
}
