var config = require('./config');
var mysql      = require('mysql');
var connection = mysql.createConnection(config.databaseOptions);
var request = require('request');
//request information
var harvest_url = "https://datarunsdeep.harvestapp.com/clients";
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
        var clients = JSON.parse(body);
  sqlQuery = "INSERT INTO drd_harvestClients ( `id`,  `client_name`) VALUES";
  connection.connect();
  for (var i in clients) {
    if(i >0){
      sqlQuery+=",";
    }
    
    sqlQuery+="("+clients[i].client.id+",'"+config.mysql_real_escape_string (clients[i].client.name)+"') ";
  }
  sqlQuery +="ON DUPLICATE KEY UPDATE `client_name`=VALUES(`client_name`)";
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