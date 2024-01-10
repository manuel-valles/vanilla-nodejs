const yearCreated = new Date().getFullYear().toString();

const environments = {
    staging: {
        httpPort: 3000,
        httpsPort: 3001,
        envName: 'staging',
        hashingSecret: 'thisIsASecret',
        maxChecks: 5,
        twilio: {
            accountSid: '',
            authToken: '',
            fromPhone: ''
        },
        templateGlobals: {
            appName: 'Web App GUI',
            authorName: 'Manu Kem',
            yearCreated,
            baseUrl: 'http://localhost:3000/'
        }
    },
    production: {
        httpPort: 4000,
        httpsPort: 4001,
        envName: 'production',
        hashingSecret: 'thisIsAlsoASecret',
        maxChecks: 5,
        twilio: {
            accountSid: '',
            authToken: '',
            fromPhone: ''
        },
        templateGlobals: {
            appName: 'Web App GUI',
            authorName: 'Manu Kem',
            yearCreated,
            baseUrl: 'http://localhost:4000/'
        }
    }
};

const currentEnvironment = process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : '';

module.exports = environments[currentEnvironment] ?? environments.staging;
