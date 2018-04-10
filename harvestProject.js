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
const table = dataset.table('harvestProjects');
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
          addNew(body)
        }else{
          console.log("error: ", error);
        }
}
function addNew(body){
  var maxDates = []
  sqlQuery = "Select max(TIMESTAMP(updated_at)) as updated, max(TIMESTAMP(created_at)) as created from `bigq-drd-1.Timesheets.harvestProjects` "
  bigquery.createQueryStream(sqlQuery)
  .on('error', console.error)
  .on('data', function(row) {
    console.log()
    for(var i in row){
      if(row[i]!= null){
        maxDates.push(new Date(row[i].value));
      }else{
        maxDates.push(0);
      }
    }
    
  })
  .on('end', function() {
    var projects = JSON.parse(body);
    var json=[];
    for (var i in projects) {
      var updated = new Date(projects[i].project.created_at);
      var created = new Date(projects[i].project.updated_at);
      if(updated>maxDates[0] | created > maxDates[1]){
        json.push({"id": projects[i].project.id.toString(),
                  "project_name": projects[i].project.name,
                  "project_code": projects[i].project.code.toString(),
                  "client_id": projects[i].project.client_id.toString(),
                  "active": projects[i].project.active,
                  "invoice_type": projects[i].project.bill_by,
                  "hourly_rate": projects[i].project.hourly_rate,
                  "budget": projects[i].project.cost_budget === null? 0:projects[i].project.cost_budget.toString(),
                  "starts_on":  projects[i].project.starts_on,
                  "ends_on": projects[i].project.ends_on,
                  "created_at":projects[i].project.created_at,
                  "updated_at":projects[i].project.updated_at,
                  "deleted":false});
        
      }
    }
    if(json.length > 0 ){
      csv = json2csv.parse( json, {header:false});
      fs.writeFile('harvestProjects.csv', csv, function(err) {
        if (err) throw err;
        console.log('file saved');
        table.load('harvestProjects.csv', function(err, apiResponse) {
           console.log(err);
          console.log(apiResponse);
        });
      });
    }
  });
}


init();
module.exports = {
  init: init,
}