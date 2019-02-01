// Load module
var mysql = require('mysql');
// Initialize pool
var pool      =    mysql.createPool({
    connectionLimit : 20, //important
    acquireTimeout : 10000,
    host     : '129.232.215.194',
    user     : 'elecdbhb_siteusr',
    port      : 3306,
    password : 'TheMostAmazingPasswordEver@1985',
    database : 'elecdbhb_idropwaterdb',
    debug    :  false
});

module.exports = pool;