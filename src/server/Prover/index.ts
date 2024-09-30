import express from 'express';
import { getVersion, proveTransaction, proverEncryptedRequestTx } from '../../controllers';
import { 
  validateApiSecret, 
  validateProveTxPayload, 
  encryptedSecretMiddlesWares 
} from '../../middleware';

export const prover_router = express.Router();

//Version check
prover_router.get('/version', validateApiSecret, getVersion);

//Prove Transaction public
prover_router.post('/proveTx', validateApiSecret, validateProveTxPayload, proveTransaction);

//Prove Encrypted Request Transaction public
prover_router.post(
  '/proverEncryptedRequestTx',
  validateApiSecret,
  encryptedSecretMiddlesWares.validateProveEncryptedTxPayload,
  encryptedSecretMiddlesWares.verifyEncryptedInputPayload,
  proverEncryptedRequestTx
);
