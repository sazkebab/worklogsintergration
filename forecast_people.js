var Forecast = require('forecast-api');
var config = require('./config');
var mysql = require('mysql');
var connection = mysql.createConnection(config.databaseOptions);
var forecast = new Forecast(config.forecastOptions);
//sql table
var init = function(){
    forecast.people(function(err, people) {
        if (err) {
            throw err;
        }
        console.log(people)
        saveData(people);
    });
}   


function saveData(data){
   sqlQuery = "INSERT INTO drd_forecastPeople ( `id`,`harvest_id`, `archived`) VALUES ";
    connection.connect();
    for (var i in data) {
        if(i>0){
            sqlQuery+=", ";
        }else{
            firstQuery = false;
        }
        sqlQuery+="("+data[i].id+","+data[i].harvest_user_id+","+data[i].archived+")";   
    }
    sqlQuery +="ON DUPLICATE KEY UPDATE `harvest_id`=VALUES(`harvest_id`),`archived`=VALUES(`archived`)";
    console.log(sqlQuery);
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