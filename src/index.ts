import { createAskAndGetProof } from "./kalypso";

const dotenv = require("dotenv")
const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 
app.use(express.json());

dotenv.config();

//Version check
app.get('/version', (req:any, res:any) => {
    try{
        res.status(200).json({
            ref: "test",
            commitHash: "test"
        })
    }catch(error){
        console.log(error);
    }
});

//Prove Transaction
app.post('/proveTx',async(req:any,res:any)=>{
    try {
        let public_input = req.body?.public;
        let secret_input = req.body?.secret;
        let proof = await createAskAndGetProof({
            pub:public_input,
            sec:secret_input
        })
        console.log(proof)
        res.status(200).send(proof);
    } catch (error) {
        console.log(error)
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Example app listening on port ${process.env.PORT}`)
})