const serverless = require('serverless-http');
const app = require('./app');

// Biến Express app thành handler cho AWS Lambda
module.exports.handler = serverless(app);