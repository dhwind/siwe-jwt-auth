// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {AuthorizedUserProfile} from "../src/AuthorizedUserProfile.sol";

contract AuthorizedUserProfileScript is Script {
    AuthorizedUserProfile public authorizedUserProfile;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        address backendWallet = vm.addr(vm.envUint("BACKEND_WALLET_PRIVATE_KEY"));
        address deployerWallet = vm.addr(deployerPrivateKey);

        console.log("Deploying AuthorizedUserProfile contract...");
        console.log("Deployer address:", deployerWallet);

        vm.startBroadcast(deployerPrivateKey);

        authorizedUserProfile = new AuthorizedUserProfile();
        address contractAddress = address(authorizedUserProfile);

        console.log("Contract deployed at:", contractAddress);
        
        bytes32 backendRole = authorizedUserProfile.BACKEND_ROLE();
        authorizedUserProfile.grantRole(backendRole, backendWallet);

        console.log("DEFAULT_ADMIN_ROLE granted to:", deployerWallet);
        console.log("BACKEND_ROLE granted to:", backendWallet);

        vm.stopBroadcast();

        console.log("\nDeployment complete!");
        console.log("Contract address:", contractAddress);
    }
}
