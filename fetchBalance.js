// get-balance.js
const { ethers } = require("ethers");

// Paste your Alchemy RPC URL here 👇
const RPC_URL = "https://eth-mainnet.g.alchemy.com/v2/mB2yIaHBN1OUSHm3xqDH1";

const provider = new ethers.JsonRpcProvider(RPC_URL);

async function main() {
  const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; // Example
  const balanceWei = await provider.getBalance(address);
  console.log(`${address} -> ${ethers.formatEther(balanceWei)} ETH`);
}

main().catch(console.error);
