var config = require('./config');
var mysql      = require('mysql');
var connection = mysql.createConnection(config.databaseOptions);
var request = require('request');
//request information
var harvest_url = "https://datarunsdeep.harvestapp.com/people";
var harvest_options = {
  url: harvest_url,
  headers: config.harvest 
};
//get data from harvest
var init = function(){
    request(harvest_options, getHarvestData);
 }
 
 function getHarvestData(error, response, body) {      	
        if(!error){
          saveData(body)
        }else{
          console.log("error: ", error);
        }
}

function saveData(body){
        var users = JSON.parse(body);
	sqlQuery = "INSERT INTO drd_harvestUsers ( `id`,  `first_name`, `last_name`, `email`, `rate`) VALUES";
       connection.connect();
        for (var i in users) {
                 if(i >0){
                        sqlQuery+=",";
                }
               sqlQuery+="("+users[i].user.id+",'"+config.mysql_real_escape_string (users[i].user.first_name)+"','"+config.mysql_real_escape_string (users[i].user.last_name)+"','"+config.mysql_real_escape_string (users[i].user.email)+"',"+users[i].user.cost_rate+") ";   
        }
      sqlQuery +="ON DUPLICATE KEY UPDATE `first_name`=VALUES(`first_name`), `last_name`=VALUES(`last_name`), `email`=VALUES(`email`), `rate`=VALUES(`rate`) ";
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