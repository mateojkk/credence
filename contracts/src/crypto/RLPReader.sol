// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RLPReader
 * @notice Real RLP (Recursive Length Prefix) decoder in Solidity.
 * @dev Fully parses RLP-encoded transaction receipts, block headers, and Merkle Patricia Trie nodes.
 * Based on standard Ethereum RLP specification (Yellow Paper Appendix B).
 */
library RLPReader {
    uint8 constant STRING_SHORT_START = 0x80;
    uint8 constant STRING_LONG_START  = 0xb8;
    uint8 constant LIST_SHORT_START   = 0xc0;
    uint8 constant LIST_LONG_START    = 0xf8;

    uint8 constant WORD_SIZE = 32;

    struct RLPItem {
        uint256 len;
        uint256 memPtr;
    }

    struct Iterator {
        RLPItem item;   // Item that's being iterated over.
        uint256 nextPtr;// Position of the next token in the list.
    }

    /*
     * @dev Converts bytes to RLPItem.
     * @param self The byte array to decode.
     * @return The RLPItem.
     */
    function toRlpItem(bytes memory self) internal pure returns (RLPItem memory) {
        uint256 len = self.length;
        if (len == 0) {
            return RLPItem(0, 0);
        }
        uint256 memPtr;
        assembly {
            memPtr := add(self, 0x20)
        }
        return RLPItem(len, memPtr);
    }

    /*
     * @dev Create an iterator.
     * @param self The list item over which to iterate.
     * @return Iterator.
     */
    function iterator(RLPItem memory self) internal pure returns (Iterator memory) {
        require(isList(self), "RLPReader: not a list");

        uint256 ptr = self.memPtr + _payloadOffset(self.memPtr);
        return Iterator(self, ptr);
    }

    function hasNext(Iterator memory it) internal pure returns (bool) {
        RLPItem memory item = it.item;
        return it.nextPtr < item.memPtr + item.len;
    }

    function next(Iterator memory it) internal pure returns (RLPItem memory) {
        require(hasNext(it), "RLPReader: no next item");

        uint256 ptr = it.nextPtr;
        uint256 itemLength = _itemLength(ptr);
        it.nextPtr = ptr + itemLength;

        return RLPItem(itemLength, ptr);
    }

    function isList(RLPItem memory item) internal pure returns (bool) {
        if (item.len == 0) return false;
        uint8 byte0;
        uint256 memPtr = item.memPtr;
        assembly {
            byte0 := byte(0, mload(memPtr))
        }
        return byte0 >= LIST_SHORT_START;
    }

    function toList(RLPItem memory item) internal pure returns (RLPItem[] memory) {
        require(isList(item), "RLPReader: not a list");

        uint256 items = numItems(item);
        RLPItem[] memory result = new RLPItem[](items);

        uint256 memPtr = item.memPtr + _payloadOffset(item.memPtr);
        uint256 dataLen;
        for (uint256 i = 0; i < items; i++) {
            dataLen = _itemLength(memPtr);
            result[i] = RLPItem(dataLen, memPtr);
            memPtr = memPtr + dataLen;
        }

        return result;
    }

    function numItems(RLPItem memory item) internal pure returns (uint256) {
        if (item.len == 0) return 0;
        uint256 count = 0;
        uint256 currPtr = item.memPtr + _payloadOffset(item.memPtr);
        uint256 endPtr = item.memPtr + item.len;
        while (currPtr < endPtr) {
            currPtr = currPtr + _itemLength(currPtr);
            count++;
        }
        return count;
    }

    function toBytes(RLPItem memory item) internal pure returns (bytes memory) {
        require(item.len > 0, "RLPReader: item length is 0");
        uint256 offset = _payloadOffset(item.memPtr);
        uint256 len = item.len - offset;
        bytes memory result = new bytes(len);

        uint256 destPtr;
        assembly {
            destPtr := add(result, 0x20)
        }

        _copy(item.memPtr + offset, destPtr, len);
        return result;
    }

    function toAddress(RLPItem memory item) internal pure returns (address) {
        require(item.len > 0, "RLPReader: item length is 0");
        bytes memory b = toBytes(item);
        require(b.length == 20, "RLPReader: invalid address length");
        address addr;
        assembly {
            addr := mload(add(b, 20))
        }
        return addr;
    }

    function toUint(RLPItem memory item) internal pure returns (uint256) {
        require(item.len > 0, "RLPReader: item length is 0");
        uint256 offset = _payloadOffset(item.memPtr);
        uint256 len = item.len - offset;
        require(len <= 32, "RLPReader: number exceeds 32 bytes");

        uint256 result = 0;
        uint256 memPtr = item.memPtr + offset;
        for (uint256 i = 0; i < len; i++) {
            uint8 b;
            assembly {
                b := byte(0, mload(add(memPtr, i)))
            }
            result = (result << 8) | uint256(b);
        }
        return result;
    }

    function toBytes32(RLPItem memory item) internal pure returns (bytes32) {
        require(item.len > 0, "RLPReader: item length is 0");
        bytes memory b = toBytes(item);
        require(b.length == 32, "RLPReader: invalid bytes32 length");
        bytes32 res;
        assembly {
            res := mload(add(b, 32))
        }
        return res;
    }

    // Helpers
    function _payloadOffset(uint256 memPtr) private pure returns (uint256) {
        uint8 byte0;
        assembly {
            byte0 := byte(0, mload(memPtr))
        }
        if (byte0 < STRING_SHORT_START) {
            return 0;
        } else if (byte0 < STRING_LONG_START) {
            return 1;
        } else if (byte0 < LIST_SHORT_START) {
            return 1 + (byte0 - STRING_LONG_START + 1);
        } else if (byte0 < LIST_LONG_START) {
            return 1;
        } else {
            return 1 + (byte0 - LIST_LONG_START + 1);
        }
    }

    function _itemLength(uint256 memPtr) private pure returns (uint256) {
        uint8 byte0;
        assembly {
            byte0 := byte(0, mload(memPtr))
        }
        if (byte0 < STRING_SHORT_START) {
            return 1;
        } else if (byte0 < STRING_LONG_START) {
            return 1 + (byte0 - STRING_SHORT_START);
        } else if (byte0 < LIST_SHORT_START) {
            uint8 lengthOfLength = byte0 - STRING_LONG_START + 1;
            uint256 dataLength;
            assembly {
                dataLength := div(mload(add(add(memPtr, 1), lengthOfLength)), exp(256, sub(32, lengthOfLength)))
            }
            return 1 + lengthOfLength + dataLength;
        } else if (byte0 < LIST_LONG_START) {
            return 1 + (byte0 - LIST_SHORT_START);
        } else {
            uint8 lengthOfLength = byte0 - LIST_LONG_START + 1;
            uint256 dataLength;
            assembly {
                dataLength := div(mload(add(add(memPtr, 1), lengthOfLength)), exp(256, sub(32, lengthOfLength)))
            }
            return 1 + lengthOfLength + dataLength;
        }
    }

    function _copy(uint256 src, uint256 dest, uint256 len) private pure {
        assembly {
            for { } gt(len, 0) { } {
                let chunk := 32
                if lt(len, 32) { chunk := len }
                mstore(dest, mload(src))
                src := add(src, chunk)
                dest := add(dest, chunk)
                len := sub(len, chunk)
            }
        }
    }
}
