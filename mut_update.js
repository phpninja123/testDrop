var mysql      = require('mysql');

var pool      =    mysql.createPool({
    connectionLimit : 200, //important
    acquireTimeout : 10000,
    host     : '129.232.215.194',
    user     : 'elecdbhb_siteusr',
    port      : 3306,
    password : 'TheMostAmazingPasswordEver@1985',
    database : 'elecdbhb_idropwaterdb',
    debug    :  false
});


function doConnectionRelease(connection)
{
   if (pool._freeConnections.indexOf(connection) == -1) 
  {
    connection.release();
  }
  else
  {
    console.log('debug','connection already released');
  }
  return
}


function formatDate() {
    var d = new Date(),
        month = '' + (d.getMonth() + 1),
        //day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    //if (day.length < 2) day = '0' + day;

    return [year, month].join('-');
}

function docycle()
{

	pool.getConnection(function(err,connection)
	  {
	    if (err) {
	     
	      doConnectionRelease(connection);
	      return;
	    }     

	    var query = 'CALL `elecdbhb_idropwaterdb`.`DoUnitTotalizers`("' +  formatDate() + '");';

	               console.log('debug',query);
	    connection.query(query,function(err,rows){
	        
	        doConnectionRelease(connection);
	        if (err) throw err;
	        if (!rows)
	        {
	          console.log('debug','updated');
	        }
	        else
	        {
	          console.log('debug','thats weird' ,rows); 
	        }
	        return;
	    });

	    connection.on('error', function(err) {
	          console.log('error','This should not happen',{'error' :err});
	          return;
	    });
	  })

	
}
setInterval(function(){

	docycle();

	}
,43200000)
