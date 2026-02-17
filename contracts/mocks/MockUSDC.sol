// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing — 6 decimals, open mint, faucet function
 * @dev DO NOT deploy to mainnet. Use real USDC on Base mainnet.
 */
contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("USD Coin", "USDC") Ownable(msg.sender) {}

    /**
     * @notice USDC uses 6 decimals, not the default 18
     * @return Number of decimals (6)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint tokens to any address — for test setup
     * @param to Recipient address
     * @param amount Amount in smallest unit (6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Faucet — mint 1000 USDC to caller (testnet convenience)
     */
    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** 6);
    }
}
