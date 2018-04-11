
var cron = require('node-cron');
var hc = require('./harvestClient.js');
var hp = require('./harvestProject.js');
var ht = require('./harvestTask.js');
var hpc = require('./harvestProjectCost');
var hl = require('./harvestLogs.js');
var hu = require('./harvestUser.js');
console.log(new Date());
 
cron.schedule('0 0 16 * * *', function(){
  console.log('running harvest client');
  hc.init()
});

cron.schedule('0 5 16 * * *', function(){
  console.log('running harvest project');
  hp.init()
});

cron.schedule('0 10 16 * * *', function(){
  console.log('running harvest tasks');
  ht.init()
});
cron.schedule('0 15 16 * * *', function(){
  console.log('running harvest users');
  hu.init()
});

cron.schedule('0 20 16 * * *', function(){
  console.log('running harvest project costs');
  hpc.init()
});

cron.schedule('0 30 16 * * *', function(){
  console.log('running harvest logs');
  hl.init()
});