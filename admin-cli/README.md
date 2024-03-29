# Admin CLI

CLI using an event-driven design pattern.

## Use Case

The app will respond to a number of requests (inputs) by an admin user.

## Inputs

- `exit`: kill the app
- `man`/`help`: prompt help commands
- `stats`: status of the system
- `list users`
- `more user info --{userId}`
- `list checks`
- `list checks --up`
- `list checks --down`
- `more check info --{checkId}`
- `list logs`
- `more log info --{logId}`

## Run the Existing App

```bash
NODE_ENV=staging node index.js
```

> NOTE: For more notes related to RESTful APIs please check the [restful-api/README.md](../restful-api/README.md) file.

## Run Tests

```bash
node test
```

## Run Performance Test

- Run the app in performance mode:

```bash
NODE_ENV=staging NODE_DEBUG=performance node .
```

- Make a request to the API:

```bash
curl --location 'localhost:3000/api/tokens' \
--data '{
    "phone":"1234567891",
    "password": "superSecret"
}'
```

- Output:

```bash
PERFORMANCE 10368: Beginning to end 2.9969610003754497
PERFORMANCE 10368: Validating user inputs 0.18770300038158894
PERFORMANCE 10368: User lookup 1.4989050002768636
PERFORMANCE 10368: Password hashing 0.26225699996575713
PERFORMANCE 10368: Token data creation 0.2491029999218881
PERFORMANCE 10368: Token storing 0.7726020002737641
```

## Run App Using a Cluster

The app can be run using a cluster to take advantage of multi-core systems.

```bash
node index-cluster.js
```

## Using Child Processes

Another powerful feature of Node.js is the ability to create child processes. This allows you to execute other scripts or commands in parallel. An example can be found in the [cli.js](./lib/cli.js) file.

## Using the HTTP/2 Module

You can use the `HTTP/2` module to create a secure and efficient server. An example can be found in the [misc](./misc) directory, where you will need to run two terminal windows to run the server and the client:

- `node misc/http2-server.js`
- `node misc/http2-client.js`

## Using VM Module

You can use the `vm` module to run code within a secure environment. An example can be found in the [misc](./misc) directory, where you will need to run the following command:

```bash
node misc/vm.js
```

## Using UDP/Datagram Sockets

You can use the `dgram` module to create a UDP server and client. An example can be found in the [misc](./misc) directory, where you will need to run two terminal windows to run the server and the client:

- `node misc/udp-server.js`
- `node misc/udp-client.js`

## Using Net Module

You can use the `net` module to create a TCP server and client. An example can be found in the [misc](./misc) directory, where you will need to run two terminal windows to run the server and the client:

- `node misc/net-server.js`
- `node misc/net-client.js`

## Using TLS/SSL

You can use the `tls` module to create a secure server and client. An example can be found in the [misc](./misc) directory, where you will need to run two terminal windows to run the server and the client:

- `node misc/tls-server.js`
- `node misc/tls-client.js`

## Using REPL

You can use the `repl` module to create a `Read-Eval-Print-Loop`. An example can be found in the [misc](./misc) directory, where you will need to run the following command:

```bash
node misc/repl.js
```
