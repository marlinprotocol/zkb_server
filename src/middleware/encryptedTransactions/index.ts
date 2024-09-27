import { Request, Response, NextFunction } from 'express';
import { kalypso } from '../../kalypso';
import config from '../../config';
import { PublicAndSecretInputPair } from 'kalypso-sdk/dist/types';

export * from './proveEncryptedTransactionPayloadCheck';

export const verifyEncryptedInputPayload = async (req: Request, res: Response, next: NextFunction) => {
  const publicInputs = new Uint8Array(Object.values(req.body?.publicInputs || {}).map(Number));
  const encryptedSecret = new Uint8Array(Object.values(req.body?.encryptedSecret || {}).map(Number));
  const acl = new Uint8Array(Object.values(req.body?.acl || {}).map(Number));

  const payload_for_verification = {
    publicInputs: Buffer.from(publicInputs),
    encryptedSecret: Buffer.from(encryptedSecret),
    acl: Buffer.from(acl),
  };

  // TODO: try to migrate this to middlewares
  const isValid = await kalypso
    .MarketPlace()
    .verifyEncryptedInputs(payload_for_verification, config.MATCHING_ENGINE_URL, config.MARKET_ID.toString());
  if (!isValid) {
    return res.status(400).send('Request is not valid as per secret enclaves');
  }

  req.payload_to_process = payload_for_verification;
  next();
};

declare global {
  namespace Express {
    interface Request {
      payload_to_process?: PublicAndSecretInputPair;
    }
  }
}
