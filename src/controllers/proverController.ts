import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { PublicAndSecretInputPair } from 'kalypso-sdk/dist/types';
import { Request, Response } from 'express';
import { Semaphore } from 'async-mutex';

import config from '../config';
import { latestBlock, kalypso, walletAddress, getTransactionReceipt } from '../kalypso';

const semaphore = new Semaphore(1);

const createAskAndGetProof = async (input: any, secret: string): Promise<any> => {
  let abiCoder = new ethers.AbiCoder();

  let inputBytes = abiCoder.encode(
    ["uint256[5]"],
    [
      [
        input.root,
        input.nullifier,
        input.out_commit,
        input.delta,
        input.memo,
      ],
    ],
  );

  const secretString = JSON.stringify(secret);

  const assignmentDeadline = new BigNumber(await latestBlock()).plus(config.ASSIGNMENT_DELAY);
  const proofGenerationTimeInBlocks = new BigNumber(await latestBlock()).plus(config.PROOF_GENERATION_DELAY);

  await semaphore.acquire();
  let askRequest: ethers.ContractTransactionResponse;
  try {
    // Create ASK request
    askRequest = await kalypso.MarketPlace().createAsk(
      config.MARKET_ID,
      inputBytes,
      config.PROOF_REWARD.toString(),
      assignmentDeadline.toFixed(0),
      proofGenerationTimeInBlocks.toFixed(0),
      await walletAddress(),
      0, // TODO: keep this 0 for now
      Buffer.from(secretString),
      false
    );
    await askRequest.wait(config.CONFIRMATIONS);
    semaphore.release();
  } catch (ex) {
    console.log(ex);
    semaphore.release();
    throw ex;
  }

  console.log('Ask Request Hash: ', askRequest.hash);

  let receipt = await getTransactionReceipt(askRequest.hash);
  let askId = await kalypso.MarketPlace().getAskId(receipt!);
  console.log('Ask ID :', askId);

  return await new Promise((resolve) => {
    console.log('\nTrying to fetch proof...\n');
    let intervalId = setInterval(async () => {
      let data = await kalypso.MarketPlace().getProofByAskId(askId.toString(), receipt?.blockNumber || 0);
      if (data?.proof_generated) {
        console.log(data.message);
        let abiCoder = new ethers.AbiCoder();
        const decoded = abiCoder.decode(['bytes', 'bytes', 'bytes'], data.proof);

        const inputs = decoded[0];
        const proof_encoded = decoded[1];
        const signature = decoded[2];

        let proof = abiCoder.decode(["uint256[8]"], proof_encoded);

        let formated_proof = {
          a: [proof[0][0].toString(), proof[0][1].toString()],
          b: [
            [proof[0][2].toString(), proof[0][3].toString()],
            [proof[0][4].toString(), proof[0][5].toString()],
          ],
          c: [proof[0][6].toString(), proof[0][7].toString()],
        };

        console.log({ inputs, formated_proof, signature });
        resolve(formated_proof);
        clearInterval(intervalId);
      } else {
        console.log(`Proof not submitted yet for askId : ${askId}.`);
      }
    }, 10000);
  });
};

//Get version
export const getVersion = async (_: Request, res: Response) => {
  return res.status(200).json({
    ref: 'test',
    commitHash: 'test',
  });
};

export const proverEncryptedRequestTx = async (req: Request, res: Response) => {
  const proof = await createEncryptedAskAndGetProof(req.payload_to_process!);

  return res.status(200).send(proof);
};

const createEncryptedAskAndGetProof = async (data: PublicAndSecretInputPair): Promise<any> => {
  const assignmentDeadline = new BigNumber(await latestBlock()).plus(config.ASSIGNMENT_DELAY);
  const proofGenerationTimeInBlocks = new BigNumber(await latestBlock()).plus(config.PROOF_GENERATION_DELAY);

  await semaphore.acquire();
  let askRequest: ethers.ContractTransactionResponse;
  try {
    // Create ASK request
    askRequest = await kalypso.MarketPlace().createAskWithEncryptedSecretAndAcl(
      config.MARKET_ID.toString(),
      data.publicInputs,
      config.PROOF_REWARD.toString(),
      assignmentDeadline.toFixed(0),
      proofGenerationTimeInBlocks.toFixed(0),
      await walletAddress(),
      0, // TODO: keep this 0 for now
      data.encryptedSecret,
      data.acl
    );
    await askRequest.wait(config.CONFIRMATIONS);
    semaphore.release();
  } catch (ex) {
    console.log(ex);
    semaphore.release();
    throw ex;
  }

  console.log('Ask Request Hash: ', askRequest.hash);

  let receipt = await getTransactionReceipt(askRequest.hash);

  let askId = await kalypso.MarketPlace().getAskId(receipt!);
  console.log('Ask ID :', askId);

  return await new Promise((resolve) => {
    console.log('\nTrying to fetch proof...\n');
    let intervalId = setInterval(async () => {
      let data = await kalypso.MarketPlace().getProofByAskId(askId.toString(), receipt?.blockNumber || 0);
      if (data?.proof_generated) {
        console.log(data.message);
        let abiCoder = new ethers.AbiCoder();
        const decoded = abiCoder.decode(['bytes', 'bytes', 'bytes'], data.proof);

        const inputs = decoded[0];
        const proof_encoded = decoded[1];
        const signature = decoded[2];

        let proof = abiCoder.decode(["uint256[8]"], proof_encoded);

        let formated_proof = {
          a: [proof[0][0].toString(), proof[0][1].toString()],
          b: [
            [proof[0][2].toString(), proof[0][3].toString()],
            [proof[0][4].toString(), proof[0][5].toString()],
          ],
          c: [proof[0][6].toString(), proof[0][7].toString()],
        };

        console.log({ inputs, formated_proof, signature });
        resolve(formated_proof);
        clearInterval(intervalId);
      } else {
        console.log(`Proof not submitted yet for askId : ${askId}.`);
      }
    }, 10000);
  });
};

export const proveTransaction = async (req: Request, res: Response) => {
  const publicInput = req.body?.public; //middleware ensures it
  const secretInput = req.body?.secret; // middleware ensure it

  const proof = await createAskAndGetProof(publicInput, secretInput);
  res.status(200).send(proof);
};
