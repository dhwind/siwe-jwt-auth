import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { SiweMessage } from "siwe";
import "./App.css";
import AuthorizedUserProfileABI from "./contracts/AuthorizedUserProfile.json";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Message {
  text: string;
  type: "info" | "success" | "error";
}

function App() {
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [userData, setUserData] = useState<{
    username: string;
    publicAddress: string;
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [accessToken, setAccessToken] = useState<string>("");
  const [message, setMessage] = useState<Message>({ text: "", type: "info" });
  const [apiUrl, setApiUrl] = useState("http://localhost:3000");
  const [contractAddress, setContractAddress] = useState(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );
  const [isConnected, setIsConnected] = useState(false);

  const addMessage = (
    text: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    setMessage({ text, type });
  };

  const clearMessages = () => {
    setMessage({ text: "", type: "info" });
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found. Please install MetaMask.");
      }

      if (isConnected) {
        // Disconnect
        setSigner(null);
        setUserAddress("");
        setUserData(null);
        setAccessToken("");
        setIsConnected(false);

        await fetch(`${apiUrl}/auth/sign-out`, {
          method: "POST",
          credentials: "include",
        });

        addMessage("Disconnected from wallet", "info");

        return;
      }

      // Connect to MetaMask
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const address = await web3Signer.getAddress();

      console.log("address", address);

      setSigner(web3Signer);
      setUserAddress(address);
      setIsConnected(true);
      addMessage(`Connected to wallet: ${address}`, "success");
    } catch (error: any) {
      addMessage(`Connection error: ${error.message}`, "error");
    }
  };

  const signInWithEthereum = async () => {
    try {
      if (!signer || !userAddress) {
        throw new Error("Please connect your wallet first");
      }

      clearMessages();
      addMessage("Starting SIWE authentication...", "info");

      const domain = window.location.hostname;
      const origin = window.location.origin;

      // Generate a random nonce (in production, get this from backend)
      const nonce = await fetch(
        `${apiUrl}/auth/nonce?address=${userAddress}`
      ).then((res) => res.json().then((data) => data.nonce));

      // Create SIWE message
      const chainId = (await signer.provider.getNetwork()).chainId;
      const siweMessage = new SiweMessage({
        domain: domain,
        address: userAddress,
        statement: "Sign in with Ethereum to the test app.",
        uri: origin,
        version: "1",
        chainId: Number(chainId),
        nonce: nonce,
      });

      const message = siweMessage.prepareMessage();
      addMessage("Generated SIWE message", "info");

      // Sign the message
      addMessage("Please sign the message in MetaMask...", "info");
      const signature = await signer.signMessage(message);
      addMessage("Message signed successfully!", "success");

      // Send to backend
      addMessage("Sending to backend...", "info");
      const response = await fetch(`${apiUrl}/auth/sign-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
        },
        credentials: "include",
        body: JSON.stringify({
          nonce,
          message: message,
          signature: signature,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setAccessToken(result.accessToken);
        addMessage("✅ Sign-in successful!", "success");
      } else {
        addMessage(
          `❌ Sign-in failed: ${result.message || "Unknown error"}`,
          "error"
        );
      }
    } catch (error: any) {
      addMessage(`Sign-in error: ${error.message}`, "error");
    }
  };

  const refreshToken = async () => {
    try {
      addMessage("Refreshing access token...", "info");

      const response = await fetch(`${apiUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        setAccessToken(result.accessToken);
        addMessage("✅ Token refreshed successfully!", "success");
      } else {
        addMessage(
          `❌ Token refresh failed: ${result.message || "Unknown error"}`,
          "error"
        );
      }
    } catch (error: any) {
      addMessage(`Refresh error: ${error.message}`, "error");
    }
  };

  const updateUserData = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userData) {
      throw new Error("No user data available. Please fetch user data first.");
    }

    if (!signer) {
      throw new Error("Please connect your wallet first.");
    }

    if (!accessToken) {
      throw new Error("Please sign in first to get JWT token.");
    }

    try {
      addMessage("Calling smart contract to update username...", "info");

      // Create contract instance
      const contract = new ethers.Contract(
        contractAddress,
        AuthorizedUserProfileABI,
        signer
      );

      // Call setUsername on the smart contract
      // setUsername(address user, string memory jwt, string memory newUsername)
      addMessage("Please confirm the transaction in MetaMask...", "info");

      const tx = await contract.setUsername(
        userAddress,
        accessToken,
        userData.username
      );

      addMessage("Transaction submitted! Waiting for confirmation...", "info");

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      addMessage(
        `✅ Username updated on blockchain!<br/>Transaction: ${receipt.hash}<br/>Block: ${receipt.blockNumber}`,
        "success"
      );

      // Refresh user data from backend after blockchain update
      setTimeout(() => showUserData(), 2000);
    } catch (error: any) {
      if (error.code === "ACTION_REJECTED") {
        addMessage("❌ Transaction rejected by user", "error");
      } else if (error.message.includes("InvalidJwt")) {
        addMessage(
          "❌ Invalid JWT token. Please sign in again to get a fresh token.",
          "error"
        );
      } else {
        addMessage(
          `❌ Update username error: ${error.message || error}`,
          "error"
        );
      }
    }
  };

  const showUserData = async () => {
    try {
      if (!accessToken) {
        throw new Error("No access token available. Please sign in first.");
      }

      addMessage("Fetching user data...", "info");

      const response = await fetch(`${apiUrl}/user/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        addMessage("✅ User data fetched successfully!", "success");
        setUserData(result);
      } else {
        setUserData(null);
        addMessage(
          `❌ User data fetch failed: ${result.message || "Unknown error"}`,
          "error"
        );
      }
    } catch (error: any) {
      setUserData(null);
      addMessage(`User data fetch error: ${error.message}`, "error");
    }
  };

  // Check if already connected on load
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.log("No existing connection");
        }
      }
    };
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
      <div className="container">
        <h1>🔐 SIWE Authentication Test</h1>

        <div className={`status ${isConnected ? "connected" : "disconnected"}`}>
          Status:{" "}
          {isConnected
            ? `Connected (${userAddress.slice(0, 6)}...${userAddress.slice(
                -4
              )})`
            : "Not connected"}
        </div>

        {isConnected && (
          <div className="info">
            <strong>Connected Wallet:</strong> {userAddress}
          </div>
        )}

        <div className="button-group">
          <button className="button" onClick={connectWallet}>
            {isConnected ? "Disconnect" : "Connect Wallet"}
          </button>
          <button
            className="button"
            onClick={signInWithEthereum}
            disabled={!isConnected}
          >
            Sign In with Ethereum
          </button>
          <button
            className="button"
            onClick={refreshToken}
            disabled={!isConnected || !accessToken}
          >
            Refresh Token
          </button>
          <button
            className="button"
            onClick={showUserData}
            disabled={!isConnected || !accessToken}
          >
            Show User Data
          </button>
        </div>

        <div className="messages">
          <div
            className={message.type}
            dangerouslySetInnerHTML={{ __html: message.text }}
          />
          {userData && (
            <div className="info">
              <h3>User Data:</h3>
              <form onSubmit={updateUserData} className="user-form">
                <div>
                  <strong>Username:</strong>{" "}
                  <input
                    type="text"
                    value={userData.username}
                    onChange={(e) =>
                      setUserData({ ...userData, username: e.target.value })
                    }
                  />
                </div>
                <div>
                  <strong>Public Address:</strong>{" "}
                  <input type="text" value={userData.publicAddress} readOnly />
                </div>
                <div>
                  <strong>Created At:</strong>{" "}
                  <input
                    type="text"
                    value={new Date(userData.createdAt).toLocaleString()}
                    readOnly
                  />
                </div>
                <div>
                  <strong>Updated At:</strong>{" "}
                  <input
                    type="text"
                    value={new Date(userData.updatedAt).toLocaleString()}
                    readOnly
                  />
                </div>
                <button className="button" type="submit">
                  Update User Data
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="config">
          <h3>Configuration</h3>
          <div>
            <label htmlFor="apiUrl">Backend URL:</label>
            <input
              type="text"
              id="apiUrl"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="contractAddress">Contract Address:</label>
            <input
              type="text"
              id="contractAddress"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
            />
          </div>
        </div>

        {accessToken && (
          <div className="token-display">
            <h3>Access Token</h3>
            <code>{accessToken}</code>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
