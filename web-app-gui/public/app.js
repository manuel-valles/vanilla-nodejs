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
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
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
    const { phone, password } = requestPayload;
    if (formId == 'accountCreate') {
        // Log the user in
        app.client.request(undefined, 'api/tokens', 'POST', undefined, { phone, password }, (newStatusCode, newResponsePayload) => {
            if (newStatusCode !== 200) {
                const errorSelector = `#${formId} .formError`;
                // Set the formError field with the error text and show it
                document.querySelector(errorSelector).innerHTML = 'Sorry, an error has occurred. Please try again';
                document.querySelector(errorSelector).style.display = 'block';

            } else {
                // If successful, set the token and redirect the user
                app.setSessionToken(newResponsePayload);
                window.location = '/checks/all';
            }
        });
    }
    // If login was successful, set the token in local storage and redirect the user
    if (formId == 'sessionCreate') {
        app.setSessionToken(responsePayload);
        window.location = '/checks/all';
    }
};

app.getSessionToken = () => {
    const tokenString = localStorage.getItem('token');
    if (typeof (tokenString) !== 'string') return false;

    try {
        const token = JSON.parse(tokenString);
        app.config.sessionToken = token;
        app.setLoggedInClass(true);
    } catch (e) {
        app.config.sessionToken = false;
        app.setLoggedInClass(false);
    }
}

app.setLoggedInClass = (add) => {
    const target = document.querySelector('body');
    add ? target.classList.add('loggedIn') : target.classList.remove('loggedIn');
}

app.setSessionToken = (token) => {
    app.config.sessionToken = token;
    localStorage.setItem('token', JSON.stringify(token));
    typeof (token) == 'object' ? app.setLoggedInClass(true) : app.setLoggedInClass(false);
}

app.renewToken = (callback) => {
    const currentToken = typeof (app.config.sessionToken) == 'object' && app.config.sessionToken;
    if (!currentToken) {
        app.setSessionToken(false);
        return callback(true);
    }
    const { id } = currentToken;

    // Update the token with a new expiration
    const payload = { id, extend: true };
    app.client.request(undefined, 'api/tokens', 'PUT', undefined, payload, (statusCode, responsePayload) => {
        if (statusCode !== 200) {
            app.setSessionToken(false);
            return callback(true);
        }
        // Get the new token details
        app.client.request(undefined, 'api/tokens', 'GET', { id }, undefined, (statusCode, responsePayload) => {
            if (statusCode !== 200) {
                app.setSessionToken(false);
                return callback(true);
            }
            app.setSessionToken(false);
            callback(true);
        });
    });
};

// Bootstrap the app
app.init = () => {
    // Bind all form submissions
    app.bindForms();

    // Get the token from local storage
    app.getSessionToken();

    // Renew token every minute
    setInterval(() => app.renewToken((err) => !err && console.log(`Token renewed successfully @${Date.now()}`), 60 * 1000));
}

// Initialize the app every time the page loads
window.onload = () => app.init();
