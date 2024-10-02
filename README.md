# kalypso-server

## .env file :

```
# Utils
RPC=https://arb-sepolia.g.alchemy.com/v2/****
PRIVATE_KEY=***********fcedffecda5c639568a869e90
PORT=8000
MARKET_ID=7
PROOF_REWARD=14500000000000000000
API_KEY=$2a$12$pDBhELXDyqW3CQj9PUvTTuITUjNAn61Y7UNlrWfcmrbJZfwko7Dxu
SERVER_MODE=DEV  #There are two options, DEV and PROD, using PROD enables API key authentication.
MATCHING_ENGINE_URL="http://get_from_dev"
CHECK_INPUT_URL="http://get_from_dev"
```

`Note : If (PROD) SERVER_MODE is provided, please provide a (api-key) in the request headers.`

## Start the server

```
npm start
```

## Creating ask and getting execution

The proving requests to zkbob can be created in two methods. The first one involves sending `secrets` as plain text to server, whereas second one involes send `secrets` as encrypted inputs to the server.

### 1. Method: POST /proveTx

```
http://localhost:8000/proveTx
```

#### Body (raw)

```
{
    "public": {
        "root": "264788213728069619241111851921906489438189097587452881387720682995263352015",
        "nullifier": "16262454939008220729285921537441320334330234758770259393772360806896176035643",
        "out_commit": "20917908391172521884053148230313204449422558688338602868432842022522663432650",
        "delta": "191561942608236107294793378393788647952342390272950272000",
        "memo": "2109732754415874372326623686167947501292568528630512787557291109233407247572"
        },
    "secret": {...}
}

```

### 2. Method: POST /proveEncryptedTx

```
http://localhost:8000/proveEncryptedTransaction
```

#### Body (raw)

```
{
    "publicInputs" : Uint8Array[....],
    "encryptedSecret: Uint8Array[....],
    "acl" : Uint8Array[...]
}
```

#### How to create encrypted request payload on client side.

On client side, you can generate the encrypted request directly

```

const matchingEngineKey = (
   await kalypso.MarketPlace().readMePubKeyInContract()
  ).toString();
  // this value to fetched on go, or cached

const secretString = JSON.stringify(secret);

const encryptedRequestData = await MarketPlace.createEncryptedRequestData(
    inputBytes,
    Buffer.from(secretString),
    marketId,
    matchingEngineKey,
  );

const payload_to_server = {
    publicInputs: new Uint8Array(encryptedRequestData.publicInputs),
    encryptedSecret:  new Uint8Array(encryptedRequestData.encryptedSecret),
    acl: new Uint8Array(encryptedRequestData.acl)
  }
```

Note: Ensure to check the validity of the encrypted payload. [Code](https://github.com/marlinprotocol/zkb_server/blob/master/src/middleware/encryptedTransactions/index.ts#L8) for reference.

```
const payload_for_verification = {
    publicInputs: Buffer.from(publicInputs),
    encryptedSecret: Buffer.from(encryptedSecret),
    acl: Buffer.from(acl),
  };

  const isValid = await kalypso
    .MarketPlace()
    .verifyEncryptedInputs(payload_for_verification, config.MATCHING_ENGINE_URL, config.MARKET_ID.toString());
  if (!isValid) {
    return res.status(400).send('Request is not valid as per secret enclaves');
  }
```
