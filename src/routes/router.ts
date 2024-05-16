import express from "express";
import cors from "cors";
import { prover_router } from "../routes/Prover/Prover";

export const app = express();
app.use(cors());
app.use(express.json());

// Prover APIs for Zkbob
app.use("", prover_router);
