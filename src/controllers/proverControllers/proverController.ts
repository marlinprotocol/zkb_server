import { KalypsoSdk } from "kalypso-sdk";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import dotenv from "dotenv";

type KalspsoConfig = {
  paymentToken: string;
  platformToken: string;
  generatorRegistry: string;
  attestationVerifier: string;
  EntityRegistry: string;
  proofMarketPlace: string;
  transferVerifierWrapper: string;
  zkbVerifierWrapper: string;
  priorityList: string;
  inputAndProofFormat: string;
}

const kalypsoConfig = {
  "payment_token": "0xDa25fF5adCa83e38CAA78ACC03046C59315457f4",
  "staking_token": "0xb2d1265c3B638958Fd91EefF8267b3dF0b23fF7b",
  "generator_registry": "0xaDF6a4858f22C7fDfc56885E35A9D12E67553d96",
  "attestation_verifier": "0x398d55904A8fFf1cEb2b639cE854fc58c0305515",
  "entity_registry": "0x6CEa4be917D3f58ea19358044A43fE7195c9c047",
  "proof_market_place": "0x5cc413E6eC01Cf923DcBb4E98010DF53686Dd756",
  "transfer_verifier_wrapper": "0xD7996353Bb1312F160f47e2C85174A83D3Ef7Ec6",
  "zkb_verifier_wrapper": "0x4c97BEa5F37B21b3BEa5E6d0316352D4b8eBA20e",
  "priority_list": "0x83C7F3bd2C2313b6FBA7474134461676c0fB32cd",
  "input_and_proof_format": "0xd34748D0614d9bfC7e9011FeEA3AF33651dad066"
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

    let abiCoder = new ethers.AbiCoder();
    let inputBytes = abiCoder.encode(["uint256[5]"], [[input.root, input.nullifier, input.out_commit, input.delta, input.memo]]);

    const reward = "1000000000000000000";

    const kalypso = new KalypsoSdk(wallet, kalypsoConfig);

    const secretString = JSON.stringify(secret);

    const latestBlock = await provider.getBlockNumber();

    const marketId = "0x07b7d625c70be57115ab18fc435ed0253425671cb91bd6547b7defbc75f52082";
    const assignmentDeadline = new BigNumber(latestBlock).plus(10000000000);
    console.log({ latestBlock, assignmentDeadline: assignmentDeadline.toFixed(0) });
    const proofGenerationTimeInBlocks = new BigNumber(10000000000);

    // Create ASK request
    const askRequest = await kalypso
      .MarketPlace()
      .createAsk(
        marketId,
        inputBytes,
        reward,
        assignmentDeadline.toFixed(0),
        proofGenerationTimeInBlocks.toFixed(0),
        await wallet.getAddress(),
        Buffer.from(secretString)
      );
      await askRequest.wait();
      console.log("Ask Request Hash: ", askRequest.hash);
      
      let receipt = await provider.getTransactionReceipt(askRequest.hash);
  
      let askId = await kalypso.MarketPlace().getAskId(receipt!);
      console.log("Ask ID :",askId);
  
      if(askId){
        return await new Promise(resolve => {
          console.log("\nTrying to fetch proof...\n")
          let intervalId = setInterval(async ()=>{
              let data = await kalypso.MarketPlace().getProofByAskId(askId.toString());
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
          },10000);
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