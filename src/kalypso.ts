import config from './config';
import { KalypsoSdk } from 'kalypso-sdk';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';

const provider = new ethers.JsonRpcProvider(config.RPC);
const wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);

const kalypsoConfig = {
  payment_token: '0x01d84D33CC8636F83d2bb771e184cE57d8356863',
  staking_token: '0xdb69299dDE4A00c99b885D9f8748B2AeD1Fe4Ed4',
  mock_attestation_verifier: '0x1dC40628443D93eA82945a9206e0b527BA3EA028',
  attestation_verifier: '0x63EEf1576b477Aa60Bfd7300B2C85b887639Ac1b',
  transfer_verifier_wrapper: '0x30A5fFf0D0d54fab407a409467835e56830a7471',
  zkb_verifier_wrapper: '0xeE89C22838a691d03fB3b6f47C387d06917C0bBD',
  entity_registry: '0x002064F4d224EA4F90e9A74B5fE3f3812886c6DF',
  generator_registry: '0x5ce3e1010028C4F5687356D721e3e2B6DcEA7C25',
  dispute: '0x41fD92A4Bc74F8B9f46e1fA0825C40aeD5AFDb92',
  proof_market_place: '0x0b6340a893B944BDc3B4F012e934b724c83abF97',
  priority_list: '0xfd94a9Aed9d5f8f00b70A1908378fcc1C4a04B4E',
  input_and_proof_format: '0xBcBaccBA21D0F2089029a3184BcB612e5aFF7911',
  tee_verifier_deployer: '0x5acCC2F599045D13EA03e4c2b7b0Ed9F8C7Fb99C',
  checkInputUrl: config.CHECK_INPUT_URL,
  attestationVerifierEndPoint: 'http://13.201.207.60:1400',
};

export const kalypso = new KalypsoSdk(wallet, kalypsoConfig);

let cachedBlock: string | null = null;
let lastRequestTime: number | null = null;
const cacheDuration = 60 * 1000;

export const latestBlock = async (): Promise<string> => {
  const currentTime = Date.now();

  if (cachedBlock && lastRequestTime && currentTime - lastRequestTime < cacheDuration) {
    return cachedBlock;
  }

  const result = await provider.getBlockNumber();
  cachedBlock = new BigNumber(result).toFixed(0);
  lastRequestTime = currentTime;

  return cachedBlock;
};

let cachedWalletAddress: string | null = null;
export const walletAddress = async (): Promise<string> => {
  if (!cachedWalletAddress) {
    const wa = await wallet.getAddress();
    cachedWalletAddress = wa;
  }

  return cachedWalletAddress;
};

export const getTransactionReceipt = async (transactionHash: string): Promise<null | ethers.TransactionReceipt> => {
  return await provider.getTransactionReceipt(transactionHash);
};

wallet.getAddress().then((data) => {
  console.log('using address: ', data);
});
