// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract AuthorizedUserProfile is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    mapping(address => string) public jwtTokens;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    error InvalidJwt(address user);
    event UsernameUpdated(address indexed user, string newUsername);

    function setJwt(address user, string memory jwt) public onlyRole(BACKEND_ROLE) {
        jwtTokens[user] = jwt;
    }

    function setUsername(address user, string memory jwt, string memory newUsername) public {
        if (keccak256(bytes(jwt)) != keccak256(bytes(jwtTokens[user]))) {
            revert InvalidJwt(user);
        }

        emit UsernameUpdated(user, newUsername);
    }

    function symbol() public pure returns (string memory) { return ""; }
    function decimals() public pure returns (uint8) { return 0; }
}