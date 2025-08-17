/** @format */

const { ethers } = require("ethers");
const dotenv = require("dotenv");
const UnifiedBridge = require("./Unified.js");

async function bridgeAsset() {
  dotenv.config();
  const networkArray = [
    "https://eth-sepolia.g.alchemy.com/v2/fL9cFKXeu41zVsPZJy1WJ",
    "https://rpc.tatara.katanarpc.com/",
  ];
  const privateKey =
    process.env.PRIVATE_KEY 
  const unifiedBridgeContractAddress =
    "0x528e26b25a34a4a5d0dbda1d57d318153d2ed582";
  const sourceNetwork = networkArray[0]; //cardona

  let destinationNetworkId = 29; //[sepolia, zkEVMCardona, astarZkyoto]
  const destinationAddress = "0x4CbEe7aD42d33e9D3B41e8b6FAcA2f6f173C8A94"; //destinationAddress you would like to receive assets on
  const tokenAddress = "0x0000000000000000000000000000000000000000"; //ERC20 token contract address,
  const tokenAmount = 1000000000000n; //amount of tokens to bridge ()
  const forceUpdateGlobalExitRoot = true; //true if want to update the exit root
  const sourceProvider = new ethers.JsonRpcProvider(`${sourceNetwork}`);
  const permitData = "0x"; //approval of tokens to be spent by the contract on behalf of the user
  const wallet = new ethers.Wallet(privateKey, sourceProvider);

  const bridgeContract = new ethers.Contract(
    unifiedBridgeContractAddress,
    UnifiedBridge,
    wallet
  );
  const txn = await bridgeContract.bridgeAsset(
    destinationNetworkId,
    destinationAddress,
    tokenAmount,
    tokenAddress,
    forceUpdateGlobalExitRoot,
    permitData,
    {
      value: tokenAmount,
    }
  );

  await txn.wait(2);
  const txnHash = txn.hash;
  console.log(`https://sepolia.etherscan.io/${txnHash}`);
}
bridgeAsset();
