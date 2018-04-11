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
const table = dataset.table('harvestUsers');
var harvest_url = "https://datarunsdeep.harvestapp.com/people";
var harvest_options = {
  url: harvest_url,
  headers: config.harvest 
};
var init = function(){
    request(harvest_options, getHarvestData);
 }
 
 function getHarvestData(error, response, body) {      	
        if(!error){
          addNew(body)
        }else{
          console.log("error: ", error);
        }
}


function addNew(body){
  var maxDates = []
  sqlQuery = "Select max(TIMESTAMP(updated_at)) as updated, max(TIMESTAMP(created_at)) as created from `bigq-drd-1.Timesheets.harvestUsers` "
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
    var users = JSON.parse(body);
    var json=[];
    for (var i in users) {
      var updated = new Date(users[i].user.updated_at);
      var created = new Date(users[i].user.created_at);
      if(updated>maxDates[0] | created > maxDates[1]){
        json.push({"id": users[i].user.id.toString(),
                  "first_name": users[i].user.first_name,
                  "last_name": users[i].user.last_name,
                  "email": users[i].user.email,
                  "rate": users[i].user.cost_rate,
                  "created_at":users[i].user.created_at,
                  "updated_at":users[i].user.updated_at,
                  "deleted":false});
        
      }
    }
    console.log(json)
    if(json.length > 0 ){
      csv = json2csv.parse( json, {header:false});
      fs.writeFile('harvestUsers.csv', csv, function(err) {
        if (err) throw err;
        console.log('file saved');
        table.load('harvestUsers.csv', function(err, apiResponse) {
          if (err) throw err;
          console.log(apiResponse);
        });
      });
    }
  });
}

//init();
module.exports = {
  init: init,
}