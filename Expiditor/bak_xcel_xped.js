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
var upload = multer({ dest: 'uploads/',limits: {fileSize: 3000000, files:1} });
/**********
Process ECHO PACKET here
**********/

app.post('/maildude',upload.single('attachment1'), function(req, res) {
 console.log('incoming app.post');


 var payload   = req.body;
    console.log(payload);
 console.log(req.file);
  res.sendStatus(200);

}).setMaxListeners(0);


/*****

Read an excel file

*****/

function readExcelFile(filename)
{
try
{
  var workbook = xlsx.readFile(filename);
console.log("wtf");
  var sheet_name_list = workbook.SheetNames;
  sheet_name_list.forEach(function(y) { /* iterate through sheets */
    var worksheet = workbook.Sheets[y];
    var tmpstr = '';
    var row = '';    
    for (z in worksheet) {
      /* all keys that do not begin with "!" correspond to cell addresses */
      if(z[0] === '!') 
      {
        console.log('------------------------------');
      }
      else
      {
        if ((row != '') && (row != (z[1]+z[2])))
        {
          console.log(row);
          console.log(tmpstr);
          tmpstr = '';
          row = (z[1]+z[2]);
        }
        else if (row == '')
        {
          row = (z[1]+z[2]);
        }

        tmpstr = tmpstr + '|' + worksheet[z].v;

        //console.log(z[0]);
        //console.log(worksheet[z]);
        //console.log(z+'##' + worksheet[z].v + '##'+z);
        //console.log(y + "!" + z + "=" + JSON.stringify(worksheet[z].v));
      }
    }
    console.log(row);
          console.log(tmpstr);
  });
 }catch (err)
{
	console.log("Not a xlsx file");
} 




}



var walk    = require('walk');
var files   = [];

// Walker options
var walker  = walk.walk('./uploads', { followLinks: false });

walker.on('file', function(root, stat, next) {
    // Add this file to the list of files
    files.push(root + '/' + stat.name);
    next();
});

walker.on('end', function() {
    console.log(files);
	for( fileindex in files)
	{
		readExcelFile(files[fileindex]);
	}

});

//readExcelFile("82aadd0a1dd677d0844b9047aee1d7ca");



app.listen(10000,function(){
  console.log('listening on port 10000');
});


