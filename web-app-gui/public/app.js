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

app.bindLogoutButton = () => {
    document.getElementById('logoutButton').addEventListener('click', (event) => {
        // Stop it from redirecting
        event.preventDefault();
        // Log the user out
        app.logUserOut();
    });
};

app.logUserOut = () => {
    // Get the current token ID
    const tokenId = typeof (app.config.sessionToken.id) === 'string' && app.config.sessionToken.id;
    if (!tokenId) return;

    // Delete the token and redirect the user 
    app.client.request(undefined, 'api/tokens', 'DELETE', { id: tokenId }, undefined, () => {
        app.setSessionToken(false);
        window.location = '/session/deleted';
    });
};

// Bind the forms
app.bindForms = () => {
    const allForms = document.querySelectorAll("form");
    if (!allForms.length) return;

    allForms.forEach((form) => form.addEventListener('submit', (event) => {
        // Stop it from submitting
        event.preventDefault();

        const { id: formId, action: path, elements } = event.target;
        let method = event.target.method.toUpperCase();
        const errorSelector = `#${formId} .formError`;
        const successSelector = `#${formId} .formSuccess`;

        // Hide the error messages if they are currently shown
        if (document.querySelector(errorSelector)) document.querySelector(errorSelector).style.display = 'none';
        if (document.querySelector(successSelector)) document.querySelector(successSelector).style.display = 'none';

        // Turn the inputs into a payload
        const payload = {};
        Array.from(elements).forEach(({ type, checked, classList, value, name }) => {
            if (type !== 'submit') {
                // Determine class of element and set value accordingly
                const classOfElement = typeof (classList.value) == 'string' && classList.value.length > 0 ? classList.value : '';
                const valueOfElement = type == 'checkbox' && classOfElement.indexOf('multiselect') === -1 ? checked : classOfElement.indexOf('intval') == -1 ? value : parseInt(value);
                // When using HTML forms, browsers typically only support GET and POST requests
                // Override the method of the form if the input's name is _method (for PUT and DELETE requests)
                if (name === '_method') {
                    method = valueOfElement
                } else {
                    // Create an payload field named "method" if the elements name is actually "httpMethod"
                    if (name === 'httpMethod') {
                        name = 'method';
                    }
                    // If the element has the class "multiselect", add its value(s) as array elements
                    if (classOfElement.indexOf('multiselect') > -1) {
                        if (checked) {
                            payload[name] = typeof (payload[name]) == 'object' && payload[name] instanceof Array ? payload[name] : [];
                            payload[name].push(valueOfElement);
                        }
                    } else {
                        payload[name] = valueOfElement;
                    }

                }
            }
        });

        // Use queryStringObject if method is DELETE
        const queryStringObject = method === 'DELETE' ? payload : {};

        // Call the API Client
        app.client.request(undefined, path, method, queryStringObject, payload, (statusCode, responsePayload) => {
            if (statusCode === 200) return app.formResponseProcessor(formId, payload, responsePayload);
            if (statusCode === 403) return app.logUserOut();

            // Set the formError field with the error text and show it
            document.querySelector(errorSelector).innerHTML = typeof (responsePayload.Error) === 'string' ? responsePayload.Error : 'An error has occurred, please try again';;
            document.querySelector(errorSelector).style.display = 'block';
        });
    }));
};

app.formResponseProcessor = (formId, requestPayload, responsePayload) => {
    const functionToCall = false;
    const { phone, password } = requestPayload;
    if (formId === 'accountCreate') {
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
    if (formId === 'sessionCreate') {
        app.setSessionToken(responsePayload);
        window.location = '/checks/all';
    }

    // If forms saved successfully and they have success messages, show them
    const formsWithSuccessMessages = ['accountEdit1', 'accountEdit2'];
    const successSelector = `#${formId} .formSuccess`;
    if (formsWithSuccessMessages.indexOf(formId) > -1) {
        document.querySelector(successSelector).style.display = 'block';
    }

    // Redirect to account deleted page after successful account deletion
    if (formId === 'accountEdit3') {
        app.logUserOut(false);
        window.location = '/account/deleted';
    }

    // Redirect to all checks page after successful check creation
    if (formId === 'checksCreate') {
        window.location = '/checks/all';
    }
};

app.getSessionToken = () => {
    const tokenString = localStorage.getItem('token');
    if (typeof (tokenString) !== 'string') return false;

    try {
        const token = JSON.parse(tokenString);
        app.config.sessionToken = token;
        app.setLoggedInClass(typeof token === 'object')
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
    app.setLoggedInClass(typeof (token) === 'object')
}

app.renewToken = (callback) => {
    const currentToken = typeof (app.config.sessionToken) === 'object' && app.config.sessionToken;
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
            app.setSessionToken(responsePayload);
            callback(true);
        });
    });
};

app.loadDataOnPage = () => {
    // Get the current page from the body class
    const bodyClasses = document.querySelector('body').classList;
    const primaryClass = typeof (bodyClasses[0]) === 'string' && bodyClasses[0];

    if (primaryClass === 'accountEdit') app.loadAccountEditPage();
};

app.loadAccountEditPage = () => {
    // Get the phone number from the current token, or log the user out if none is there
    const phone = typeof (app.config.sessionToken.phone) === 'string' && app.config.sessionToken.phone;

    if (!phone) return app.logUserOut();

    const queryStringObject = { phone };

    app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, (statusCode, responsePayload) => {
        if (statusCode !== 200) return app.logUserOut();

        // Put the data into the forms as values where needed
        const { firstName, lastName, phone } = responsePayload;
        document.querySelector('#accountEdit1 .firstNameInput').value = firstName;
        document.querySelector('#accountEdit1 .lastNameInput').value = lastName;
        document.querySelector('#accountEdit1 .displayPhoneInput').value = phone;

        // Put the hidden phone field into both forms
        document.querySelectorAll('input.hiddenPhoneNumberInput').forEach((input) => input.value = phone);
    });
};

// Bootstrap the app
app.init = () => {
    // Bind all form submissions
    app.bindForms();

    // Bind logout logout button
    app.bindLogoutButton();

    // Get the token from local storage
    app.getSessionToken();

    // Renew token every minute
    setInterval(() => app.renewToken((err) => !err && console.log(`Token renewed successfully @${Date.now()}`)), 1000 * 60);

    // Load data on page
    app.loadDataOnPage();
}

// Initialize the app every time the page loads
window.onload = () => app.init();
