"use client";

import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import Web3 from "web3";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { MetamaskAdapter } from "@web3auth/metamask-adapter";
import { SafeFactory, SafeAccountConfig } from "@safe-global/protocol-kit";

const clientId =
  "BJ-uOTw1stDYuZ7PighbkKr9UyR-_nzDmkrM87BbI9GCFb_JG215OCMXmy9-V2hTCTlICGmzP09zHFug0FxwMH4";

const chainConfig = {
  chainId: "0xaa36a7",
  rpcTarget: "https://eth-sepolia.public.blastapi.io",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  displayName: "Sepolia Testnet",
  blockExplorerURL: "https://sepolia.etherscan.io/",
};

// const chainConfig = {
//   chainId: "0x66eee",
//   rpcTarget: "https://sepolia-rollup.arbitrum.io/rpc",
//   chainNamespace: CHAIN_NAMESPACES.EIP155,
//   displayName: "Arbitrum Sepolia Testnet",
//   blockExplorerURL: "https://sepolia.arbiscan.io/",
// };

const metamaskAdapter = new MetamaskAdapter({
  clientId,
  sessionTime: 3600,
  web3AuthNetwork: "sapphire_mainnet",
  chainConfig: chainConfig,
});

const privateKeyProvider = new CommonPrivateKeyProvider({
  config: { chainConfig: chainConfig },
});

const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  privateKeyProvider: privateKeyProvider,
});

web3auth.configureAdapter(metamaskAdapter);

export default function Web3AuthComponent() {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [secondWalletAddress, setSecondWalletAddress] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        await web3auth.initModal();
        setProvider(web3auth.provider);

        if (web3auth.connected) {
          setLoggedIn(true);
        }
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const login = async () => {
    const web3authProvider = await web3auth.connect();
    setProvider(web3authProvider);
    if (web3auth.connected) {
      setLoggedIn(true);
    }
  };

  const getUserInfo = async () => {
    const user = await web3auth.getUserInfo();
    uiConsole(user);
  };

  const logout = async () => {
    await web3auth.logout();
    setProvider(null);
    setLoggedIn(false);
    uiConsole("logged out");
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async () => {
    closeModal();
    await createSafeTransaction();
  };

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSecondWalletAddress(event.target.value);
  };

  const getAccounts = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);
    const address = await web3.eth.getAccounts();
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);
    const address = (await web3.eth.getAccounts())[0];
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address),
      "ether"
    );
    uiConsole(balance);
  };

  const verifySignedMessage = async (
    originalMessage: string,
    signedMessage: string
  ) => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);
    const recoveredAddress = await web3.eth.personal.ecRecover(
      originalMessage,
      signedMessage
    );
    uiConsole(`Recovered Address: ${recoveredAddress}`);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);
    const fromAddress = (await web3.eth.getAccounts())[0];
    const message_to_sign = "Hello World";
    try {
      const signedMessage = await web3.eth.personal.sign(
        message_to_sign as string,
        fromAddress,
        ""
      );
      uiConsole(`Signed Message: ${signedMessage}`);
      await verifySignedMessage(message_to_sign as string, signedMessage);
    } catch (error: any) {
      uiConsole(`Transaction signing failed: ${error.message}`);
    }
  };

  function stringifyWithBigInt(obj: any) {
    return JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
  }

  async function createSafeTransaction() {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);
    const address = (await web3.eth.getAccounts())[0];
    const safeFactory = await SafeFactory.init({ provider: provider });
    uiConsole("signed in with address: ", address);
    uiConsole("current signer user address: ", address);
    uiConsole("secondWalletAddress: ", secondWalletAddress);
    const safeAccountConfig: SafeAccountConfig = {
      owners: [address, secondWalletAddress],
      threshold: 2,
    };
    const nonce = await web3.eth.getTransactionCount(address);
    uiConsole("Nonce: ", nonce.toString());

    const saltNonce = nonce.toString();
    const predictedSafeAddress = await safeFactory.predictSafeAddress(
      safeAccountConfig,
      saltNonce
    );
    uiConsole("Predicted Safe Address: ", predictedSafeAddress);
    try {
      const protocolKitOwner = await safeFactory.deploySafe({
        safeAccountConfig,
        saltNonce: saltNonce,
        callback: (txHash: string) => {
          uiConsole("txHash: ", txHash);
        },
      });
      const safeAddress = await protocolKitOwner.getAddress();
      uiConsole("Your Safe has been deployed:");
      uiConsole(`https://sepolia.etherscan.io/address/${safeAddress}`);
      uiConsole(`https://app.safe.global/sep:${safeAddress}`);
    } catch (error) {
      uiConsole("Error: ", error);
    }
  }

  function uiConsole(...args: any[]): void {
    const consoleElement = document.querySelector("#console");
    if (consoleElement) {
      const newMessage = document.createElement("p");
      newMessage.innerHTML = JSON.stringify(args || {}, null, 2);
      consoleElement.insertBefore(newMessage, consoleElement.firstChild);
    }
    console.log(...args);
  }

  function clearLog() {
    const consoleElement = document.querySelector("#console");
    if (consoleElement) {
      consoleElement.innerHTML = "";
    }
  }

  const loggedInView = (
    <>
      <div className="flex-container">
        <div>
          <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={getAccounts} className="card">
            Get Accounts
          </button>
        </div>
        <div>
          <button onClick={getBalance} className="card">
            Get Balance
          </button>
        </div>
        <div>
          <button onClick={openModal} className="card">
            Create Safe Smart Account
          </button>
          {showModal && (
            <div className="modal">
              <div className="modal-content">
                <h2>Enter Second Wallet Address</h2>
                <i>Signer and 2nd address will be co-owners of safe smart account</i>
                <br />
                <input
                  type="text"
                  value={secondWalletAddress}
                  onChange={handleAddressChange}
                  placeholder="0x..."
                />
                <button onClick={handleSubmit}>Submit</button>
                <button onClick={closeModal}>Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div>
          <button onClick={signMessage} className="card">
            Sign Message
          </button>
        </div>
        <div>
          <button onClick={clearLog} className="card">
            Clear Log
          </button>
        </div>
        <div>
          <button onClick={logout} className="card">
            Log Out
          </button>
        </div>
      </div>
    </>
  );

  const unloggedInView = (
    <button onClick={login} className="card">
      Login
    </button>
  );

  return (
    <div>
      <div className="grid">{loggedIn ? loggedInView : unloggedInView}</div>
      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </div>
  );
}
