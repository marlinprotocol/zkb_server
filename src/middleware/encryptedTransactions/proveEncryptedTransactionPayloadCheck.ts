import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const proveTxSchema = z.object({
  publicInputs: z.any(), //TODO defgine the shape of the publicInputs here
  encryptedSecret: z.any(), // TODO define the shape of encryptedSecret here
  acl: z.any(), //TODO define the shape of acl here
});

export const validateProveEncryptedTxPayload = (req: Request, res: Response, next: NextFunction) => {
  const parseResult = proveTxSchema.safeParse(req.body);

  if (!parseResult.success) {
    const errors = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return res.status(400).json({
      message: 'Invalid request .',
      errors: errors,
    });
  }

  // TODO: this will limit the encrypted verification logic, but need a better solution
  req.signer = 'some place holder for encrypted requests';

  next();
};

declare global {
  namespace Express {
    interface Request {
      signer?: string;
    }
  }
}
