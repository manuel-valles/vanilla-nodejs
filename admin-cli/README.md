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

## How to run the existing app

```bash
NODE_ENV=staging node index.js
```

> NOTE: For more notes related to RESTful APIs please check the [restful-api/README.md](../restful-api/README.md) file.
