import express from "express";
import {
  getVersion,
  proveTransaction,
  proveEncyprtedTransaction,
} from "../../controllers/proverControllers/proverController";
import { validateApiSecret } from "../../middleware/authHelper";

export const prover_router = express.Router();

//Version check
prover_router.get("/version", validateApiSecret, getVersion);

//Prove Transaction
prover_router.post("/proveTx", validateApiSecret, proveTransaction);

//Prove Transaction
prover_router.post("/proveEncyprtedTx", validateApiSecret, proveEncyprtedTransaction);
