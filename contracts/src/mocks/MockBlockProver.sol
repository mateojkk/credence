// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/INativeQueryVerifier.sol";

/**
 * @title MockBlockProver
 * @notice Local emulator of Creditcoin's Block Prover precompile (0x0FD2),
 *         byte-compatible with INativeQueryVerifier.
 */
contract MockBlockProver is INativeQueryVerifier {
    bool public alwaysPass = true;

    function setAlwaysPass(bool _pass) external {
        alwaysPass = _pass;
    }

    /// @notice View-matches the canonical precompile signature.
    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata,
        ContinuityProof calldata
    ) external view override returns (bool) {
        return alwaysPass;
    }

    event Verified(uint64 chainKey, uint64 height, bytes encodedTransaction, bool passed);
}
