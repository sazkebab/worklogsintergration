var config = require('./config');
var mysql      = require('mysql');
var connection = mysql.createConnection(config.databaseOptions);
var request = require('request');
//request information
var harvest_url = "https://datarunsdeep.harvestapp.com/projects";
var harvest_options = {
  url: harvest_url,
  headers: config.harvest 
};
//get data from harvest
var init = function(){
    request(harvest_options, getHarvestData);
 }
 
 //when have data save it
function getHarvestData(error, response, body) {      	
          if(!error){
          saveData(body)
        }else{
          console.log("error: ", error);
        }
}

function saveData(body){
	
        var projects = JSON.parse(body);
	sqlQuery = "INSERT INTO drd_harvestProjects ( `id`,  `project_name`, `project_code`,`client_id`,`active`,`invoice_type`, `hourly_rate`, `budget`,`starts_on`,`ends_on`) VALUES";
        connection.connect();
        firstQuery = true;
        for (var i in projects) {
          if(projects[i].project.active){
                 if(!firstQuery){
                        sqlQuery+=",";
                }else{
                  firstQuery = false;
                }
                 startDate  = projects[i].project.starts_on === null? "STR_TO_DATE('2016-01-01','%Y-%m-%d')": "STR_TO_DATE('"+projects[i].project.starts_on+"','%Y-%m-%d')" ;
                 endDate  = projects[i].project.ends_on === null? "STR_TO_DATE('2016-01-01','%Y-%m-%d')": "STR_TO_DATE('"+projects[i].project.ends_on+"','%Y-%m-%d')" ;
                sqlQuery+="("+projects[i].project.id+",'"+config.mysql_real_escape_string (projects[i].project.name)+"','"+projects[i].project.code+"',"+projects[i].project.client_id+","+projects[i].project.active+",'"+projects[i].project.bill_by+"',"+projects[i].project.hourly_rate+","+projects[i].project.cost_budget+","+startDate+","+endDate+") ";
          }
           
        }
        
        sqlQuery +="ON DUPLICATE KEY UPDATE `project_name`=VALUES(`project_name`), `project_code`=VALUES(`project_code`), `client_id`=VALUES(`client_id`), `active`=VALUES(`active`), `invoice_type`=VALUES(`invoice_type`), `hourly_rate`=VALUES(`hourly_rate`), `budget`=VALUES(`budget`), `starts_on`=VALUES(`starts_on`), `ends_on`=VALUES(`ends_on`)";
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