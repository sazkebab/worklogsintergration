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
const table = dataset.table('harvestClients');
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
          //console.log(body)
          //removeData(body);
          addNew(body)
        }else{
          console.log("error: ", error);
        }
}

function removeData(body){
  var clients = JSON.parse(body);
  sqlQuery = "UPDATE `bigq-drd-1.Timesheets.harvestClients`  SET deleted=TRUE Where id not in ("
  
  for (var i in clients) {
    if(i >0){
      sqlQuery+=",";
    }
    sqlQuery+="'"+clients[i].client.id+"'"
    
  }
  sqlQuery+=")";
  bigquery.createQueryStream(sqlQuery)
  .on('error', console.error)
  .on('data', function(row) {
    console(row)
  })
  .on('end', function() {
    console.log("complete")
    addNew(body);
  });
  
}

function addNew(body){
  var maxDates = []
  sqlQuery = "Select max(TIMESTAMP(updated_at)) as updated, max(TIMESTAMP(created_at)) as created from `bigq-drd-1.Timesheets.harvestClients` "
  bigquery.createQueryStream(sqlQuery)
  .on('error', console.error)
  .on('data', function(row) {
    for(var i in row){
      maxDates.push(new Date(row[i].value));
    }
    
  })
  .on('end', function() {
    var clients = JSON.parse(body);
    var json=[];
    for (var i in clients) {
      var updated = new Date(clients[i].client.updated_at);
      var created = new Date(clients[i].client.created_at);
      if(updated>maxDates[0] | created > maxDates[1]){
        json.push({"id": clients[i].client.id.toString(),
                  "client_name": clients[i].client.name,
                  "created_at":clients[i].client.created_at,
                  "updated_at":clients[i].client.updated_at,
                  "deleted":false});
        
      }
    }
    console.log(json)
    if(json.length > 0 ){
      csv = json2csv.parse( json, {header:false});
      fs.writeFile('harvestClient.csv', csv, function(err) {
        if (err) throw err;
        console.log('file saved');
        table.load('harvestClient.csv', function(err, apiResponse) {
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