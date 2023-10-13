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

const kalypsoConfig: KalspsoConfig = {
  "paymentToken": "0x746F190DDaa001D2E42D768FFE46afD1720Cc493",
  "platformToken": "0xA713CB10e34EE0B1dD07af2E965602C118CD7be7",
  "generatorRegistry": "0x82CeA7f50819e488C8D5C6D5D142d8a5e0A7b056",
  "attestationVerifier": "0xa60E856846bF736D0519ea0d38d2837a554F7862",
  "EntityRegistry": "0x6977Fc08E821e479e9BA00b2d37Ba9b85FCC0985",
  "proofMarketPlace": "0x83D452dD497c4Fd01a8e5531F336D084663Df0B1",
  "transferVerifierWrapper": "0x87B34616819539d4A9517b26be8114CC1425134A",
  "zkbVerifierWrapper": "0xe979d1CDfF44B1D533D77A5DA8eAbAdc3057d829",
  "priorityList": "0xd271FFD856d25099965AaD15A5d8Db4E3A954738",
  "inputAndProofFormat": "0xDB451516a135f76aADb2168fA5E1d4cA263B05b7"
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