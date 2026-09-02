// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IChainInfo.sol";
import "../interfaces/IBlockProver.sol";

/**
 * @title MockChainInfo
 * @notice Local emulator of Creditcoin's ChainInfo precompile (0x0FD3) with the
 *         canonical surface used by Attestcoin SDK v0.8.
 */
contract MockChainInfo is IChainInfo {
    bool public defaultAttested = true;
    mapping(uint64 => mapping(uint64 => bool)) public forcedAttested;

    SourceChain[] private _chains;

    constructor() {
        // Sepolia, chainKey 1 on CC3 testnet (matches Attestcoin environments table)
        _chains.push(SourceChain(1, 11155111, "Ethereum Sepolia", 0));
    }

    function setDefaultAttested(bool attested) external {
        defaultAttested = attested;
    }

    function get_supported_chains() external view override returns (SourceChain[] memory) {
        return _chains;
    }

    function get_attestation_bounds(
        uint64 chainKey,
        uint64 height
    ) external view override returns (AttestationBounds memory) {
        bool attested = forcedAttested[chainKey][height] || defaultAttested;
        return AttestationBounds({
            parentHeight: height > 0 ? height - 1 : 0,
            parentHash: bytes32(0),
            parentIsAttestation: true,
            childHeight: height,
            childHash: bytes32(0),
            childIsAttestation: true,
            isAttested: attested
        });
    }
}
