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
const table = dataset.table('harvestTasks');
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
          
          addNew(body)
        }else{
          
          config.printToSlack("Harvest Task Error: "+ err);
        }
}
function addNew(body){
  var maxDates = []
  sqlQuery = "Select max(TIMESTAMP(updated_at)) as updated, max(TIMESTAMP(created_at)) as created from `bigq-drd-1.Timesheets.harvestTasks` "
  bigquery.createQueryStream(sqlQuery)
  .on('error', console.error)
  .on('data', function(row) {
    for(var i in row){
      if(row[i]!= null){
        maxDates.push(new Date(row[i].value));
      }else{
        maxDates.push(0);
      }
    }
    
  })
  .on('end', function() {
    var tasks = JSON.parse(body);
    var json=[];
    for (var i in tasks) {
      var updated = new Date(tasks[i].task.updated_at);
      var created = new Date(tasks[i].task.created_at);
      if(updated>maxDates[0] | created > maxDates[1]){
        json.push({"id": tasks[i].task.id.toString(),
                  "task_name": tasks[i].task.name,
                  "is_billable": tasks[i].task.billable_by_default.toString(),
                  "created_at":tasks[i].task.created_at,
                  "updated_at":tasks[i].task.updated_at,
                  "deleted":false});
        
      }
    }
    if(json.length > 0 ){
      csv = json2csv.parse( json, {header:false});
      fs.writeFile('harvestTasks.csv', csv, function(err) {
        if (err) throw err;
        table.load('harvestTasks.csv', function(err, apiResponse) {
          config.printToSlack("Harvest Project Tasks Updated");
        });
      });
    }
  });
}

//init();
module.exports = {
  init: init,
}