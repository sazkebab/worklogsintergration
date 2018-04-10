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
const table = dataset.table('harvestProjectCosts');
var harvest_options = {
  headers: config.harvest 
};
var harvestURL_pt1 = "https://datarunsdeep.harvestapp.com/projects/"
var harvestURL_pt2 = "/user_assignments";
var ids;
var costsData =[];
var count = 0;
	
	
//get data from begining of this year to today of projects which are active
var init = function(){
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
      harvest_options.url = harvestURL_pt1+ ids[count]+harvestURL_pt2;
      count++;
      request(harvest_options, addDataToArray);
    }  
 }
 
function saveReportData(){
	 var maxDates = []
  sqlQuery = "Select max(TIMESTAMP(updated_at)) as updated, max(TIMESTAMP(created_at)) as created from `bigq-drd-1.Timesheets.harvestProjectCosts` "
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
		var json=[];
		var firstInsert = true;
		for (var i in costsData){
			logs = JSON.parse(costsData[i]);
			for (var j in logs) {
				var updated = new Date(logs[j].user_assignment.updated_at);
				var created = new Date(logs[j].user_assignment.created_at);
				if(updated>maxDates[0] | created > maxDates[1]){
					json.push({"project_id": logs[j].user_assignment.project_id.toString(),
                  "user_id": logs[j].user_assignment.user_id.toString(),
                  "rate": logs[j].user_assignment.hourly_rate,
                  "created_at":logs[j].user_assignment.created_at,
                  "updated_at":logs[j].user_assignment.updated_at,
                  "deleted":false});
        
				}
			}
		}
		if(json.length > 0 ){
      csv = json2csv.parse( json, {header:false});
      fs.writeFile('harvestProjectCosts.csv', csv, function(err) {
        if (err) throw err;
        console.log('file saved');
        table.load('harvestProjectCosts.csv', function(err, apiResponse) {
          if (err) throw err;
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