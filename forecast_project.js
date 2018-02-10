var Forecast = require('forecast-api');
var config = require('./config');
var mysql = require('mysql');
var connection = mysql.createConnection(config.databaseOptions);
var forecast = new Forecast(config.forecastOptions);
//sql table
var init = function(){
    forecast.projects(function(err, projects) {
        if (err) {
            throw err;
        }
        //console.log(projects)
        saveData(projects);
    });
    
 }

function saveData(data){
    sqlQuery = "INSERT INTO drd_forecastProjects ( `id`, `project_name`, `harvest_id`, `archived`) VALUES ";
    connection.connect();
    for (var i in data) {
        if(i>0){
            sqlQuery+=", ";
        }else{
            firstQuery = false;
        }
        var hid = data[i].harvest_id?data[i].harvest_id:0;
        sqlQuery+="("+data[i].id+",'"+config.mysql_real_escape_string (data[i].name)+"',"+hid+","+ data[i].archived+")";   
    }
    sqlQuery +="ON DUPLICATE KEY UPDATE `project_name`=VALUES(`project_name`), `harvest_id`=VALUES(`harvest_id`), `archived`=VALUES(`archived`)";
   connection.query(sqlQuery, function(err, rows, fields) {
        connection.end();
        if (!err) {
            console.log('The solution is: ', rows);
  		} else{
            console.log('Error while performing Query.' + err);
    	}
    });
}

init();

module.exports = {
  init: init,
}