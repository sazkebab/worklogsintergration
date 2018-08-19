var config = require('./config');
var request = require('request');
const json2csv = require('json2csv');
var fs = require('fs');
const BigQuery = require('@google-cloud/bigquery');
//request information
const bigquery = new BigQuery({
  projectId: 'bigq-drd-1',
  keyFilename: 'service-account-file.json'
});
const dataset = bigquery.dataset('Timesheets');
const table = dataset.table('harvestTimeLogs');
//request form harvest
var harvestURL_pt1 = "https://datarunsdeep.harvestapp.com/projects/"
var harvestURL_pt2 = "/entries?from=";

    var threeMonthsAgo = new Date();
//request information
var harvest_options = {
  headers: config.harvest 
};
var timeData = [];
var ids;
//get data from 12 months ago to today of projects which are active
var init = function(){
    var today = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 6);
    td = dateFormat(today);
    sd = dateFormat(threeMonthsAgo);
    harvestURL_pt2 +=sd+"&to="+td;
    ids=[];
    sqlQuery = "Select id from `bigq-drd-1.Timesheets.harvestProjects` WHERE ACTIVE Group By id";
    bigquery.createQueryStream(sqlQuery)
      .on('error', console.error)
      .on('data', function(row) {
        for(var i in row){
          ids.push(row[i]);
        }
        count = 0;
      })
      .on('end' ,getDataFromHarvest);
}
//request the next project timings
//if last record then add to SQL
function getDataFromHarvest(){
  if (count >= ids.length){
      deleteData();
  }else{
      harvest_options.url = harvestURL_pt1+ ids[count]+harvestURL_pt2;
      count++;
      request(harvest_options, addDataToArray);
    }  
 }

 //save the data to the array
function addDataToArray(error, response, body) {
  if (!error) {
    if(body.length > 0){
      timeData.push(body);
    }
    getDataFromHarvest();     	  
  }else{
          config.printToSlack("Harvest Logs Error: "+ err);
  }       
}


 
//save data to SQL
function deleteData(){
        getIDs();
}


function getIDs(){
  var insertedIds = [];
  sqlQuery = "Select id, max(created_at) as created_at,max(updated_at) as updated_at from `bigq-drd-1.Timesheets.harvestTimeLogs` Where id in (";
  var firstOne = true;
  for (var i in timeData){
        logs = JSON.parse(timeData[i]);
        for (var j in logs) {
          if(logs[j].day_entry != undefined ){
            if(!firstOne){
             sqlQuery+=",";
            }
            firstOne = false;
            sqlQuery+="'"+logs[j].day_entry.id.toString()+"'";
          }
        
        }
    }
    sqlQuery+=") group by id";
   bigquery.createQueryStream(sqlQuery)
    .on('error', console.error)
    .on('data', function(row) {
        insertedIds.push(row)
    })
    .on('end', function() {
      addNew(insertedIds);
    });
}

function addNew(ids){
		var json=[];
  for (var i in timeData){
    logs = JSON.parse(timeData[i]);
    for (var j in logs) {
      if(logs[j].day_entry != undefined ){
        addData = true;
        var updated = new Date(logs[j].day_entry.updated_at);
        for(k in ids){
            if(ids[k].id == logs[j].day_entry.id.toString()){
              match_updated = new Date(ids[k].updated_at);
              if(updated.getTime() == match_updated.getTime()){
                addData= false;
              }
              break;
            }
           }
           if(addData){
             json.push({
              "id": logs[j].day_entry.id.toString(),
                  "user_id": logs[j].day_entry.user_id.toString(),
                  "project_id": logs[j].day_entry.project_id.toString(),
                  "task_id": logs[j].day_entry.task_id.toString(),
                  "hours": logs[j].day_entry.hours,
                  "date_logged": logs[j].day_entry.spent_at.toString(),
                  "notes": logs[j].day_entry.notes === null? "":config.mysql_real_escape_string (logs[j].day_entry.notes.replace('\t','').replace(/(?:\r\n|\r|\n)/g, ' ')).slice(0,160),
                  "created_at":logs[j].day_entry.created_at,
                  "updated_at":logs[j].day_entry.updated_at,
                  "deleted":false});
           }
        
      }
    }
  }
  if(json.length > 0 ){
      csv = json2csv.parse( json, {header:false});
      fs.writeFile('harvestTimeLogs.csv', csv, function(err) {
        if (err) throw err;
        table.load('harvestTimeLogs.csv', function(err, apiResponse) {
          if (err) console.err;
          config.printToSlack("Logs updated");
          printProjectUpdates()
        });
      });
    }
}


function printProjectUpdates(){
  msg="";
   bigquery.createQueryStream(config.sqlStatement)
    .on('error', console.error)
    .on('data', function(row) {
        msg += row.Client_Name+" has spent " + Math.round(row.hoursSpent * 100) / 100 +" hours out of " + row.hoursRetainer+ "\n";
    })
    .on('end', function() {
      config.printToSlack(msg);
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
