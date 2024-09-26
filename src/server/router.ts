import express from 'express';
import cors from 'cors';
import { prover_router } from './Prover';

export const app = express();
app.use(cors());
app.use(express.json());

// Prover APIs for kalypso-server
app.use('', prover_router);
