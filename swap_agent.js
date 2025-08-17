// agent.js  (run: node agent.js)
// CommonJS version using ethers (no ESM). Approves, simulates, then swaps via Sushi /swap/v7.
// ⚠️ Put your own PRIVATE_KEY and (ideally) a reliable Polygon RPC URL.

const { ethers } = require("ethers");

//https://www.sushi.com/katana/swap?token0=0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36&token1=0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a

// ======= EDIT THESE =======
const RPC_URL = "https://rpc.katana.network"; // or Alchemy: https://polygon-mainnet.g.alchemy.com/v2/<KEY>
const PRIVATE_KEY =
  process.env.PRIVATE_KEY // never commit real keys
const TOKEN_IN = "0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36"; // USDC (Polygon)
const TOKEN_OUT = "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a"; // USDT (Polygon)
const AMOUNT_IN_HUMAN = "0.04"; // human units of TOKEN_IN, e.g. "10" USDC
const MAX_SLIPPAGE = 0.005; // 0.5%
const AUTO = false; // true = poll until balance >= amount
const POLL_MS = 30000;
// ==========================

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const tokenIn = new ethers.Contract(TOKEN_IN, ERC20_ABI, wallet);

async function parseAmount() {
  const dec = await tokenIn.decimals();
  const amountIn = ethers.parseUnits(AMOUNT_IN_HUMAN, dec);
  return { dec, amountIn };
}

async function getQuote(amountIn) {
  const url = new URL(`https://api.sushi.com/swap/v7/747474`);
  url.searchParams.set("tokenIn", TOKEN_IN);
  url.searchParams.set("tokenOut", TOKEN_OUT);
  url.searchParams.set("amount", amountIn.toString()); // smallest units
  url.searchParams.set("maxSlippage", String(MAX_SLIPPAGE));
  url.searchParams.set("sender", wallet.address);
  // If you have an API key: url.searchParams.set("apiKey", "sushi_xxx");

  const res = await fetch(url.toString());
  if (!res.ok)
    throw new Error(`Quote failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.status !== "Success" || !data.tx)
    throw new Error(`Bad quote: ${JSON.stringify(data)}`);

  const tx = data.tx; // { to, from, data, value }
  return {
    to: tx.to,
    from: tx.from,
    data: tx.data,
    value: tx.value ? BigInt(tx.value) : undefined,
  };
}

async function ensureAllowance(spender, needed) {
  const current = await tokenIn.allowance(wallet.address, spender);
  if (current >= needed) return;

  // Some tokens (e.g., USDT) require reset to 0 first
  if (current > 0n) {
    try {
      const r0 = await tokenIn.approve(spender, 0);
      await provider.waitForTransaction(r0.hash, 1);
    } catch (_) {}
  }
  const tx = await tokenIn.approve(spender, needed);
  console.log("Approve tx:", tx.hash);
  await provider.waitForTransaction(tx.hash, 1);
}

async function doSwapOnce() {
  console.log(`Address: ${wallet.address}`);
  console.log("ChainId:", (await provider.getNetwork()).chainId.toString());

  const { dec, amountIn } = await parseAmount();
  const quote = await getQuote(amountIn);

  await ensureAllowance(quote.to, amountIn);

  // simulate low-level call
  await provider.call({
    from: quote.from,
    to: quote.to,
    data: quote.data,
    value: quote.value,
  });

  // send swap
  const tx = await wallet.sendTransaction({
    to: quote.to,
    data: quote.data,
    value: quote.value,
  });
  console.log("Swap tx:", tx.hash);
  const rcpt = await tx.wait();
  console.log("Mined in block:", rcpt.blockNumber);
}

async function runAuto() {
  const { dec, amountIn } = await parseAmount();
  while (true) {
    const bal = await tokenIn.balanceOf(wallet.address);
    const balHuman = ethers.formatUnits(bal, dec);
    console.log(
      `[${new Date().toISOString()}] TOKEN_IN balance: ${balHuman} (need >= ${AMOUNT_IN_HUMAN})`
    );
    if (bal >= amountIn) {
      await doSwapOnce();
      break; // remove if you want continuous operation
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

(async () => {
  if (AUTO) await runAuto();
  else await doSwapOnce();
})().catch((e) => {
  console.error("Error:", e.message || e);
  process.exit(1);
});
