# ZkbServer

##### .env file :

```
RPC=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=***********fcedffecda5c639568a869e90
PORT=5000
API_KEY=$2a$12$pDBhELXDyqW3CQj9PUvTTuITUjNAn61Y7UNlrWfcmrbJZfwko7Dxu
SERVER_MODE=DEV  #There are two options, DEV and PROD, using PROD enables API key authentication.
```

`Note : If (PROD) SERVER_MODE is provided, please provide a (api-key) in the request headers.`

##### Start the server

```
npm start
```
