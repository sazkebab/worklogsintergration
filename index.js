
var cron = require('node-cron');
var hc = require('./harvestClient.js');
var hp = require('./harvestProject.js');
var ht = require('./harvestTask.js');
var hpc = require('./harvestProjectCost');
var hl = require('./harvestLogs.js');
var hu = require('./harvestUser.js');
console.log(new Date());
  console.log('running harvest client');
  hc.init()
  console.log('running harvest project');
  hp.init()
  console.log('running harvest tasks');
  ht.init()
  console.log('running harvest users');
  hu.init()
  console.log('running harvest project costs');
  hpc.init()
  console.log('running harvest logs');
  hl.init()
