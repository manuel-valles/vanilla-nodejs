# Web App GUI with NodeJS

This is an extension of the Restful API to be able to interact with a Web App GUI.

## How to run

```bash
NODE_ENV=staging node index.js
```

> NOTE: For more notes related to RESTful APIs please check the [restful-api/README.md](../restful-api/README.md) file.

## Check the API Client

To check the API Client for RESTful API you can run the following command/s in the browser console:

```javascript
app.client.request(undefined, '/ping', 'GET', undefined, undefined, (statusCode, payload) =>
  console.log(statusCode, payload),
);

app.client.request(undefined, 'api/users', 'GET', undefined, undefined, (statusCode, payload) =>
  console.log(statusCode, payload),
);
```
