// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title USDFTimelockController
 * @notice Multi-signature timelock controller for USDF governance and minting cap increases.
 * @dev Enforces a strict minimum delay (24 hours) for privileged parameter modifications.
 */
contract USDFTimelockController {
    uint256 public constant MIN_DELAY = 1 days;
    uint256 public constant MAX_DELAY = 30 days;

    address[] public signers;
    uint256 public threshold; // e.g. 3 of 5

    mapping(address => bool) public isSigner;
    mapping(bytes32 => bool) public queuedOperations;
    mapping(bytes32 => uint256) public executionEta;
    mapping(bytes32 => mapping(address => bool)) public hasConfirmed;

    event OperationQueued(bytes32 indexed id, address indexed target, bytes data, uint256 eta);
    event OperationExecuted(bytes32 indexed id, address indexed target);
    event OperationCancelled(bytes32 indexed id);
    event ConfirmationReceived(bytes32 indexed id, address indexed signer);

    modifier onlySigner() {
        require(isSigner[msg.sender], "Timelock: Caller not signer");
        _;
    }

    constructor(address[] memory _signers, uint256 _threshold) {
        require(_signers.length >= _threshold, "Timelock: Invalid threshold");
        require(_threshold > 0, "Timelock: Zero threshold");

        for (uint256 i = 0; i < _signers.length; i++) {
            address s = _signers[i];
            require(s != address(0) && !isSigner[s], "Timelock: Invalid signer");
            isSigner[s] = true;
            signers.push(s);
        }
        threshold = _threshold;
    }

    function hashOperation(
        address target,
        bytes memory data,
        uint256 delay,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(target, data, delay, salt));
    }

    function queueOperation(
        address target,
        bytes memory data,
        uint256 delay,
        bytes32 salt
    ) external onlySigner returns (bytes32 id) {
        require(delay >= MIN_DELAY && delay <= MAX_DELAY, "Timelock: Invalid delay");
        id = hashOperation(target, data, delay, salt);
        require(!queuedOperations[id], "Timelock: Already queued");

        queuedOperations[id] = true;
        executionEta[id] = block.timestamp + delay;
        hasConfirmed[id][msg.sender] = true;

        emit OperationQueued(id, target, data, executionEta[id]);
        emit ConfirmationReceived(id, msg.sender);
    }

    function confirmOperation(bytes32 id) external onlySigner {
        require(queuedOperations[id], "Timelock: Not queued");
        require(!hasConfirmed[id][msg.sender], "Timelock: Already confirmed");

        hasConfirmed[id][msg.sender] = true;
        emit ConfirmationReceived(id, msg.sender);
    }

    function executeOperation(
        address target,
        bytes memory data,
        uint256 delay,
        bytes32 salt
    ) external payable returns (bytes memory) {
        bytes32 id = hashOperation(target, data, delay, salt);
        require(queuedOperations[id], "Timelock: Not queued");
        require(block.timestamp >= executionEta[id], "Timelock: Timelock not expired");

        uint256 confirmations = 0;
        for (uint256 i = 0; i < signers.length; i++) {
            if (hasConfirmed[id][signers[i]]) {
                confirmations++;
            }
        }
        require(confirmations >= threshold, "Timelock: Threshold not met");

        queuedOperations[id] = false;
        (bool success, bytes memory result) = target.call{value: msg.value}(data);
        require(success, "Timelock: Execution failed");

        emit OperationExecuted(id, target);
        return result;
    }

    function cancelOperation(bytes32 id) external onlySigner {
        require(queuedOperations[id], "Timelock: Not queued");
        queuedOperations[id] = false;
        emit OperationCancelled(id);
    }
}
