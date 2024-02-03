# Vanilla NodeJS

A series of _NodeJS_ projects **without external libraries**:

- [RESTful API](./restful-api)
- [Web App GUI](./web-app-gui)
- [Admin CLI](./admin-cli/) (this also includes unit and integration tests)

## Generic Notes

- `node inspect` to debug NodeJS code. You can add `debugger` statements in your code to pause execution and inspect the state of your program. Then, you can use:
  - `repl` command to inspect the state of your program
  - `c` command to continue execution
- `node --use-strict` to enable strict mode. Although this is the default in ES6 modules, you can use it to debug old code.
