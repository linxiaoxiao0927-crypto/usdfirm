// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title USDF (USD Firm) - Foundational Dollar-Pegged Stablecoin
 * @notice Segregated institutional stablecoin for the XPayes ecosystem.
 * @dev Implements ERC-20, EIP-2612 permit, timelock minter, and OFAC compliance.
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract USDF is IERC20 {
    string public constant name = "USD Firm";
    string public constant symbol = "USDF";
    uint8 public constant decimals = 6; // Standard 6 decimals for institutional USD

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    address public timelockController;
    address public complianceOfficer;
    bool public paused;

    mapping(address => bool) public isMinter;
    mapping(address => bool) public isBlacklisted;

    event MinterSet(address indexed minter, bool indexed status);
    event BlacklistSet(address indexed target, bool indexed status);
    event EmergencyPause(bool indexed isPaused);
    event MintExecuted(address indexed minter, address indexed to, uint256 amount);
    event BurnExecuted(address indexed burner, address indexed from, uint256 amount);

    modifier onlyTimelock() {
        require(msg.sender == timelockController, "USDF: Only Timelock");
        _;
    }

    modifier onlyCompliance() {
        require(
            msg.sender == complianceOfficer || msg.sender == timelockController,
            "USDF: Only Compliance"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "USDF: Protocol Paused");
        _;
    }

    modifier notBlacklisted(address account) {
        require(!isBlacklisted[account], "USDF: Blacklisted Account");
        _;
    }

    constructor(address _timelock, address _compliance) {
        require(_timelock != address(0), "USDF: Invalid Timelock");
        timelockController = _timelock;
        complianceOfficer = _compliance;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount)
        external
        override
        whenNotPaused
        notBlacklisted(msg.sender)
        notBlacklisted(recipient)
        returns (bool)
    {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount)
        external
        override
        whenNotPaused
        notBlacklisted(msg.sender)
        notBlacklisted(spender)
        returns (bool)
    {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount)
        external
        override
        whenNotPaused
        notBlacklisted(sender)
        notBlacklisted(recipient)
        notBlacklisted(msg.sender)
        returns (bool)
    {
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "USDF: Insufficient allowance");
        unchecked {
            _allowances[sender][msg.sender] = currentAllowance - amount;
        }
        _transfer(sender, recipient, amount);
        return true;
    }

    function mint(address to, uint256 amount)
        external
        whenNotPaused
        notBlacklisted(to)
    {
        require(isMinter[msg.sender], "USDF: Sender not minter");
        require(to != address(0), "USDF: Mint to zero address");

        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
        emit MintExecuted(msg.sender, to, amount);
    }

    function burn(address from, uint256 amount) external whenNotPaused {
        require(isMinter[msg.sender] || msg.sender == from, "USDF: Unauthorized burn");
        require(_balances[from] >= amount, "USDF: Burn amount exceeds balance");

        _balances[from] -= amount;
        _totalSupply -= amount;
        emit Transfer(from, address(0), amount);
        emit BurnExecuted(msg.sender, from, amount);
    }

    function setMinter(address minter, bool status) external onlyTimelock {
        isMinter[minter] = status;
        emit MinterSet(minter, status);
    }

    function setBlacklist(address target, bool status) external onlyCompliance {
        isBlacklisted[target] = status;
        emit BlacklistSet(target, status);
    }

    function setPaused(bool _paused) external onlyCompliance {
        paused = _paused;
        emit EmergencyPause(_paused);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "USDF: Transfer from zero");
        require(recipient != address(0), "USDF: Transfer to zero");
        require(_balances[sender] >= amount, "USDF: Transfer exceeds balance");

        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }
}
