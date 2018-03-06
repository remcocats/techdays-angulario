var express = require('express');
var proxy = require('http-proxy-middleware');

var app = express();

app.use('/api', proxy({target: 'http://localhost:8080', ws: true, changeOrigin: true}));
app.use('/', proxy({target: 'http://localhost:4200', changeOrigin: true}));
app.listen(80);

