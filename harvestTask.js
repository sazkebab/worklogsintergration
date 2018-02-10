var config = require('./config');
var mysql      = require('mysql');
var connection = mysql.createConnection(config.databaseOptions);
var request = require('request');
//request information
var harvest_url = "https://datarunsdeep.harvestapp.com/tasks";
var harvest_options = {
  url: harvest_url,
  headers: config.harvest 
};
//get data from harvest
var init = function(){
    request(harvest_options, getHarvestData);
 }
 
 //get data from harvest
function getHarvestData(error, response, body) {      	
        if(!error){
          saveData(body);
        }else{
          console.log("error: ", error);
        }
}

function saveData(body){
        var tasks = JSON.parse(body);
	sqlQuery = "INSERT INTO drd_harvestTasks ( `id`,  `task_name`, `is_billable`) VALUES";
    connection.connect();
     for (var i in tasks) {
              if(i >0){
                     sqlQuery+=",";
             }
            sqlQuery+="("+tasks[i].task.id+",'"+config.mysql_real_escape_string (tasks[i].task.name)+"','"+ tasks[i].task.billable_by_default+"') ";
         
     }
   sqlQuery +="ON DUPLICATE KEY UPDATE `task_name`=VALUES(`task_name`), `is_billable`=VALUES(`is_billable`)";
 	connection.query(sqlQuery, function(err, rows, fields) {
             connection.end();
             if (!err) {
                     console.log('The solution is: ', rows);
		} else{
                     console.log('Error while performing Query.' + err);
 		}
 	});
}

//init();
module.exports = {
  init: init,
}