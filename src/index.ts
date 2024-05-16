import dotenv from "dotenv";
import { app } from "./routes/router";

dotenv.config();

if (process.env.RPC == null || process.env.RPC == undefined) {
  throw Error("RPC not found in .env file");
}

if (process.env.SERVER_MODE == null || process.env.SERVER_MODE == undefined) {
  throw Error("SERVER_MODE not found in .env file");
}

if (process.env.PRIVATE_KEY == null || process.env.PRIVATE_KEY == undefined) {
  throw Error("PRIVATE_KEY not found in .env file");
}

if (process.env.PORT == null || process.env.PORT == undefined) {
  throw Error("PORT not found in .env file");
}

if (process.env.API_KEY == null || process.env.API_KEY == undefined) {
  throw Error("API_KEY not found in .env file");
}

app.listen(process.env.PORT, () => {
  console.log(
    `kalypso-server delegated server running on port : ${process.env.PORT}`
  );
});
