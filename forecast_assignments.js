var Forecast = require('forecast-api');
var config = require('./config');
var mysql = require('mysql');
var connection = mysql.createConnection(config.databaseOptions);
var forecast = new Forecast(config.forecastOptions);
//sql table
var firstQuery = true;
var init = function(){
    var today = new Date();
    var startdate = new Date();
    var enddate = new Date();
    startdate.setDate(today.getDate()-60);
    enddate.setDate(today.getDate()+60);
    var options = {
        startDate:startdate,
        endDate: enddate
    };
    forecast.assignments(options, function(err, assignments) {
        if (err) {
            throw err;
        }
        saveData(assignments);
    });
}


function saveData(data){ 
    connection.connect();
    sqlQuery_clearAllocations = "DELETE FROM drd_forecastAllocation";
    sqlQuery_allocation = "INSERT INTO drd_forecastAllocation ( `project_id`,`person_id`,`assignment_id`,`date_booked`,`allocation`) VALUES ";
    for (var i in data) {
    //for(var i = 150; i<=500; i++){
        startdate = new Date(data[i].start_date);
        enddate = new Date(data[i].end_date);
        //var timeDiff = Math.abs(enddate.getTime() - startdate.getTime());
        var timeLength = calcBusinessDays(startdate, enddate);
        var addingDate = 0;
        for(var j = 0; j<timeLength; j++){
            if(!firstQuery){
                sqlQuery_allocation+=", ";
            }else{
                firstQuery = false;
            }
            date_booked = startdate;
            date_booked = date_booked.addDays(addingDate);
            if(date_booked.getDay() == 7){
                addingDate++;
                date_booked = date_booked.addDays(1);
            }
            if(date_booked.getDay() == 6){
                addingDate+=2;
                date_booked = date_booked.addDays(2);
            }
            addingDate++;
            date_booked  = "STR_TO_DATE('"+dateFormat(date_booked)+"','%Y-%m-%d')";
            sqlQuery_allocation+="("+data[i].project_id+","+data[i].person_id+","+data[i].id+","+date_booked+","+data[i].allocation+")";                                                     
        }
    }

  connection.query(sqlQuery_clearAllocations, function(err, rows, fields) {
       
        if (!err) {
            console.log('Cleared Allocations: ', rows);
            connection.query(sqlQuery_allocation, function(err, rows, fields) {
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
    return yyyy.toString()+"-"+mm.toString()+"-"+dd.toString();
  
}

function calcBusinessDays(dDate1, dDate2) { // input given as Date objects
    var iWeeks, iDateDiff, iAdjust = 0;
    if (dDate2 < dDate1) return -1; // error code if dates transposed
    var iWeekday1 = dDate1.getDay(); // day of week
    var iWeekday2 = dDate2.getDay();
    iWeekday1 = (iWeekday1 == 0) ? 7 : iWeekday1; // change Sunday from 0 to 7
    iWeekday2 = (iWeekday2 == 0) ? 7 : iWeekday2;
    if ((iWeekday1 > 5) && (iWeekday2 > 5)) iAdjust = 1; // adjustment if both days on weekend
    iWeekday1 = (iWeekday1 > 5) ? 5 : iWeekday1; // only count weekdays
    iWeekday2 = (iWeekday2 > 5) ? 5 : iWeekday2;

    // calculate differnece in weeks (1000mS * 60sec * 60min * 24hrs * 7 days = 604800000)
    iWeeks = Math.floor((dDate2.getTime() - dDate1.getTime()) / 604800000)

    if (iWeekday1 <= iWeekday2) {
      iDateDiff = (iWeeks * 5) + (iWeekday2 - iWeekday1)
    } else {
      iDateDiff = ((iWeeks + 1) * 5) - (iWeekday1 - iWeekday2)
    }

    iDateDiff -= iAdjust // take into account both days on weekend

    return (iDateDiff + 1); // add 1 because dates are inclusive
  }
  Date.prototype.addDays = function(days)
{
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}

init();
module.exports = {
  init: init,
}