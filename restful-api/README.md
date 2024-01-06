# Restful API with NodeJS
This is a simple RESTful API with vanilla NodeJS.

## How to run
```bash
NODE_ENV=staging node index.js
```

## How to test
```bash
curl --location 'localhost:3000/sample' --data 'This is the body'
```

## How to generate SSL certificates
```bash
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
```
Example prompt for localhost:
```
Country Name (2 letter code) [AU]:UK
State or Province Name (full name) [Some-State]:England
Locality Name (eg, city) []:London
Organization Name (eg, company) [Internet Widgits Pty Ltd]:Manu
Organizational Unit Name (eg, section) []:Kem
Common Name (e.g. server FQDN or YOUR name) []:localhost
Email Address []:manukem@gmail.com
```

## How to test HTTPS
```bash
curl -k 'https://localhost:3001/sample' --data 'This is the body'
```
> Note: `-k` is to ignore the self-signed certificate warning. Otherwise, it will throw an error message that indicates that curl is unable to verify the legitimacy of the server because you are using a self-signed certificate. This is expected behavior for self-signed certificates, as they are not signed by a trusted certificate authority.
