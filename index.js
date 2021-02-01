const express = require('express');
const router = require('./api');
const app = express();

app.use('/', router);

app.listen(5000, () => {
    console.log('Server is started')
});