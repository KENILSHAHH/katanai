// check-sepolia-balance.js
// Usage: node check-sepolia-balance.js --amount 0.1 --address 0xYourAddr

const { ethers } = require("ethers");

const FALLBACKS = [
  "https://rpc.sepolia.org",
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://eth-sepolia.g.alchemy.com/v2/mB2yIaHBN1OUSHm3xqDH1",
];

function parseArgs() {
  const a = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < a.length; i += 2) {
    const k = a[i],
      v = a[i + 1];
    if (k === "--amount") out.amount = v;
    if (k === "--address") out.address = v;
  }
  return out;
}

async function tryProvider(urls) {
  let lastErr;
  for (const url of urls) {
    try {
      const p = new ethers.JsonRpcProvider(url);
      await p.getNetwork();
      return p;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No working RPC found");
}

(async () => {
  const { amount, address } = parseArgs();
  if (!amount || !address) {
    console.error(
      "Usage: node check-sepolia-balance.js --amount <ETH> --address 0x..."
    );
    process.exit(1);
  }
  if (!ethers.isAddress(address)) {
    console.error("Invalid Ethereum address.");
    process.exit(1);
  }

  const provider = await tryProvider(FALLBACKS);
  const [net, balWei] = await Promise.all([
    provider.getNetwork(),
    provider.getBalance(address),
  ]);
  const balEth = ethers.formatEther(balWei);

  let needWei;
  try {
    needWei = ethers.parseEther(String(amount));
  } catch {
    console.error("Invalid amount (e.g., 0.25)");
    process.exit(1);
  }

  const verdict = balWei >= needWei ? "SUCCESS" : "NO_FUNDS";

  console.log(verdict);
  console.log(`Connected RPC: ${provider._getConnection().url || "unknown"}`);
  console.log(`Network: chainId=${net.chainId.toString()} (Sepolia=11155111)`);
  console.log(`Address: ${address}`);
  console.log(`Balance: ${balEth} ETH`);
  console.log(`Required: ${amount} ETH`);
})().catch((e) => {
  console.error("Error:", e.message || e);
  process.exit(1);
});
