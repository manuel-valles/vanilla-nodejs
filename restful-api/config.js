const environments = {
    staging: {
        port: 3000,
        envName: 'staging'
    },
    production: {
        port: 4000,
        envName: 'production'
    }
};

const currentEnvironment = process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : '';

module.exports = environments[currentEnvironment] ?? environments.staging;
