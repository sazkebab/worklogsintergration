var config = require('./config');
var mysql      = require('mysql');
var connection = mysql.createConnection(config.databaseOptions);
var request = require('request');
//request information
var harvest_options = {
  headers: config.harvest 
};
//request form harvest
var harvestURL_pt1 = "https://datarunsdeep.harvestapp.com/projects/"
var harvestURL_pt2 = "/user_assignments";
var ids;
var costsData =[];
var count = 0;
	
	
//get data from begining of this year to today of projects which are active
var init = function(){
    sqlQuery = "SELECT id from drd_harvestProjects WHERE active = TRUE";
    connection.connect();
   connection.query(sqlQuery, function(err, rows, fields) {
      if (!err) {
        ids = rows;
        count = 0;
        getDataFromHarvest();
  		} else{
        console.log('Error while performing Query.' + err);
    	}
    });
 }
 

 //save the data to the arrach
function addDataToArray(error, response, body) {
  if (!error) {
    costsData.push(body);
    getDataFromHarvest();     	  
  }else{
   	console.log(error);
  }       
}

//request the next project timings
//if last record then add to SQL
function getDataFromHarvest(){
  if (count >= ids.length){
      saveReportData();
  }else{
      harvest_options.url = harvestURL_pt1+ ids[count].id+harvestURL_pt2;
      count++;
      request(harvest_options, addDataToArray);
    }  
 }
 
function saveReportData(){
	 sqlQuery = "INSERT INTO drd_projectcosts ( `project_id`,  `user_id`, `rate`) VALUES";
      var firstInsert = true;
      for (var i in costsData){
        logs = JSON.parse(costsData[i]);
        for (var j in logs) {
          if(firstInsert){
            firstInsert = false;
          }else{
            sqlQuery+=",";
          }
          sqlQuery+="("+logs[j].user_assignment.project_id+","+logs[j].user_assignment.user_id+","+logs[j].user_assignment.hourly_rate+") ";
            
        }
      }
      sqlQuery +="ON DUPLICATE KEY UPDATE `rate`=VALUES(`rate`)";
    	connection.query(sqlQuery, function(err, rows, fields) {
        connection.end();
        if (!err) {
          console.log('The solution is: ', rows);
        }else{
          console.log('Error while performing Query.' + err);
    		}
    	});
}

//init();
module.exports = {
  init: init,
}