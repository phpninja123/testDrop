/************************


  INCLUDES


*************************/

var express = require("express");
var mysql = require('mysql');
var winston = require('winston');
var path = require('path');
var xlsx = require('xlsx');
var multer = require('multer');
var fs = require('fs');
var app = express();
app.use(express.static(__dirname + '/'));
var nd = new Date();

//var upload = multer({ dest: 'uploads/',limits: {fileSize: 3000000, files:1} })
//var upload = multer({ dest: 'uploads/' });

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname + '-' + Date.now())
  }
})

var upload = multer({ storage: storage })


/**********
Process ECHO PACKET here
**********/




app.post('/maildude',upload.any(), function(req, res, next) {
 console.log('incoming app.post');


 var payload   = req.body;
//console.log(req);
    console.log(payload);
 console.log(req.files);
  res.sendStatus(200);

}).setMaxListeners(0);



/***** 
initialise the mysql connection pool 
*****/
/*var pool = mysql.createPool({
  connectionLimit: 200,
  acquireTimeout: 10000,
  host: '127.0.0.1',
  user: 'elecdbhb_siteusr',
  port: 3306,
  password: 'TheMostAmazingPasswordEver@1985',
  database: 'elecdbhb_thermo_track',
  debug: false
});*/
var pool = mysql.createPool({
  connectionLimit: 200,
  acquireTimeout: 10000,
  host: '41.185.23.170',
  user: 'mTxx008a',
  port: 3306,
  password: 'PmT7799nnmXX',
  database: 'dbmytrack',
  debug: false
});
function GetRowNumber(cellinfo)
{
  var ret_val = '';
  for(var i = 1; i < cellinfo.length;i++ )
  {
    ret_val = ret_val + cellinfo[i];
  }

  return ret_val;

}

/*****

Read an excel file

*****/
function noUndef(str,col)
{
  try{

    return str[col];

  }
  catch(err)
  {
    //console.log("Not a xlsx file");
    //console.log(err);
    return '';
  } 
}

function readExcelFilejson(filename)
{
  console.log('in here');

  try
  {
    var workbook = xlsx.readFile(filename);
    var sheet_name_list = workbook.SheetNames;
    var basefilename = path.basename(filename);



    sheet_name_list.forEach(function(y) {
        var worksheet = workbook.Sheets[y];

        var expeditingDT = worksheet['A1'].v; 
        var tmpStart  = expeditingDT.substring(expeditingDT.indexOf('from ')+5,expeditingDT.indexOf(' to ') ); 
        console.log('START#####################' + tmpStart);
        var tmpEnd    = expeditingDT.substring(expeditingDT.indexOf(' to ')+4,expeditingDT.length); 
        console.log('END#####################' + tmpEnd);

        var expeditingDT_Start = Date.parse(tmpStart).toString().substring(0,10);
        var expeditingDT_End = Date.parse(tmpEnd).toString().substring(0,10);



        var headers = {};
        var data = [];
        for(z in worksheet) {
            if(z[0] === '!') continue;
            //parse out the column, row, and value
            var col = z.substring(0,1);
            //console.log()
            var row = parseInt(z.substring(1));
            var value = worksheet[z].v;

            if(row <= 2) {
                
                continue;
            }
            //store header names
            if(row == 3) {

                headers[col] = value;
                continue;
            }

            if(!data[row]) data[row]={};
            data[row][headers[col]] = value;
        }
        //drop those first two rows which are empty
        data.shift();
        data.shift();
        data.shift();
        data.shift();
        
        
        for(var i = 0; i < data.length; i++ )
        {
          if(data[i] == null)
          {
            continue;
          }
          else
          {
            //console.log(data[i]);
            //console.log(noUndef(data,i,"Client Order Number"));
            
            InsertIntoDB(data[i],expeditingDT_Start,expeditingDT_End,basefilename);

          }
          //console.log(noUndef(data,i,"Client Order Number"));
        }
    });


console.log('RENAME ---> ' + __dirname + '/done/' + path.basename(filename));
    fs.rename(filename, __dirname + '/done/' + path.basename(filename),function(err){
      console.log('it broke' + err);
    }); 


  }catch (err)
  {
    console.log("Not a xlsx file");
    console.log(err);
    fs.rename(filename, __dirname + '/error/' + path.basename(filename),function(err){
      console.log('it broke' + err);
    }); 

  } 




}



function readExcelFile(filename)
{
try
{
  var workbook = xlsx.readFile(filename);
  var sheet_name_list = workbook.SheetNames;
  

  sheet_name_list.forEach(function(y) { /* iterate through sheets */
    var worksheet = workbook.Sheets[y];
    var tmpstr = '';
    var row = '';    
    var expeditingDT = worksheet['A1'].v; 
    var tmpStart  = expeditingDT.substring(expeditingDT.indexOf('from ')+5,expeditingDT.indexOf(' to ') ); 
    console.log('START#####################' + tmpStart);
    var tmpEnd    = expeditingDT.substring(expeditingDT.indexOf(' to ')+4,expeditingDT.length); 
    console.log('END#####################' + tmpEnd);

var expeditingDT_Start = Date.parse(tmpStart).toString().substring(0,10);
var expeditingDT_End = Date.parse(tmpEnd).toString().substring(0,10);
var dataArr = [];


console.log('here');
    for (z in worksheet) {
      

      /* all keys that do not begin with "!" correspond to cell addresses */
      if(z[0] === '!') 
      {
        console.log('------------------------------');
        console.log(z);
        console.log('------------------------------');
      }
      else
      {
    console.log('------------------------------');
        console.log(z);
        console.log('------------------------------');

        if ((row != '') && (row != (z[1]+z[2])))
        {
          console.log('row ===');console.log(GetRowNumber(z));
          console.log('tmpstr ===');console.log(tmpstr);
          tmpstr = '';
          row = (z[1]+z[2]);
          //InsertIntoDB(dataArr,expeditingDT_Start,expeditingDT_End);
          dataArr = [];
        }
        else if (row == '')
        {
          row = (z[1]+z[2]);
        }

        tmpstr = tmpstr + '|' + worksheet[z].v;
        if (GetRowNumber(z) >= 4  )
        { console.log(worksheet[z]);
          if (GetRowNumber(z) >= 8  )
          {
           
        return;
      }
          dataArr.push(worksheet[z].v);
        }
       

        //console.log(z[0]);
        //console.log(worksheet[z]);
        //console.log(z+'##' + worksheet[z].v + '##'+z);
        //console.log(y + "!" + z + "=" + JSON.stringify(worksheet[z].v));
      }
    }
 

 
 console.log(tmpstr);




      /*console.log(expeditingDT.v);*/
      console.log('garr-->' + expeditingDT.v + '--->' + row);
      
  });
 }catch (err)
{
	console.log("Not a xlsx file");
  console.log(err);
} 




}


function checkEmptyVal(valToCheck)
{
  console.log('checkEmptyVal');
  if ((valToCheck != ''))
  {
    console.log(1);
    if (valToCheck == undefined)
      {
        console.log(333);
        return '0';
      }
      else
      {
        console.log('444-->' + valToCheck);
        return valToCheck;
      }
  }
  else
  {
    console.log('2 -->' + valToCheck);
    return valToCheck;
  }
}

function InsertIntoDB(jsonData, tmpStart,tmpEnd,basefilename)
{

  pool.getConnection(function(err,connection)
  {
    if (err) {
      doConnectionRelease(connection);
      return;
    }     
    
    var query =  
    'INSERT INTO eti_expediting_trip_import'+
    '('+
    'eti_Trip_Date_Start,'+
    'eti_Trip_Date_End,'+
    'eti_Trip_Number,'+
    'eti_Client_Order_Number,'+
    'eti_Stop_Number,'+
    'eti_Client_Name,'+
    'eti_Client_Location_Code,'+
    'eti_Client_Location,'+
    'eti_Planned_HUs,'+
    'eti_Driver_Name,'+
    'eti_Driver_Phone,'+
    'eti_Primary_Mover,'+
    'eti_Trailer,'+
    'eti_Date_Created,'+
    'eti_Date_Updated,'+
    'eti_filename)'+
    'VALUES'+
    '('+
    '"' + tmpStart.toString() + '",' +
    '"' + tmpEnd.toString() + '",' +
    '"' + (noUndef(jsonData,"Trip Number")) + '",' + //trip number
    '"' + (noUndef(jsonData,"Client Order Number")) + '",' + //Client order num
    '"' + (noUndef(jsonData,"Stop Number")) + '",' + //stop num
    '"' + (noUndef(jsonData,"Client")) + '",' + //client name
    '"' + (noUndef(jsonData,"Client Location Code")) + '",' + // client location code
    '"' + (noUndef(jsonData,"Client Location")) + '",' + // client location
    '"' + (noUndef(jsonData,"Planned HUs")) + '",' + // planned hu
    '"' + (noUndef(jsonData,"Driver Name")) + '",' + // driver name
    '"' + (noUndef(jsonData,"Driver Phone")) + '",' + // driver tel
    '"' + (noUndef(jsonData,"Primary Mover")) + '",' + // primary mover
    '"' + (noUndef(jsonData,"Trailer")) + '",' + // trailer
    'unix_timestamp()' + ',' + //date created
    '0,' + //date updated
    '"' +basefilename + '"' + //date updated
    ');';
    //console.log(query);
    
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

function doConnectionRelease(connection)
{
  if (connection != null)
  {
    //logger.log('info','function-->' + connection.threadId + '|' + 'doConnectionRelease');
    //logger.log('debug','Releasing id ' + connection.threadId + ' | ' + getTimea() );
    //logger.log('debug','-----------------------Connection Free state' + pool._freeConnections.indexOf(connection)); // -1
    if (pool._allConnections.indexOf(connection) > -1) 
    {
      //console.log(pool);
      //connection.release();
      connection.destroy();
    }
    else
    {
      //logger.log('debug','connection already released');
    }
  }
  return;
}



setInterval(function(){
console.log('Do it');
var walk    = require('walk');
var files   = [];
// Walker options

  var walker = walk.walk('./uploads', { followLinks: false });



walker.on('file', function(root, stat, next) {
    
    if((stat.name.indexOf(".xlsx") > -1) || (stat.name.indexOf(".xls") > -1)  ){
      // Add this file to the list of files
    files.push(root + '/' + stat.name);
    next();
    }
    else
    {

      fs.unlink(root + '/' + stat.name ,function(err){
            if(err) return console.log(err);
            console.log(root + '/' +stat.name + ' file deleted successfully');
       }); 

    }
    
});

walker.on('end', function() {
    console.log(files);
  for( fileindex in files)
  {
    readExcelFilejson(files[fileindex]);
  }

});
//readExcelFile("82aadd0a1dd677d0844b9047aee1d7ca");

}, 30000);

app.listen(10000,function(){
  console.log('listening on port 10000');
});




