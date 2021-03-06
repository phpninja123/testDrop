/************************


  INCLUDES
 

*************************/

var express = require("express");
var mysql = require('mysql');
var bodyParser = require('body-parser');
var winston = require('winston');
var path = require('path');


var app = express();
var nd = new Date();
var filename = path.join(__dirname, 'debuglogs/GDP_Livefeed-logfile.log');
//var filename = '/var/www/GDP_Livefeed-logfile.log'; // + nd.getFullYear() +''+ nd.getMonth()+''+ nd.getDate() + '.log';
process.env.TZ = 'Africa/Johannesburg';

app.use(function(req, res, next) {
  if ((req.is('text/*')) || (req.is('application/json')))  {
    req.text = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk) {
      req.text += chunk;
    });
    req.on('end', next);
  } else {
    next();
  }
});
/*
app.use(bodyParser.urlencoded({
  extended: true
}));
*/
/*
app.use(bodyParser.json());
*/


/***** 
Initialise the logger that is to log everything to file 
*****/
var logger = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)(),
    new(winston.transports.File)({
      filename: filename
    })
  ]
});

//set Log level
logger.level = 'info';

/***** 
initialise the mysql connection pool 
*****/
var pool = mysql.createPool({
  connectionLimit: 200,
  acquireTimeout: 10000,
  host: '127.0.0.1',
  user: 'elecdbhb_siteusr',
  port: 3306,
  password: 'TheMostAmazingPasswordEver@1985',
  database: 'elecdbhb_dev_it',
  debug: false
});


/************************


  ROUTES DECLARATIONS - All incoming routes need to be defined here. 


*************************/





app.get("/get/time", function(req, res) {
  logger.log('info', 'function-->' + 'app.get');
  
  GetIPofConnectedClient(req);

  var json = {};

  if (req.query.fmt == "unix") {
    json.DT = Math.floor(Date.now() / 1000);
  } else {
    json.DT = Date();
  }

  logger.log('debug', 'get time ' + JSON.stringify(json));
  //DoRemoveHeaders(res, 200);

  res.write(JSON.stringify(json));
  res.end();
  logger.log('info', '=====OUTGOING:GET=====', {
    time: getTimea()
  });
});

/**********
Process ECHO PACKET here
**********/

app.post('/post/echo', function(req, res) {
  logger.log('info', 'function-->' + 'app.post');
  GetIPofConnectedClient(req);

  var str = req.text;


  //console.log(str);
  var jsonData = JSON.parse(str);


  if (jsonData.PCK !== null)
  {

    //Update Unit Parameters (Battery Voltage)

    DoRemoveHeaders(res, 200);
   
    res.status(200).json(jsonData);

    logger.log('info', '=====OUTGOING:POS=====', {
      time: getTimea()
    });
  }
  else
  {
    res.status(400).json({ response : "No Packet Found"});  
  }

}).setMaxListeners(0);

/**********
Process Unit Data here
**********/

app.post('/incoming', function(req, res) {
  logger.log('info', 'function-->' + 'app.post');
  var IPofClient = GetIPofConnectedClient(req);

  var str = req.text;


  console.log("Loggin to Console " + str);
  var jsonData = JSON.parse(str);


  if (jsonData.PCK !== null)
  {
    var contentType = req.get('Content-Type');
    //Log incoming Data Packet For Debugging
    LogIncomingPackage(jsonData,contentType,IPofClient);


    HandleIncomingData(jsonData);


    IncomingDataForAlerts(jsonData);
  

    DoRemoveHeaders(res, 200);
   
    res.status(200).json(jsonData);

    logger.log('info', '=====OUTGOING:POS=====', {
      time: getTimea()
    });
  }
  else
  {
    res.status(400).json({ response : "No Packet Found"});  
  }

}).setMaxListeners(0);


/*****
 Default Route to kill all other traffic
****/

app.get("/", function(req, res) {

  res.sendStatus(404);
  res.end();

});


app.listen(8844,function(){
  console.log("Praat op 8844 ek luister...");
});



/*************************************


    FUNCTIONS



*************************************/
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

function LogIncomingPackage(jsonData, contentType,IPofClient)
{

  pool.getConnection(function(err,connection)
  {
    if (err) {
      doConnectionRelease(connection);
      return;
    }     
    var str = JSON.stringify(jsonData);
    var query =  'INSERT INTO `idl_incoming_data_log`( `idl_IP`,`idl_Input_Type`, `idl_Data`, `idl_Date_Created`) ' +
                 ' VALUES ("' + IPofClient + '","' + contentType + '","' + replaceAll(str, '"','""') + '",unix_timestamp())';
    console.log(query);
    connection.query(query, function(err, rows) {

        doConnectionRelease(connection);
        if (err) throw err;
        if (!rows)
        {

        }
    });
    //doConnectionRelease(connection);
    connection.on('error', function(err) {
      doConnectionRelease(connection);
      
      if(err.code === 'PROTOCOL_CONNECTION_LOST') {                   // Connection to the MySQL server is usually
                                                                      // lost due to either server restart, or a
      } else {                                                        // connnection idle timeout (the wait_timeout
        logger.log('error','LogIncomingPackage error',{'error' :err});  // server variable configures this)
      }

      
      return;
    });
  });
}

function GetIPofConnectedClient(req)
{
  var ipnew = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
 
  logger.log('info', '>>>>INCOMING>>>>', {
    time: getTimea(),
    IP: ipnew,
    ID: req.query.ID
  });
  return ipnew;
}


function getTimea() {
  return (Math.floor(Date.now() / 1000));
}



function DoRemoveHeaders(res, status) {

  res.removeHeader('Connection');
  res.removeHeader('Date');
  res.removeHeader('Transfer-Encoding');
  res.removeHeader('X-Powered-By');
  res.removeHeader('Content-Type');

  //res.writeHead(status);
  return;
}

function doConnectionRelease(connection)
{
  if (connection != null)
  {
    logger.log('info','function-->' + connection.threadId + '|' + 'doConnectionRelease');
    logger.log('debug','Releasing id ' + connection.threadId + ' | ' + getTimea() );
    logger.log('debug','-----------------------Connection Free state' + pool._freeConnections.indexOf(connection)); // -1
    if (pool._allConnections.indexOf(connection) > -1) 
    {
      //console.log(pool);
      //connection.release();
      connection.destroy();
    }
    else
    {
      logger.log('debug','connection already released');
    }
  }
  return;
}

function  SendResultToUnregistered(jsonData, connection)
{

  var query =  'INSERT INTO udt_unregistered_device_table(udt_IMEI,udt_MSISDN,udt_Message,udt_Date_Created) ' + 
               ' VALUES ("' + jsonData.ID  + '","", "' + replaceAll(JSON.stringify(jsonData), '"','""') + '",unix_timestamp())';
    
  connection.query(query,function(err,rows){
    doConnectionRelease(connection);

    if (err) throw err; 
    
  });
           
     //       echo '{"res_code":1,"response":"Unregistered Device"}';
}


////********* GDP CORE *********////////
////********* GDP CORE *********////////


function HandleIncomingData(jsonData)
{

  //FIRST GET THE TABLE NAME

  pool.getConnection(function(err,connection)
  {
    if (err) {
      doConnectionRelease(connection);
      return;
    }     
    
    var query =  'SELECT concat("company",crd_Company_Id,"device",drt_Unit_Type) as tablename FROM drt_device_registration_table WHERE drt_IMEI = "' + jsonData.ID + '"';
    //console.log(query);
    
    connection.query(query,function(err,rows){
     numRows = rows.length; 


      if (err){
        logger.log('error','error occured', {'error' : err});
        doConnectionRelease(connection);
        return;

      }

      if (!rows)
      {
       logger.log('debug','Problems occured on query');
       doConnectionRelease(connection);
       return;
            
      }
     else
     {

        logger.log('debug','Data Selected' ,{data : rows, 'rows' : numRows});

        if (numRows === 0)
        {
          logger.log('debug','No Values Returned');

          SendResultToUnregistered(jsonData,connection);//connection is killed here

          return;
        }
        logger.log('debug','thats weird ' + numRows  ,{data : rows});
        
        var tableName = rows[0].tablename;
        
        //
        //THEN GET THE STRUCTURE
        //
        var query = 'select psl_Field_Name,psl_Field_Type from psl_packet_structure_lookup where psl_Packet_Type in ('+
                    ' SELECT `psl_packet_type` FROM `dpl_device_packet_link` WHERE `drt_Unit_Type` = '+
                    ' ( '+
                    ' SELECT drt_Unit_Type FROM drt_device_registration_table WHERE drt_IMEI = "' + jsonData.ID  + '"'+
                    ' )'+
                    ' and crd_Company_Id ='+
                    ' ( '+
                    ' SELECT crd_Company_Id FROM drt_device_registration_table WHERE drt_IMEI = "' + jsonData.ID + '"'+
                    ' )'+
                    ' and psl_packet_type = "' + jsonData.PT +'"'+
                    ' )';

        console.log(query);
        
        connection.query(query,function(err,rows){
          numRows = rows.length;

          console.log('--psl---------' + numRows + '-----------');

           if (err) throw err;
          if (!rows)
          {
            doConnectionRelease(connection);
            return;
            //RESPONSE {"res_code":3,"response":"No Fields Defined"}
          }
          else
          {
            var str_fields = 'DeviceID,psl_Packet_Type';
            var str_values = jsonData.ID + '","' + jsonData.PT;

            for(i=0 ; i < numRows; i++)
            {
                var obj = {};

                obj = rows[i];
                console.log(obj.psl_Field_Name);
                
            
                if(str_fields.length > 0 )
                {
                    str_fields = str_fields + ',' + obj.psl_Field_Name;
                    str_values = str_values + '","' + jsonData[obj.psl_Field_Name] ;
                   // str_FieldArray[row['psl_Field_Name']] = jsonData[row['psl_Field_Name']];
                }
                else
                {
                    str_fields = str_fields + obj.psl_Field_Name;
                    str_values = str_values + jsonData[obj.psl_Field_Name] ;
                   // str_FieldArray[row['psl_Field_Name']] = jsonData[row['psl_Field_Name']];
                }
               
            }

            sql = 'Insert into '  + tableName  + ' ('  +str_fields +' ,Date_Created) Values ("'  +str_values +'", unix_timestamp())';
            console.log(sql);
            connection.query(sql,function(err,rows){
              doConnectionRelease(connection);
              numRows = rows.length;
               if (err) throw err;
             });

          }
        });
        return;

     }
    });
    connection.on('error', function(err) {
      if(err.code === 'PROTOCOL_CONNECTION_LOST') {                   // Connection to the MySQL server is usually
                                                                      // lost due to either server restart, or a
      } else {                                                        // connnection idle timeout (the wait_timeout
        logger.log('error','This should not happen',{'error' :err});  // server variable configures this)
      }

      
      return;
    });
  });

}



////********* GDP CORE END *********////////
////********* GDP CORE END *********////////

/*

CHECK ALERTS

*/
function IncomingDataForAlerts(jsonData)
{

  pool.getConnection(function(err,connection)
  {
    if (err) {
      doConnectionRelease(connection);
      return;
    }     

    sql = 'select dal_Alert_Type,dal_Alert_Value,dal_Active,dal_Date_Created,dal_escalation_email,dal_Alert_Field '+
      'from dal_device_alert_lookup where '+
      'drt_Device_Type = (SELECT drt_Unit_Type FROM drt_device_registration_table WHERE drt_IMEI = "' + jsonData.ID + '" ) '+
      'and crd_Company_Id = (SELECT crd_Company_Id FROM drt_device_registration_table WHERE drt_IMEI = "' + jsonData.ID + '") '+
      'and dal_Active = 1';


    console.log('select alerts for device : ' + sql);
    connection.query(sql,function(err,rows){
      
      numRows = rows.length;

          console.log('-- IncomingDataForAlerts ---------' + numRows + '-----------');

           if (err) throw err;
          if (!rows)
          {
            doConnectionRelease(connection);
            return;
            //RESPONSE {"res_code":3,"response":"No Fields Defined"}
          }
          else
          {
            for(i=0 ; i < numRows; i++)
            {
              var obj = {};

              obj = rows[i];
              console.log(obj);
              
          
////////////////////////////////////

              var Escalation_Email_Addr = obj.dal_escalation_email;
              var AlertField = obj.dal_Alert_Field;    
              var AlertValue = obj.dal_Alert_Value;  
              var Device_ID   = jsonData.ID;
              var alertLogged = false;
              switch (obj.dal_Alert_Type) 
              {
                  case 'Min':
                  {
                      if (jsonData[AlertField] <=  AlertValue)
                      {
                          message = "The Device triggered a MINIMUM VALUE ALERT " + AlertField + " (trigger value : " + AlertValue + " device value : " + jsonData[AlertField] + ")" ;
                            
                            alertLogged = logAlerttoDB(obj.dal_Alert_Type,AlertField,AlertValue,jsonData[AlertField],Device_ID,message,Escalation_Email_Addr);
                      }

                      break;
                  }
                  case 'Max':
                  {
                      if (jsonData[AlertField] >=  AlertValue)
                      {
                          message = "The Device triggered a MAXIMUM VALUE ALERT  " + AlertField + " (trigger value : " + AlertValue + " device value : " + jsonData[AlertField] + ")" ;
                          alertLogged = logAlerttoDB(obj.dal_Alert_Type,AlertField,AlertValue,jsonData[AlertField],Device_ID,message,Escalation_Email_Addr);
                          
                      }
                      break;
                  }
                  case 'Min Average':
                  {
                      if (jsonData[AlertField] <=  AlertValue)
                      {
                          message = "The Device triggered a MINIMUM AVERAGE VALUE ALERT  " + AlertField + " (trigger value : " + AlertValue + " device value : " + jsonData[AlertField] + ")" ;
                          console.log("SendAlertMail : " + SendAlertMail(message,Escalation_Email_Addr,Device_ID));
                      }
                      break;

                  }
                  case 'Max Average':
                  {

                      if (jsonData[AlertField] <=  AlertValue)
                      {
                          message = "The Device triggered a MAXIMUM AVERAGE VALUE ALERT  " + AlertField + " (trigger value : " + AlertValue + " device value : " + jsonData[AlertField] + ")" ;
                          console.log("SendAlertMail : " + SendAlertMail(message,Escalation_Email_Addr,Device_ID));
                      }
                      break;
                  }
                  case 'Offline':
                  {
                      if (jsonData[AlertField] ==  AlertValue)
                      {
                          message = "The Device IS NOW OFFLINE ALERT  " + AlertField + " (trigger value : " + AlertValue + " device value : " + jsonData[AlertField] + ")" ;
                          console.log("SendAlertMail : " + SendAlertMail(message,Escalation_Email_Addr,Device_ID));
                      }
                      break;
                  }
                  case 'Online':
                  {

                      if (jsonData[AlertField] ==  AlertValue)
                      {
                          message = "The Device IS NOW ONLINE ALERT  " + AlertField + " (trigger value : " + AlertValue + " device value : " + jsonData[AlertField] + ")" ;
                          console.log("SendAlertMail : " + SendAlertMail(message,Escalation_Email_Addr,Device_ID));
                      }
                      break;
                      
                  }
                  default :   
                  {
                      break;

                      //echo "SendAlertMail : " + SendAlertMail('No Alert Type, This shouldn\'t really happen','errors@elecdesign.co.za',Device_ID);
                  }
              }
            }
          }
///////////////////////////////////
     });


    connection.on('error', function(err) {
      if(err.code === 'PROTOCOL_CONNECTION_LOST') {                   // Connection to the MySQL server is usually
                                                                      // lost due to either server restart, or a
      } else {                                                        // connnection idle timeout (the wait_timeout
        logger.log('error','This should not happen',{'error' :err});  // server variable configures this)
      }
      
      return;
    });
             
  });
}


function SendAlertMail(message,Escalation_Email_Addr,Device_ID)
{
 var sendgrid  = require('/usr/local/lib/node_modules/sendgrid/lib/sendgrid.js')('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');

  //var sendgrid  = require('G:/Private/elecdesign/code/sandbox/toots/dooitz/node_modules/sendgrid/lib/sendgrid.js')('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');
  var email = new sendgrid.Email();

email.addTo(Escalation_Email_Addr);

email.addCc('wynand@inodevsolutions.com');
email.setFrom('alerts@inodevsolutions.com');
email.setSubject("Alert Email on Device : " + Device_ID);
email.setHtml(message);

sendgrid.send(email, function(err, json) {
    if (err) { return console.error(err); }
    return 'sharp';

    console.log(json);
  });


}




function logAlerttoDB(alert_type, alert_field, alert_trigger_value, device_value, unit_id,message,Escalation_Email_Addr)
{
  console.log('in log Alert');
  pool.getConnection(function(err,connection)
  {
    if (err) {
      doConnectionRelease(connection);
      console.log('Got error now false');
      return false;
    }     

    sql = 'select count(*) as counter from cda_current_devicealerts where cda_Device_Id = "' + unit_id + '" ' +
          'and (cda_Date_Created between unix_timestamp()-7200 and unix_timestamp()) ' +
          'and cda_Alert_Type = "'+ alert_type + '"';


    console.log('select current alerts : ' + sql);
    connection.query(sql,function(err,rows){
      
      numRows = rows.length;
      console.log('-----------1' + numRows + '-----------');

           if (err) throw err;
          if (!rows)
          {
            console.log('Got error in sql 1 now false');
            doConnectionRelease(connection);
            return false;
            //RESPONSE {"res_code":3,"response":"No Fields Defined"}
          }
          else
          {
            for(i=0 ; i < numRows; i++)
            {
              var obj = {};

              obj = rows[i];
              console.log(obj);
              if (obj.counter === 0)
              {
                sql = 'INSERT INTO cda_current_devicealerts(`cda_Alert_Type`,`cda_AlertField`,`cda_Trigger_Value`,`cda_Alert_Value`,cda_Device_Id,`cda_Date_Created`) '+
                      'VALUES ' +
                      '("'+ alert_type+'","'+alert_field+'","'+alert_trigger_value+'","'+device_value+'","'+unit_id+'",unix_timestamp())';

                connection.query(sql,function(err,rows){
    
                  numRows = rows.length;
                  console.log('-----------2' + numRows + '-----------');
                  
                  if (err) throw err;
                  if (!rows)
                  {
                    console.log('WE MADE IT');
                    doConnectionRelease(connection);
                    return true;
                    //RESPONSE {"res_code":3,"response":"No Fields Defined"}
                  }
                  
                  SendAlertMail(message,Escalation_Email_Addr,unit_id);
console.log('>>>>>>>>>>>>>>>>>>> THIS IS THE END');
                });
              }
              else
              {
                console.log('counter in not 0 now false');
                 return false;
                
              }
            }
          }
        });

    connection.on('error', function(err) {
      console.log('Got error on global now false');
      if(err.code === 'PROTOCOL_CONNECTION_LOST') {                   // Connection to the MySQL server is usually
                                                                      // lost due to either server restart, or a
      } else {                                                        // connnection idle timeout (the wait_timeout
        logger.log('error','This should not happen',{'error' :err});  // server variable configures this)
      }
      
      return false;
    });
  });
}


  

