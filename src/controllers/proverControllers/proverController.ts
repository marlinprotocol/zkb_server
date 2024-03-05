import { KalypsoSdk } from "kalypso-sdk";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import dotenv from "dotenv";

type Enclave = {
  url: string;
  utilityUrl: string;
  apikey?: string;
}

type KalspsoConfig = {
  payment_token: string;
  staking_token: string;
  generator_registry: string;
  attestation_verifier: string;
  entity_registry: string;
  proof_market_place: string;
  generatorEnclave?: Enclave;
  matchingEngineEnclave?: Enclave;
  ivsEnclave?: Enclave;
  checkInputUrl: string;
}

const kalypsoConfig: KalspsoConfig = {
  "payment_token": "0x01d84D33CC8636F83d2bb771e184cE57d8356863",
  "staking_token": "0xdb69299dDE4A00c99b885D9f8748B2AeD1Fe4Ed4",
  "generator_registry": "0x6FD6ED78f6D8a04bC9DF9480B4CD4A7E37e885a4",
  "attestation_verifier": "0x3aB3487269206d5f6a10725d4e477BaA3611adcA",
  "entity_registry": "0xc54F0B48727902472e077Ae56b6321c4f2d77aD6",
  "proof_market_place": "0x9db3AF484D362765064854f73d90312e662dB65a",
  "generatorEnclave": {
    "url": "http://43.205.85.160:5000",
    "utilityUrl": "http://43.205.85.160:1500",
    "apikey": "ea35cd66-a0af-418b-9def-f2cb036f4397 "
  },
  "ivsEnclave": {
    "url": "http://43.205.177.43:5000",
    "utilityUrl": "http://43.205.177.43:1500",
    "apikey": "949bc5d2-d2ce-4076-ad42-181f91ff8b79"
  },
  "matchingEngineEnclave": {
    "url": "http://13.201.131.193:5000",
    "utilityUrl": "http://13.201.131.193:1500",
    "apikey": "8b0936cb-036e-4654-94e5-17cb717c58fc"
  },
  "checkInputUrl": "http://43.205.177.43:3030" 
}

dotenv.config();

type createAskAndGetProofParams = {
    pub : any,
    sec : any
}

const createAskAndGetProof = async (createAskAndGetProofParams:createAskAndGetProofParams) => {
  try {
    if (process.env.PRIVATE_KEY == null || process.env.PRIVATE_KEY == undefined) {
      throw new Error("PRIVATE_KEY not found in the .env file. Please make sure to setup environment variables in your project.");
    }

    if (process.env.RPC == null || process.env.RPC == undefined) {
      throw new Error("RPC not found in the .env file. Please make sure to setup environment variables in your project.");
    }

    if(createAskAndGetProofParams.pub == null || createAskAndGetProofParams.pub == undefined){
        throw new Error("Public input not found");
    }

    if(createAskAndGetProofParams.sec == null || createAskAndGetProofParams.sec == undefined){
        throw new Error("Secret input not found");
    }

    let input = createAskAndGetProofParams.pub;
    let secret = createAskAndGetProofParams.sec;

    const provider = new ethers.JsonRpcProvider(process.env.RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("using address", await wallet.getAddress());

    const reward = new BigNumber(10).pow(18).multipliedBy(45).div(10).toFixed(0);

    let abiCoder = new ethers.AbiCoder();
    let inputBytes = abiCoder.encode(["uint256[5]"], [[input.root, input.nullifier, input.out_commit, input.delta, input.memo]]);
  
    const kalypso = new KalypsoSdk(wallet, kalypsoConfig);
  
    const secretString = JSON.stringify(secret);
  
    const latestBlock = await provider.getBlockNumber();
  
    const marketId = "4";
    const assignmentDeadline = new BigNumber(latestBlock).plus(10000000000);
    console.log({ latestBlock, assignmentDeadline: assignmentDeadline.toFixed(0) });
    const proofGenerationTimeInBlocks = new BigNumber(10000000000);
  
    const ivsCheckEciesCheckingKey = await kalypso.MarketPlace().IvsEnclaveConnector().fetchInputVerifierPublicKeys();
  
    const isGoodRequest = await kalypso.MarketPlace().checkInputsAndEncryptedSecretWithIvs(
      marketId,
      inputBytes,
      Buffer.from(secretString),
      kalypso.MarketPlace().IvsEnclaveConnector().checkInputUrl(),
      ivsCheckEciesCheckingKey.data.public_key, // don't use ecies public key here
      ivsCheckEciesCheckingKey.data.ecies_public_key
    );
  
    if (!isGoodRequest) {
      throw new Error("Better not create a request, if it is not provable to prevent loss of funds");
    }
  
    console.log({ isGoodRequest });
  
    // Create ASK request
    const askRequest = await kalypso.MarketPlace().createAsk(
      marketId,
      inputBytes,
      reward,
      assignmentDeadline.toFixed(0),
      proofGenerationTimeInBlocks.toFixed(0),
      await wallet.getAddress(),
      0, // TODO: keep this 0 for now
      Buffer.from(secretString)
    );
    const tx = await askRequest.wait();
    const block_number = tx?.blockNumber;
    console.log("Ask Request Hash: ", askRequest.hash, " at block", block_number);
      
    let receipt = await provider.getTransactionReceipt(askRequest.hash);
    let askId = await kalypso.MarketPlace().getAskId(receipt!);
    console.log("Ask ID :",askId);


    if(askId){
      return await new Promise(resolve => {
        console.log("\nTrying to fetch proof...\n")
        let intervalId = setInterval(async ()=>{
            let data = await kalypso.MarketPlace().getProofByAskId(askId.toString(),block_number!);
            if(data?.proof_generated){
                console.log(data.message);
                let abiCoder = new ethers.AbiCoder(); 
                let proof = abiCoder.decode(
                  ["uint256[8]"],
                    data.proof,
                );
      
                let formated_proof = {
                  "a":[
                    proof[0][0].toString(),
                    proof[0][1].toString(),
                  ],
                  "b":[
                    [
                      proof[0][2].toString(),
                      proof[0][3].toString(),
                    ],
                    [
                      proof[0][4].toString(),
                      proof[0][5].toString(),
                    ]
                  ],
                  "c":[
                    proof[0][6].toString(),
                    proof[0][7].toString(),
                  ]
                }
                resolve(formated_proof);
                clearInterval(intervalId);
            }  else {
                console.log(`Proof not submitted yet for askId : ${askId}.`);
            }
        },5000);
      });
    }

  } catch (err) {
    console.log(err);
  }
};

//Get version
export const getVersion = async(req:any,res:any) => {
    try{
        res.status(200).json({
            ref: "test",
            commitHash: "test"
        })
    }catch(error){
        console.log(error);
    }
}

//Generate Proof for the public and secret input
export const proveTransaction = async(req:any,res:any) => {
    try {
        let public_input = req.body?.public;
        let secret_input = req.body?.secret;
        let proof = await createAskAndGetProof({
            pub:public_input,
            sec:secret_input
        })
        res.status(200).send(proof);
    } catch (error) {
        console.log(error)
    }
}
