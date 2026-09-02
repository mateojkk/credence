// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBlockProver
 * @notice Canonical interface for Creditcoin's Block Prover precompile (0x0FD2).
 * @dev Selector surface matches Attestcoin SDK v0.8 (@gluwa/cc-next-query-builder):
 *      verify(uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[]))
 */
interface IBlockProver {
    /// @dev One sibling step of the transaction Merkle proof.
    struct MerkleSibling {
        bytes32 hash;
        bool isLeft;
    }

    /// @dev (bytes32,(bytes32,bool)[]) — block digest plus ordered sibling steps.
    struct TransactionMerkleProof {
        bytes32 blockDigest;
        MerkleSibling[] siblings;
    }

    /// @dev (bytes32,bytes32[]) — continuity anchor hash plus header-chain hashes.
    struct ContinuityProof {
        bytes32 anchorHash;
        bytes32[] proofHashes;
    }

    /**
     * @notice Verify a single transaction inclusion + continuity proof natively.
     * @return valid True when the precompile accepts both proofs.
     */
    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        TransactionMerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool valid);
}
