# Admin CLI

CLI using an event-driven design pattern.

## Use case

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

## Run the existing app

```bash
NODE_ENV=staging node index.js
```

> NOTE: For more notes related to RESTful APIs please check the [restful-api/README.md](../restful-api/README.md) file.

## Run tests

```bash
node test
```

## Run th performance test

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
