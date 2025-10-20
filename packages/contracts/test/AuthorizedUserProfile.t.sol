// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {AuthorizedUserProfile} from "../src/AuthorizedUserProfile.sol";

contract AuthorizedUserProfileTest is Test {
    AuthorizedUserProfile public profile;
    
    address public admin;
    address public backend;
    address public user;
    address public unauthorized;
    
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    
    string constant TEST_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    string constant DIFFERENT_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.different";
    string constant TEST_USERNAME = "testuser";
    
    event UsernameUpdated(address indexed user, string newUsername);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    
    function setUp() public {
        admin = address(this);
        backend = makeAddr("backend");
        user = makeAddr("user");
        unauthorized = makeAddr("unauthorized");
        
        profile = new AuthorizedUserProfile();
    }
    
    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_Deployment() public view {
        assertTrue(address(profile) != address(0));
    }
    
    function test_DeploymentGrantsAdminRole() public view {
        assertTrue(profile.hasRole(DEFAULT_ADMIN_ROLE, admin));
    }
    
    function test_BackendRoleConstant() public view {
        assertEq(profile.BACKEND_ROLE(), BACKEND_ROLE);
    }
    
    /*//////////////////////////////////////////////////////////////
                        ROLE MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_GrantBackendRole() public {
        vm.expectEmit(true, true, true, true);
        emit RoleGranted(BACKEND_ROLE, backend, admin);
        
        profile.grantRole(BACKEND_ROLE, backend);
        
        assertTrue(profile.hasRole(BACKEND_ROLE, backend));
    }
    
    function test_GrantBackendRoleToMultipleAddresses() public {
        address backend2 = makeAddr("backend2");
        
        profile.grantRole(BACKEND_ROLE, backend);
        profile.grantRole(BACKEND_ROLE, backend2);
        
        assertTrue(profile.hasRole(BACKEND_ROLE, backend));
        assertTrue(profile.hasRole(BACKEND_ROLE, backend2));
    }
    
    function test_RevertWhen_UnauthorizedGrantsRole() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        profile.grantRole(BACKEND_ROLE, backend);
    }
    
    function test_RevokeBackendRole() public {
        profile.grantRole(BACKEND_ROLE, backend);
        assertTrue(profile.hasRole(BACKEND_ROLE, backend));
        
        vm.expectEmit(true, true, true, true);
        emit RoleRevoked(BACKEND_ROLE, backend, admin);
        
        profile.revokeRole(BACKEND_ROLE, backend);
        
        assertFalse(profile.hasRole(BACKEND_ROLE, backend));
    }
    
    function test_RevertWhen_UnauthorizedRevokesRole() public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(unauthorized);
        vm.expectRevert();
        profile.revokeRole(BACKEND_ROLE, backend);
    }
    
    function test_HasRole_ReturnsFalseForNonGrantedRole() public view {
        assertFalse(profile.hasRole(BACKEND_ROLE, unauthorized));
    }
    
    /*//////////////////////////////////////////////////////////////
                            SET JWT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_SetJwt() public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(backend);
        profile.setJwt(user, TEST_JWT);
        
        assertEq(profile.jwtTokens(user), TEST_JWT);
    }
    
    function test_SetJwt_MultipleUsers() public {
        profile.grantRole(BACKEND_ROLE, backend);
        address user2 = makeAddr("user2");
        
        vm.startPrank(backend);
        profile.setJwt(user, TEST_JWT);
        profile.setJwt(user2, DIFFERENT_JWT);
        vm.stopPrank();
        
        assertEq(profile.jwtTokens(user), TEST_JWT);
        assertEq(profile.jwtTokens(user2), DIFFERENT_JWT);
    }
    
    function test_SetJwt_UpdateExistingJwt() public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.startPrank(backend);
        profile.setJwt(user, TEST_JWT);
        assertEq(profile.jwtTokens(user), TEST_JWT);
        
        profile.setJwt(user, DIFFERENT_JWT);
        assertEq(profile.jwtTokens(user), DIFFERENT_JWT);
        vm.stopPrank();
    }
    
    function test_SetJwt_EmptyString() public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(backend);
        profile.setJwt(user, "");
        
        assertEq(profile.jwtTokens(user), "");
    }
    
    function test_RevertWhen_UnauthorizedSetsJwt() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        profile.setJwt(user, TEST_JWT);
    }
    
    function test_RevertWhen_UserSetsOwnJwt() public {
        vm.prank(user);
        vm.expectRevert();
        profile.setJwt(user, TEST_JWT);
    }
    
    function test_RevertWhen_AdminSetsJwtWithoutBackendRole() public {
        // Admin has DEFAULT_ADMIN_ROLE but not BACKEND_ROLE
        vm.expectRevert();
        profile.setJwt(user, TEST_JWT);
    }
    
    /*//////////////////////////////////////////////////////////////
                        SET USERNAME TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_SetUsername_WithValidJwt() public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(backend);
        profile.setJwt(user, TEST_JWT);
        
        vm.expectEmit(true, false, false, true);
        emit UsernameUpdated(user, TEST_USERNAME);
        
        vm.prank(user);
        profile.setUsername(user, TEST_JWT, TEST_USERNAME);
    }
    
    function test_SetUsername_AnyoneCanCallWithValidJwt() public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(backend);
        profile.setJwt(user, TEST_JWT);
        
        // Even unauthorized user can call if they have the correct JWT
        vm.expectEmit(true, false, false, true);
        emit UsernameUpdated(user, TEST_USERNAME);
        
        vm.prank(unauthorized);
        profile.setUsername(user, TEST_JWT, TEST_USERNAME);
    }
    
    function test_SetUsername_MultipleUpdates() public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(backend);
        profile.setJwt(user, TEST_JWT);
        
        vm.startPrank(user);
        
        vm.expectEmit(true, false, false, true);
        emit UsernameUpdated(user, "username1");
        profile.setUsername(user, TEST_JWT, "username1");
        
        vm.expectEmit(true, false, false, true);
        emit UsernameUpdated(user, "username2");
        profile.setUsername(user, TEST_JWT, "username2");
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_SetUsernameWithInvalidJwt() public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(backend);
        profile.setJwt(user, TEST_JWT);
        
        vm.expectRevert(abi.encodeWithSelector(AuthorizedUserProfile.InvalidJwt.selector, user));
        profile.setUsername(user, DIFFERENT_JWT, TEST_USERNAME);
    }
    
    function test_RevertWhen_SetUsernameWithNoJwtSet() public {
        // User has no JWT set, so any JWT will be invalid
        vm.expectRevert(abi.encodeWithSelector(AuthorizedUserProfile.InvalidJwt.selector, user));
        profile.setUsername(user, TEST_JWT, TEST_USERNAME);
    }
    
    function test_RevertWhen_SetUsernameWithEmptyJwt() public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(backend);
        profile.setJwt(user, TEST_JWT);
        
        vm.expectRevert(abi.encodeWithSelector(AuthorizedUserProfile.InvalidJwt.selector, user));
        profile.setUsername(user, "", TEST_USERNAME);
    }
    
    function test_SetUsername_AfterJwtUpdate() public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        // Set initial JWT
        vm.prank(backend);
        profile.setJwt(user, TEST_JWT);
        
        // Update username with initial JWT
        vm.prank(user);
        profile.setUsername(user, TEST_JWT, "username1");
        
        // Update JWT
        vm.prank(backend);
        profile.setJwt(user, DIFFERENT_JWT);
        
        // Old JWT should no longer work
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(AuthorizedUserProfile.InvalidJwt.selector, user));
        profile.setUsername(user, TEST_JWT, "username2");
        
        // New JWT should work
        vm.expectEmit(true, false, false, true);
        emit UsernameUpdated(user, "username2");
        
        vm.prank(user);
        profile.setUsername(user, DIFFERENT_JWT, "username2");
    }
    
    /*//////////////////////////////////////////////////////////////
                        UTILITY FUNCTIONS TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_Symbol() public view {
        assertEq(profile.symbol(), "");
    }
    
    function test_Decimals() public view {
        assertEq(profile.decimals(), 0);
    }
    
    /*//////////////////////////////////////////////////////////////
                            FUZZ TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testFuzz_SetJwt(address _user, string memory _jwt) public {
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(backend);
        profile.setJwt(_user, _jwt);
        
        assertEq(profile.jwtTokens(_user), _jwt);
    }
    
    function testFuzz_SetUsername_WithValidJwt(
        address _user,
        string memory _jwt,
        string memory _username
    ) public {
        vm.assume(_user != address(0));
        
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(backend);
        profile.setJwt(_user, _jwt);
        
        vm.expectEmit(true, false, false, true);
        emit UsernameUpdated(_user, _username);
        
        profile.setUsername(_user, _jwt, _username);
    }
    
    function testFuzz_SetUsername_RevertsWithInvalidJwt(
        address _user,
        string memory _validJwt,
        string memory _invalidJwt,
        string memory _username
    ) public {
        vm.assume(_user != address(0));
        vm.assume(keccak256(bytes(_validJwt)) != keccak256(bytes(_invalidJwt)));
        
        profile.grantRole(BACKEND_ROLE, backend);
        
        vm.prank(backend);
        profile.setJwt(_user, _validJwt);
        
        vm.expectRevert(abi.encodeWithSelector(AuthorizedUserProfile.InvalidJwt.selector, _user));
        profile.setUsername(_user, _invalidJwt, _username);
    }
    
    /*//////////////////////////////////////////////////////////////
                        INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_FullFlow_GrantRoleSetJwtUpdateUsername() public {
        // 1. Grant backend role
        profile.grantRole(BACKEND_ROLE, backend);
        assertTrue(profile.hasRole(BACKEND_ROLE, backend));
        
        // 2. Backend sets JWT for user
        vm.prank(backend);
        profile.setJwt(user, TEST_JWT);
        assertEq(profile.jwtTokens(user), TEST_JWT);
        
        // 3. User updates username with valid JWT
        vm.expectEmit(true, false, false, true);
        emit UsernameUpdated(user, TEST_USERNAME);
        
        vm.prank(user);
        profile.setUsername(user, TEST_JWT, TEST_USERNAME);
    }
    
    function test_FullFlow_RevokeRolePreventsJwtUpdate() public {
        // 1. Grant and then revoke backend role
        profile.grantRole(BACKEND_ROLE, backend);
        profile.revokeRole(BACKEND_ROLE, backend);
        assertFalse(profile.hasRole(BACKEND_ROLE, backend));
        
        // 2. Backend can no longer set JWT
        vm.prank(backend);
        vm.expectRevert();
        profile.setJwt(user, TEST_JWT);
    }
    
    function test_FullFlow_MultipleUsersMultipleBackends() public {
        address backend2 = makeAddr("backend2");
        address user2 = makeAddr("user2");
        
        // Grant roles to both backends
        profile.grantRole(BACKEND_ROLE, backend);
        profile.grantRole(BACKEND_ROLE, backend2);
        
        // Backend 1 sets JWT for user 1
        vm.prank(backend);
        profile.setJwt(user, TEST_JWT);
        
        // Backend 2 sets JWT for user 2
        vm.prank(backend2);
        profile.setJwt(user2, DIFFERENT_JWT);
        
        // Both users can update their usernames
        vm.prank(user);
        profile.setUsername(user, TEST_JWT, "user1");
        
        vm.prank(user2);
        profile.setUsername(user2, DIFFERENT_JWT, "user2");
    }
}

