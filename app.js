var express = require("express");
var mysql = require('mysql');
var bodyParser = require('body-parser');
var winston = require('winston');
var path = require('path');
var Joi = require('joi');
const helmet = require('helmet')
var app = express();
var nd = new Date();
const v = require('./validator')
//var filename = path.join(__dirname, 'debuglogs/created-logfile.log');
var filename = '/var/www/created-logfile.log'; // + nd.getFullYear() +''+ nd.getMonth()+''+ nd.getDate() + '.log';
process.env.TZ = 'Africa/Johannesburg';
var Busboy = require('busboy');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(helmet());

// app.use(bodyParser.urlencoded({
//   extended: true
// }));

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)(),
        new(winston.transports.File)({
            filename: filename
        })
    ]
});
logger.level = 'debug';
var pool = require('./mysqlConnector');

function doConnectionRelease(connection) {
    if (connection) {
        logger.log('info', 'function-->' + connection.threadId + '|' + 'doConnectionRelease');
        logger.log('debug', 'Releasing id ' + connection.threadId + ' | ' + getTimea());
        logger.log('debug', 'Connection Free state' + pool._freeConnections.indexOf(connection)); // -1
    } else {
        logger.log('info', "No threadId");
        console.log("+++++ connection ++++++", connection);
    }
    if (pool._freeConnections.indexOf(connection) == -1 && connection) {
        connection.release();
    } else {
        logger.log('debug', 'connection already released');
    }
    return
}

function DoSomethingWithLocation(jsondata) {
    logger.log('info', 'function-->DoSomethingWithLocation');
    var str = jsondata.LC;
    var arr = str.split(',');
    var LAT = arr[2];
    var LNG = arr[3];
    logger.log('debug', 'LAT :' + LAT + ' LNG ' + LNG);
    /////////////////
    pool.getConnection(function(err, connection) {
        if (err) {
            doConnectionRelease(connection);
            return;
        }
        var query =
            'update dsd_dispensor_site_detail set dsd_GPS_Var_LAT = "' + LAT + '", dsd_GPS_Var_LONG = "' + LNG + '" where dsd_Dispensor_ID = "' + jsondata.ID + '"';
        logger.log('debug', query);
        connection.query(query, function(err, rows) {
            doConnectionRelease(connection);
            if (err) throw err;
            if (!rows) {
                logger.log('debug', 'updated');
            } else {
                logger.log('debug', 'thats weird', rows);
            }
            return;
        });
        connection.on('error', function(err) {
            logger.log('error', 'This should not happen', {
                'error': err
            });
            return;
        });
    });
    //////////////////
    return;
    //{"LC": "\r\n+UULOC: 07/12/2015,20:28:15.051,-25.8393505,28.3010126,0,4299,0,000,0,2,0,0,0\r\n", "ID": "359394057515292"}
}

function DoSomethingWithCalibration(jsondata) {
    logger.log('info', 'function-->DoSomethingWithCalibration');
    var str = '';
    var calnumber = 0;
    if (jsondata.CAL1 != null) {
        calnumber = 1;
        str = jsondata.CAL1;
    } else if (jsondata.CAL2 != null) {
        calnumber = 2;
        str = jsondata.CAL2;
    } else if (jsondata.CAL3 != null) {
        calnumber = 3;
        str = jsondata.CAL3;
    }
    logger.log('debug', 'calnumber :' + calnumber + ' value ' + str);
    if (str == 0) {
        logger.log('error', 'NOT PROCESSING THIS');
        return;
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            doConnectionRelease(connection);
            return;
        }
        if (calnumber == 1) {
            var query = 'update dsd_dispensor_site_detail set dsd_Cal_Small = ' + str + ' where dsd_Dispensor_ID = "' + jsondata.ID + '"';
        } else if (calnumber == 2) {
            var query = 'update dsd_dispensor_site_detail set dsd_Cal_Medium = ' + str + ' where dsd_Dispensor_ID = "' + jsondata.ID + '"';
        } else if (calnumber == 3) {
            var query = 'update dsd_dispensor_site_detail set dsd_Cal_Large = ' + str + ' where dsd_Dispensor_ID = "' + jsondata.ID + '"';
        }
        connection.query(query, function(err, rows) {
            doConnectionRelease(connection);
            if (err) throw err;
            if (!rows) {
                logger.log('debug', 'updated');
            } else {
                logger.log('debug', 'thats weird', rows);
            }
            return;
        });
        connection.on('error', function(err) {
            logger.log('error', 'This should not happen', {
                'error': err
            });
            return;
        });
    });
    return;
}

function DoSomethingWithVersion(jsondata) {
    logger.log('info', 'function-->DoSomethingWithVersion');
    var str = '';
    str = jsondata.VR;
    logger.log('debug', 'Version ' + str);
    pool.getConnection(function(err, connection) {
        if (err) {
            doConnectionRelease(connection);
            return;
        }
        var query = 'update dsd_dispensor_site_detail set dsd_Version = "' + str + '" where dsd_Dispensor_ID = "' + jsondata.ID + '"';
        connection.query(query, function(err, rows) {
            doConnectionRelease(connection);
            if (err) throw err;
            if (!rows) {
                logger.log('debug', 'updated');
            } else {
                logger.log('debug', 'thats weird', rows);
            }
            return;
        });
        connection.on('error', function(err) {
            logger.log('debug', 'This should not happen', {
                'error': err
            });
            return;
        });
    });
    return;
}

function DoSomethingWithSignal(jsondata) {
    logger.log('info', 'function-->DoSomethingWithSignal');
    var str = '';
    str = jsondata.CSQ;
    logger.log('debug', 'Signal ' + str);
    pool.getConnection(function(err, connection) {
        if (err) {
            doConnectionRelease(connection);
            return;
        }
        var query = 'update dsd_dispensor_site_detail set dsd_Signal = "' + str + '" where dsd_Dispensor_ID = "' + jsondata.ID + '"';
        connection.query(query, function(err, rows) {
            doConnectionRelease(connection);
            if (err) throw err;
            if (!rows) {
                logger.log('debug', 'updated');
            } else {
                logger.log('debug', 'thats weird', rows);
            }
            return;
        });
        connection.on('error', function(err) {
            logger.log('error', 'This should not happen', {
                'error': err
            });
            return;
        });
    });
    return;
}

function DoRemoveHeaders(res, status) {
    res.removeHeader('Connection');
    res.removeHeader('Date');
    res.removeHeader('Transfer-Encoding');
    res.removeHeader('X-Powered-By');
    res.writeHead(status);
    return;
}

function getTimea() {
    return (Math.floor(Date.now() / 1000));
}

function createNewDefaultRouter(connection, ID) {
    logger.log('info', 'function-->' + connection.threadId + '|' + 'createNewDefaultRouter');
    logger.log('debug', 'HEITO');
    var query = 'insert into dsd_dispensor_site_detail (dsd_Dispensor_ID, dsd_Location, dsd_Date_Created, dsd_GPS_LAT,dsd_GPS_LONG,dsd_Test_Unit)' +
        ' values ("' + ID + '",concat("NEW UNIT ",unix_timestamp()), unix_timestamp(),"-26.139263","28.02056",1);';
    logger.log('debug', 'HEITO:' + query);
    connection.query(query, function(err, rows) {
        doConnectionRelease(connection);
        if (err) throw err;
        if (!rows) {
            logger.log('debug', 'problems creating new device');
        } else {
            //TODOlogger.log('debug','rows.insertId ' + rows.insertId);
        }
    });
}

function updatelastcomms(ID, connection) {
    logger.log('info', 'function-->' + 'updatelastcomms');
    /*pool.getConnection(function(err,connection)
    {
      if (err) 
      {
        doConnectionRelease(connection);
        return;
      }*/
    var query = 'update dsd_dispensor_site_detail set dsd_Last_Comms = now() where  dsd_Dispensor_ID = "' + ID + '"';
    logger.log('debug', 'query :' + query);
    connection.query(query, function(err, rows) {
        doConnectionRelease(connection);
        if (!rows) {} else {}
    });
    //});
}

function checkbacklog(req, res, ID, connection) {
    logger.log('info', ' function--> ' + ' checkbacklog ' + ID);
    logger.log('debug', 'connected as id ' + connection.threadId + ' | ' + getTimea());
    logger.log('debug', 'Current ID :' + ID);
    updatelastcomms(ID, connection);
    /* pool.getConnection(function(err,connection)
     {
       if (err) {
         doConnectionRelease(connection);
         return;
       }*/
    var query =
        'select * from dcb_device_command_backlog where  dcb_Sent = 0 and dsd_Entry_Id = (select dsd_Entry_Id from dsd_dispensor_site_detail where dsd_Dispensor_ID = "' + ID + '")';
    logger.log('debug', 'query :' + query);
    connection.query(query, function(err, rows) {
        //doConnectionRelease(connection);
        if (err) throw err;
        if (!rows) {
            doConnectionRelease(connection);
            DoRemoveHeaders(res, 200);
            res.end();
            logger.log('info', '=====OUTGOING:POS=====', {
                time: getTimea()
            });
        } else {
            if (rows.length == 0) {
                doConnectionRelease(connection);
                logger.log('debug', 'No backlog');
                DoRemoveHeaders(res, 200);
                res.end();
                logger.log('info', '=====OUTGOING:POS=====', {
                    time: getTimea()
                });
                return;
            }
            logger.log('debug', 'Sending Backlog Item', {
                'COMMAND': rows[0].dcb_command_packet,
                'rows': rows[0]
            });
            var update =
                'update dcb_device_command_backlog set dcb_Sent = 1, dcb_Date_Updated = unix_timestamp() where dcb_Entry_Id = ' + rows[0].dcb_Entry_Id;
            connection.query(update, function(err, updaterows) {
                doConnectionRelease(connection);
                if (err) throw err;
                if (!rows) {} else {}
            });
            console.log(rows[0].dcb_command_packet);
            var command_packet = rows[0].dcb_command_packet;
            var sent = false;
            DoRemoveHeaders(res, 200);
            res.write(command_packet);
            res.end();
            logger.log('info', '=====OUTGOING:POS=====', {
                time: getTimea()
            });
        }
        return;
    });
    connection.on('error', function(err) {
        doConnectionRelease(connection);
        logger.log('error', 'Error in connection database' + err);
        return;
    });
    /*});*/
}

function handle_database(jsondata, res, req) {
    logger.log('info', 'function-->' + 'handle_database');
    currentID = jsondata.ID;
    pool.getConnection(function(err, connection) {
        if (err) {
            logger.log("in error" + err)
            doConnectionRelease(connection);
            return;
        }
        logger.log('debug', 'connected as id ' + connection.threadId + ' | ' + getTimea());
        logger.log('info', 'Current ID :' + jsondata.ID);
        var query = 'select count(dsd_Entry_Id) as counter from dsd_dispensor_site_detail where dsd_Dispensor_ID = "' + jsondata.ID + '"';
        logger.log('debug', 'query :' + query);
        connection.query(query, function(err, rows) {
            logger.log('debug', 'counter ' + rows[0].counter);
            /*if (err) {
            console.error('Problems: ', err);
            return;
            }*/
            if (!rows) {
                logger.log('debug', 'problems on rows');
            } else {
                logger.log('debug', 'counter ' + rows[0].counter);
                if (rows[0].counter <= 0) {
                    //connection gets terminated within createNewDefaultRouter
                    createNewDefaultRouter(connection, jsondata.ID);
                    return;
                } else {
                    logger.log('debug', 'connected as id ' + connection.threadId + ' | ' + getTimea() + ' | hehehe:' + jsondata.BV);
                    if (jsondata.BV == null) {
                        var query =
                            'insert into ddd_dispensor_dispensing_detail(dsd_Entry_Id,ddd_Cal_Value,ddd_Date_Start,ddd_Duration,ddd_Totaliser,ddd_Reading,ddd_FillType,ddd_Tamper,ddd_Packet_Number,ddd_Error,ddd_Date_Created)' +
                            ' values ((select dsd_Entry_Id from dsd_dispensor_site_detail where dsd_Dispensor_ID = "' + jsondata.ID + '") ,' +
                            '(select dsd_Cal_Small from dsd_dispensor_site_detail where dsd_Dispensor_ID = "' + jsondata.ID + '") ,' +
                            ' from_unixtime(' + jsondata.DT + '),"' + jsondata.PD + '","' +
                            (jsondata.TR) + '","' +
                            jsondata.PR + '","' +
                            jsondata.PT + '","' +
                            jsondata.TF + '","' +
                            jsondata.PCK + '","' +
                            jsondata.EF + '",unix_timestamp())';
                        connection.query(query, function(err, rows) {
                            //if (err) throw err;
                            //TODOlogger.log('debug','rows.insert :' + rows.insertId);
                            return;
                        });
                    } else {
                        var query =
                            'insert into ddd_dispensor_dispensing_detail(dsd_Entry_Id,ddd_Cal_Value,ddd_Date_Start,ddd_Duration,ddd_Totaliser,ddd_Reading,ddd_FillType,ddd_Tamper,ddd_Packet_Number,ddd_Batt_Volt,ddd_Error,ddd_Date_Created)' +
                            ' values ((select dsd_Entry_Id from dsd_dispensor_site_detail where dsd_Dispensor_ID = "' + jsondata.ID + '") ,' +
                            '(select dsd_Cal_Small from dsd_dispensor_site_detail where dsd_Dispensor_ID = "' + jsondata.ID + '") ,' +
                            ' from_unixtime(' + jsondata.DT + '),"' + jsondata.PD + '","' +
                            (jsondata.TR) + '","' +
                            jsondata.PR + '","' +
                            jsondata.PT + '","' +
                            jsondata.TF + '","' +
                            jsondata.PCK + '","' +
                            jsondata.BV + '","' +
                            jsondata.EF + '",unix_timestamp())';
                        connection.query(query, function(err, rows) {
                            logger.log('debug', '===========================>>>' + err);
                            var query =
                                'update dsd_dispensor_site_detail set dsd_Batt_Volt = "' + jsondata.BV + '" where dsd_Dispensor_ID = "' + jsondata.ID + '"';
                            logger.log('debug', query);
                            connection.query(query, function(err1, rows) {
                                logger.log('debug', '===========================<<<' + err1);
                                //if (err) throw err;
                                //TODOlogger.log('debug','rows.insertId : ' + rows.insertId);
                                return;
                            });
                            //TODOlogger.log('debug','rows.insertId : ' + rows.insertId);
                            return;
                        });
                    }
                }
            }
            logger.log('info', 'something happened');
            if (jsondata.TF != 0) {
                var query = 'update dsd_dispensor_site_detail set dsd_Tamper = "' + jsondata.TF + '" where dsd_Dispensor_ID = "' + jsondata.ID + '"';
                connection.query(query, function(err, rows) {
                    doConnectionRelease(connection);
                    if (err) throw err;
                    logger.log('debug', 'tamper logged');
                    return;
                });
            } else {
                var query = 'update dsd_dispensor_site_detail set dsd_Tamper = "' + jsondata.TF + '" where dsd_Dispensor_ID = "' + jsondata.ID + '"';
                connection.query(query, function(err, rows) {
                    doConnectionRelease(connection);
                    if (err) throw err;
                    logger.log('debug', 'tamper logged');
                    return;
                });
            }
        });
        connection.on('error', function(err) {
            logger.log('error', 'Error in connection database');
            return;
        });
        logger.log('info', 'Some Data Came in ', {
            time: getTimea(),
            body: jsondata
        });
        if (pool._freeConnections.indexOf(connection) == -1) {
            if (connection == null) {
                pool.getConnection(function(err, connection) {
                    if (err) {
                        logger.log("in error" + err)
                        doConnectionRelease(connection);
                        return;
                    }
                    checkbacklog(req, res, currentID, connection);
                });
            } else {
                checkbacklog(req, res, currentID, connection);
            }
        } else {
            logger.log('debug', 'connection already released, Trying to do backlog on new connection');
            pool.getConnection(function(err, connection) {
                if (err) {
                    logger.log("in error" + err)
                    doConnectionRelease(connection);
                    return;
                }
                checkbacklog(req, res, currentID, connection);
            });
        }
    });
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

function LogIncomingPackage(jsonData, contentType, IPofClient) {
    // Execute 30000 queries at once...
    pool.getConnection(function(err, connection) {
        if (err) {
            console.log("++++++ err ++++++", err);
            doConnectionRelease(connection);
            return;
        }
        var str;
        if (typeof jsonData == "object" ) {
            jsonData = JSON.stringify(jsonData);
        } 
        str = JSON.stringify(jsonData);
        
        console.log("++++ JSON String ++++", typeof str);
        var query = 'INSERT INTO `idl_incoming_data_log`( `idl_IP`,`idl_Input_Type`, `idl_Data`, `idl_Date_Created`,`idl_ID`) ' +
            ' VALUES ("' + IPofClient + '","' + contentType + '",' + str + ',unix_timestamp(),"' + jsonData.ID + '")';
        console.log(query);
        connection.query(query, function(err, rows) {
            doConnectionRelease(connection);
            if (err) throw err;
            if (!rows) {}
        });
        doConnectionRelease(connection);
        connection.on('error', function(err) {
            doConnectionRelease(connection);
            if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
                // lost due to either server restart, or a
            } else { // connnection idle timeout (the wait_timeout
                logger.log('error', 'LogIncomingPackage error', {
                    'error': err
                }); // server variable configures this)
            }
            return;
        });
    });
}

app.use(function(req, res, next) {
    if (req.is('*/*')) {
        req.text = '';
        req.setEncoding('utf8');
        req.on('data', function(chunk) {
            req.text += chunk
        });
        req.on('end', next);
        next();
    } else {
        next();
    }
});

function validateAndLogUserAgent(userAgent){
  if( userAgent && userAgent.indexOf("UBLOX-HttpClient") === -1 ){
    logger.log('error', userAgent);
    log_error("Invalid Header", userAgent);
  }
}

function validatePayload(req, res, next){
    const schema = Joi.object().keys({
        ID: Joi.number().integer().min(100000000000000).max(999999999999999).required(),
        DT: Joi.number().required(),
        PR: Joi.number().required(),
        TR: Joi.number().required(),
        PCK: Joi.number().required(),
        PD: Joi.number().required(),
        PT: Joi.number().required(),
        TF: Joi.number().required(),
        BV: Joi.number().required(),
        AC: Joi.number().required(),
        EF: Joi.number().required()
    })
    const result = Joi.validate(req.body, schema);
    log_error("Data Validation", result.error);
    logger.log('error', "400 Bad Request");
    logger.log('error', result.error);
    return (result.error === null) ? true: false;
}

function log_error(ErrorType, Description) {
    logger.log('error', 'logging error-->' + 'log_error');
    pool.getConnection(function(err, connection) {
        console.log("++++ err +++++", err);
        var query = "INSERT INTO log_error(`ErrorType`, `Description`, `Created`) VALUES ('"+ErrorType+"', '"+Description+"', now())";
        logger.log('debug', 'query :' + query);
        connection.query(query, function(err, rows) {
            doConnectionRelease(connection);
            if (!rows) {} else {}
        });
    });
}

function insertstr(str, index, value) {
    return str.substr(0, index) + value + str.substr(index);
}

async function getFileData(req, res) {
    var busboy = new Busboy({ headers: req.headers });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
        file.on('data', function(data) {
          str = data.toString("utf-8", 0);
          handlePostData(req, res, str);
          console.log("+++++ data +++++", data.toString("utf-8", 0));
          console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
        });
        file.on('end', function() {
          console.log('File [' + fieldname + '] Finished');
        });
      });
      req.pipe(busboy);
}

/**********
Process Unit Data here
**********/
app.post('/post', async function(req, res) {
    var str = req.body;
    // var result = validatePayload(req, res);
    console.log("++++ header ++++", req.headers["content-type"])
    if ( req.headers["content-type"] != "application/json" ) {
        var fileData = await getFileData(req, res);
    } else {
        handlePostData(req, res, str);
    }
}).setMaxListeners(0);

function handlePostData(req, res, str) {
    validateAndLogUserAgent(req.header('User-Agent'));
    
    logger.log('info', 'function-->' + 'app.post');
    var ipnew = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    logger.log('info', '>>>>INCOMING:POST>>>>', {
        time: getTimea(),
        IP: ipnew,
        body: req.text
    });
    console.log("+++++ STR +++++", str);
    var jsondata = str;
    console.log("+++ JSON DATA ++++", str);
    LogIncomingPackage(jsondata, 'JSON', ipnew);
    var connection = null;
    logger.log('debug', 'Dis net sad ', jsondata.PCK);
    currentID = jsondata.ID;
    if (jsondata.PCK == null) {
        if (jsondata.CSQ != null) {
            DoSomethingWithSignal(jsondata);
            //DoRemoveHeaders(res,200);
            //res.end();
            //logger.log('info', '=====OUTGOING:POS=====', {time : getTimea()});
            logger.log('info', 'Checking Backlog')
            pool.getConnection(function(err, connection) {
                if (err) {
                    doConnectionRelease(connection);
                    return;
                }
                checkbacklog(req, res, currentID, connection);
            });
            return;
        } else if (jsondata.VR != null) {
            DoSomethingWithVersion(jsondata);
            //DoRemoveHeaders(res,200);
            //res.end();
            //logger.log('info', '=====OUTGOING:POS=====', {time : getTimea()});
            logger.log('info', 'Checking Backlog')
            pool.getConnection(function(err, connection) {
                if (err) {
                    doConnectionRelease(connection);
                    return;
                }
                checkbacklog(req, res, currentID, connection);
            });
            return;
        } else if ((jsondata.CAL1 != null) || (jsondata.CAL2 != null) || (jsondata.CAL3 != null)) {
            DoSomethingWithCalibration(jsondata);
            //DoRemoveHeaders(res,200);
            //res.end();
            //logger.log('info', '=====OUTGOING:POS=====', {time : getTimea()});
            logger.log('info', 'Checking Backlog')
            pool.getConnection(function(err, connection) {
                if (err) {
                    doConnectionRelease(connection);
                    return;
                }
                checkbacklog(req, res, currentID, connection);
            });
            return;
        } else if (!jsondata.LC) {
            logger.log('info', 'Responded ', {
                time: getTimea()
            });
            //DoRemoveHeaders(res,200);
            //res.end();
            //logger.log('info', '=====OUTGOING:POS=====', {time : getTimea()});
            logger.log('info', 'Checking Backlog')
            pool.getConnection(function(err, connection) {
                if (err) {
                    doConnectionRelease(connection);
                    return;
                }
                checkbacklog(req, res, currentID, connection);
            });
            return;
        } else {
            DoSomethingWithLocation(jsondata);
            //DoRemoveHeaders(res,200);
            //res.end();
            //logger.log('info', '=====OUTGOING:POS=====', {time : getTimea()});
            logger.log('info', 'Checking Backlog')
            pool.getConnection(function(err, connection) {
                if (err) {
                    doConnectionRelease(connection);
                    return;
                }
                checkbacklog(req, res, currentID, connection);
            });
            return;
        }
    } else {
        logger.log('info', 'starttime ', {
            time: getTimea()
        });
        handle_database(jsondata, res, req);
    }
}
app.get("/get/time", function(req, res) {
    logger.log('info', 'function-->' + 'app.get');
    var ipnew = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    logger.log('info', '>>>>INCOMING:GET>>>>', {
        time: getTimea(),
        IP: ipnew,
        ID: req.query["ID"]
    });
    var json = {};
    if (req.query["fmt"] == "unix") {
        json["DT"] = Math.floor(Date.now() / 1000);
    } else {
        json["DT"] = Date();
    }
    logger.log('debug', 'get time ' + JSON.stringify(json));
    DoRemoveHeaders(res, 200);
    res.write(JSON.stringify(json));
    res.end();
    logger.log('info', '=====OUTGOING:GET=====', {
        time: getTimea()
    });
});
app.get("/get/update", function(req, res) {
    logger.log('info', 'function-->' + 'app.get');
    var ipnew = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    logger.log('info', '>>>>INCOMING:GET>>>> UPDATE', {
        time: getTimea(),
        IP: ipnew,
        ID: req.query["ID"]
    });
    ///////////////////////////  
    var options = {
        dotfiles: 'ignore',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };
    var fileName = '/home/idropftp/' + req.query["hexfile"];
    res.sendFile(fileName, options, function(err) {
        if (err) {
            console.log(err);
            res.status(err.status).end();
        } else {
            console.log('Sent:', fileName);
        }
    });
    ///////////////////////////
    logger.log('info', '=====OUTGOING:GET=====', {
        time: getTimea()
    });
});
app.get("/", function(req, res) {
    /*connection.query('SELECT count(*) as counter from ddd_dispensor_dispensing_detail ', function(err, rows, fields) {
    connection.end();
      if (!err)
        console.log('The solution is: ', rows);
      else
        console.log('Error while performing Query.');
      });
    */
    res.sendStatus(404);
    res.end();
});
app.listen(3000);