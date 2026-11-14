// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofOfReservesFeed
 * @notice On-chain Chainlink PoR compatible oracle for USDFirm dollar backing.
 * @dev Reports total audited reserves in USD (6 decimals) and Merkle root.
 */
interface IAggregatorV3 {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract ProofOfReservesFeed is IAggregatorV3 {
    string public constant description = "USDFirm Real-Time Proof of Reserves (USD)";
    uint8 public constant decimals = 6;
    uint256 public constant version = 1;

    address public immutable auditorOracle;
    uint80 private _roundId;
    int256 private _totalReservesUsd;
    uint256 private _updatedAt;
    bytes32 public latestMerkleRoot;

    event ReservesUpdated(
        uint80 indexed roundId,
        int256 totalReservesUsd,
        bytes32 merkleRoot,
        uint256 timestamp
    );

    modifier onlyAuditor() {
        require(msg.sender == auditorOracle, "PoR: Caller not authorized auditor");
        _;
    }

    constructor(address _auditor) {
        require(_auditor != address(0), "PoR: Zero auditor address");
        auditorOracle = _auditor;
    }

    function updateReserves(
        int256 totalReservesUsd,
        bytes32 merkleRoot
    ) external onlyAuditor {
        require(totalReservesUsd >= 0, "PoR: Negative reserves prohibited");
        _roundId++;
        _totalReservesUsd = totalReservesUsd;
        _updatedAt = block.timestamp;
        latestMerkleRoot = merkleRoot;

        emit ReservesUpdated(_roundId, totalReservesUsd, merkleRoot, block.timestamp);
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _totalReservesUsd, _updatedAt, _updatedAt, _roundId);
    }
}
