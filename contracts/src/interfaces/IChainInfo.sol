// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IChainInfo
 * @notice Canonical interface for Creditcoin's ChainInfo precompile (0x0FD3).
 * @dev Surface matches Attestcoin SDK v0.8 (@gluwa/cc-next-query-builder):
 *      get_supported_chains() / get_attestation_bounds(uint64,uint64)
 */
interface IChainInfo {
    /// @dev (uint64,uint64,string,uint32) entry describing one attested source chain.
    struct SourceChain {
        uint64 chainKey;
        uint64 chainId;
        string chainName;
        uint32 chainEncoding;
    }

    struct AttestationBounds {
        uint64 parentHeight;
        bytes32 parentHash;
        bool parentIsAttestation;
        uint64 childHeight;
        bytes32 childHash;
        bool childIsAttestation;
        bool isAttested;
    }

    /// @notice All source chains currently supported/attested by the network.
    function get_supported_chains() external view returns (SourceChain[] memory);

    /// @notice Continuity bounds and attestation flag for (chainKey, height).
    function get_attestation_bounds(
        uint64 chainKey,
        uint64 height
    ) external view returns (AttestationBounds memory);
}
