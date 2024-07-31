import Web3AuthComponent from './components/Web3AuthComponent';

export default function Home() {
  return (
    <div className="container">
      <h1 className="title">Web3Auth Metamask & Create Safe Account</h1>
      <i className="note">
        Switch to Sepolia Testnet and refresh to reload the connection (if you happen to change the network while connected via browser)
      </i>
      <Web3AuthComponent />
    </div>
  );
}
