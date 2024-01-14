const app = {};

app.config = {
    sessionToken: false
};

// AJAX Client (for RESTful API)
app.client = {};

app.client.request = (headers, path, method, queryStringObject, payload, callback) => {
    const allowMethods = ['POST', 'GET', 'PUT', 'DELETE'];

    // Set defaults
    headers = typeof (headers) === 'object' && headers !== null ? headers : {};
    path = typeof (path) === 'string' ? path : '/';
    method = typeof (method) === 'string' && allowMethods.includes(method.toUpperCase()) ? method.toUpperCase() : 'GET';
    queryStringObject = typeof (queryStringObject) === 'object' && queryStringObject !== null ? queryStringObject : {};
    callback = typeof (callback) === 'function' && callback;

    // Add each key and value to the path
    let requestUrl = `${path}?`;
    Object.keys(queryStringObject).forEach((key) => requestUrl += `${key}=${queryStringObject[key]}&`);
    requestUrl = requestUrl.slice(0, -1);

    // Create the request
    const xhr = new XMLHttpRequest();
    xhr.open(method, requestUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Add each header to the request
    Object.keys(headers).forEach((key) => xhr.setRequestHeader(key, headers[key]));
    if (app.config.sessionToken) xhr.setRequestHeader('token', app.config.sessionToken.id);

    // Handle the response when it comes back
    xhr.onreadystatechange = () => {
        const { readyState, status, responseText } = xhr;
        if (readyState === XMLHttpRequest.DONE) {
            if (callback) {
                try {
                    const parsedResponse = JSON.parse(responseText);
                    callback(status, parsedResponse);
                } catch (e) {
                    callback(status, false);
                }
            }
        }
    };

    // Send the payload as JSON
    const payloadString = JSON.stringify(payload);
    xhr.send(payloadString);
};

// Bind the forms
app.bindForms = () => {
    document.querySelector('form').addEventListener('submit', (event) => {
        // Stop it from submitting
        event.preventDefault();

        const { id: formId, action: path, method, elements } = event.target;
        const errorSelector = `#${formId} .formError`;

        // Hide the error message if a previous error exists
        document.querySelector(errorSelector).style.display = 'none';

        // Turn the inputs into a payload
        const payload = {};
        Array.from(elements).forEach(({ type, checked, value, name }) => {
            if (type !== 'submit') {
                payload[name] = type === 'checkbox' ? checked : value;
            }
        })

        // Call the API Client
        app.client.request(undefined, path, method.toUpperCase(), undefined, payload, (statusCode, responsePayload) => {
            if (statusCode === 200) return app.formResponseProcessor(formId, payload, responsePayload);

            // Set the formError field with the error text and show it
            document.querySelector(errorSelector).innerHTML = typeof (responsePayload.Error) === 'string' ? responsePayload.Error : 'An error has occurred, please try again';;
            document.querySelector(errorSelector).style.display = 'block';
        });
    });
};

app.formResponseProcessor = (formId, requestPayload, responsePayload) => {
    const functionToCall = false;
    if (formId === 'accountCreate') {
        // TODO: Do something
        console.log('accountCreate');
    }
};

// Bootstrap the app
app.init = () => app.bindForms();

// Initialize the app every time the page loads
window.onload = () => app.init();
