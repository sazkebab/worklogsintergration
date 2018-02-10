var request = require('request');
var mysql      = require('mysql');
var config = require('./config');
var connection = mysql.createConnection(config.databaseOptions);
var ids;
var timeData =[];
var count = 0;
//SQL table
harvestLogs_Table = "drd_harvestTimeLogs"
//request form harvest
var harvestURL_pt1 = "https://datarunsdeep.harvestapp.com/projects/"
var harvestURL_pt2 = "/entries?from=";
//request information
var harvest_options = {
  headers: config.harvest 
};
//get data from 12 months ago to today of projects which are active
var init = function(){
    var today = new Date();
    var twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    td = dateFormat(today);
    sd = dateFormat(twelveMonthsAgo);
    harvestURL_pt2 +=sd+"&to="+td;
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
//request the next project timings
//if last record then add to SQL
function getDataFromHarvest(){
  if (count >= ids.length){
      console.log("the end");
      saveReportData();
  }else{
      harvest_options.url = harvestURL_pt1+ ids[count].id+harvestURL_pt2;
      count++;
      request(harvest_options, addDataToArray);
    }  
 }

 //save the data to the arrach
function addDataToArray(error, response, body) {
  if (!error) {
    //console.log(body);
    timeData.push(body);
    getDataFromHarvest();     	  
  }else{
   	console.log(error);
  }       
}


 
//save data to SQL
function saveReportData(){
        sqlQuery_clearAllocations = "DELETE FROM " + harvestLogs_Table;
       sqlQuery = "INSERT INTO " + harvestLogs_Table + " ( `id`,  `user_id`, `project_id`, `task_id`, `hours`,`date_logged`,`notes`  ) VALUES";
      var firstInsert = true;
      for (var i in timeData){
        logs = JSON.parse(timeData[i]);
        for (var j in logs) {
          //console.log(logs[j]);
          //if the data had a day entry
          if( logs[j].day_entry !== undefined &&  logs[j].day_entry !== null){
            if(firstInsert){
              firstInsert = false;
            }else{
              sqlQuery+=",";
            }
            //escape note string
            notes = logs[j].day_entry.notes === null? "":config.mysql_real_escape_string (logs[j].day_entry.notes.replace('\t','').replace(/(?:\r\n|\r|\n)/g, ' ')).slice(0,160);
           // notes = notes.replace('\\n',' ');
            date  = "STR_TO_DATE('"+logs[j].day_entry.spent_at+"','%Y-%m-%d')" ;
//            console.log(notes);
            sqlQuery+="("+logs[j].day_entry.id+","+logs[j].day_entry.user_id+","+logs[j].day_entry.project_id+","+logs[j].day_entry.task_id+","+logs[j].day_entry.hours+","+date+",'"+ notes+"') ";
          }
        }
      }
      sqlQuery +="ON DUPLICATE KEY UPDATE `project_id`=VALUES(`project_id`), `task_id`=VALUES(`task_id`), `user_id`=VALUES(`user_id`), `hours`=VALUES(`hours`), `date_logged`=VALUES(`date_logged`), `notes`=VALUES(`notes`)";
    	//delete everything from the table
     connection.query(sqlQuery_clearAllocations, function(err, rows, fields) {
        if (!err) {
            console.log('Cleared Allocations: ', rows);
            //replace everything in the table
            connection.query(sqlQuery, function(err, rows, fields) {
                 connection.end();
                if (!err) {
                    console.log('Updated allocations ', rows);
                }else{
                    console.log('Error while performing Query.' + err);
                }
             });
        } else{
            console.log('Error while performing Query.' + err);
             connection.end();
        }
    });
}

function dateFormat(d){
  var dd = d.getDate();
     if (dd.toString().length == 1) {
            dd = "0" + dd;
        }
    var mm = d.getMonth()+1; //January is 0!
    if (mm.toString().length == 1) {
            mm = "0" + mm;
        }
    var yyyy = d.getFullYear();
    return yyyy.toString()+mm.toString()+dd.toString();
  
}
//init();
module.exports = {
  init: init,
}
