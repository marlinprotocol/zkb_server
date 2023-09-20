import { createAsk, approveRewardTokens,getPlatformFee, encryptDataWithRSAandAES, base64ToHex, getProof } from "kalypso-sdk";
import { ethers } from "ethers";
import * as fs from "fs";
import { gzip } from "node-gzip";

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

    const proofMarketPlaceAddress = "0x6595525c6E7036d015dEfa3eD74Fa05065d15205";

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
      tokenContractAddress: "0x8147e610aF918807C393d865F3C26A6d3f41ddAE",
      reward,
      wallet: wallet,
    });
    console.log("firstTokenApproval txHash : ", firstTokenApproval);

    const secondTokenApproval = await approveRewardTokens({
      proofMarketPlaceAddress,
      tokenContractAddress: "0xFC02897B76538F2897e48146453027fFF8338BaA",
      reward: platformFee!.toFixed(),
      wallet: wallet,
    });
    console.log("secondTokenApproval txHash : ", secondTokenApproval);

    const publicKey = fs.readFileSync("./src/matching_engine/public_key_2048.pem", "utf-8");
    const secretString = JSON.stringify(secret);

    const result = await encryptDataWithRSAandAES(secretString, publicKey);
    const aclHex = "0x" + base64ToHex(result.aclData);
    const encryptedSecret = "0x" + result.encryptedData;
    const secretCompressed = await gzip(encryptedSecret);
    
    // Create ASK request
    const askRequest = await createAsk({
      marketId: "0x51cbad9bdb9cfe3bd0a756f90ae4ade99e13bdf22709e734092beaec80c356b2",
      reward,
      expiry: 5000000,
      timeTakenForProofGeneration: 100000,
      deadline: 10000,
      proverData: inputBytes,
      proofMarketPlaceAddress,
      inputAndProofFormatContractAddress: "0x879c498dA74f969112a4f290291A870C9e996730",
      wallet: wallet,
      secrets: { secret: secretCompressed, acl: aclHex },
    });
    
    let block_number = askRequest.block_number;
    console.log(`Block number : ${block_number}`);
    if(block_number){
        console.log("\nTrying to fetch proof...")
        return await new Promise(resolve => {
        let intervalId = setInterval(async ()=>{

            let data = await getProof({
                proofMarketPlaceAddress:proofMarketPlaceAddress,
                blockNumber:block_number,
                wallet:wallet
            });
            if(data?.proof_generated){
                console.log(data.message);
                resolve(data.proof);
                clearInterval(intervalId);
            }
        },10000);
        });
    }

  } catch (err) {
    console.log(err);
  }
};