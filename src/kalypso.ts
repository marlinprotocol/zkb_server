import { createAsk, approveRewardTokens,getPlatformFee, encryptDataWithRSAandAES, base64ToHex, getProof } from "kalypso-sdk";
import { ethers } from "ethers";
import * as fs from "fs";

type createAskAndGetProofParams = {
    pub : any,
    sec : any
}

export const createAskAndGetProof = async (createAskAndGetProofParams:createAskAndGetProofParams) => {
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

    const proofMarketPlaceAddress = "0x57d8B74EB5c758C3D6809038E714A1c76c938076";

    const reward = "1000000000000000";

    let inputbytes_length = inputBytes.length;
    let platformFee = await getPlatformFee({
      proofMarketPlaceAddress,
      wallet,
      inputbytes_length
    })

    //Approve token for rewards
    const firstTokenApproval = await approveRewardTokens({
      proofMarketPlaceAddress,
      tokenContractAddress: "0x4935ea37F0ADd47B9567A36D0806a28459761b60",
      reward,
      wallet: wallet,
    });
    console.log("firstTokenApproval txHash : ", firstTokenApproval);

    const secondTokenApproval = await approveRewardTokens({
      proofMarketPlaceAddress,
      tokenContractAddress: "0x27FDcb086Cdb0bCFa40638376CD3CbF5B8c69197",
      reward: platformFee!.toFixed(),
      wallet: wallet,
    });
    console.log("secondTokenApproval txHash : ", secondTokenApproval);

    const publicKey = fs.readFileSync("./src/matching_engine/public_key_2048.pem", "utf-8");
    const secretString = JSON.stringify(secret);

    const result = await encryptDataWithRSAandAES(secretString, publicKey);
    const aclHex = "0x" + base64ToHex(result.aclData);
    const encryptedSecret = "0x" + result.encryptedData;
    
    // Create ASK request
    const askRequest = await createAsk({
      marketId: "0xf9663388e4d44b8ebe5d75c4f47301c5ae26d22ff5471418568538e1b572a374",
      reward,
      expiry: 100000,
      timeTakenForProofGeneration: 100000,
      deadline: 10000,
      proverData: inputBytes,
      proofMarketPlaceAddress,
      inputAndProofFormatContractAddress: "0xA0Fbd852C6226b3E97eA141c72713dCb851DaCdE",
      wallet: wallet,
      secrets: { secret: encryptedSecret, acl: aclHex },
    });
    
    let block_number = askRequest.block_number;
    console.log(`Block number : ${block_number}`);
    if(block_number){
        return await new Promise(resolve => {
        let intervalId = setInterval(async ()=>{
            console.log("\nTrying to fetch proof...")
            let data = await getProof({
                proofMarketPlaceAddress:proofMarketPlaceAddress,
                blockNumber:block_number,
                wallet:wallet
            });
            if(data?.proof_generated){
                console.log(data.message);
                resolve(data.proof);
                clearInterval(intervalId);
            }  else {
                console.log(data?.message);
            }
        },10000);
        });
    }

  } catch (err) {
    console.log(err);
  }
};