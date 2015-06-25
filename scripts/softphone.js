var screenPopId = 10;

// Page loaded
$(function() {

    // ** Application container ** //
    window.SP = {}

    // Global state
    SP.state = {};
    SP.state.callNumber = null;
    SP.state.calltype = "";
    SP.username = $('#client_name').text();
    SP.currentCall = null;  //instance variable for tracking current connection
    SP.requestedHold = false; //set if agent requested hold button
    SP.defaultScreenPopId = '10';
    SP.screenPopId = '';



    SP.functions = {};

    desk.ready(function() {
        var $win = $(window);
        var $phone = $('#softphone');
        var width = 260;
        var height = 450;
        console.log('im here');
        desk.interaction.cti.setSoftphoneWidth(width);
        desk.interaction.cti.setSoftphoneHeight(height);
        desk.interaction.cti.enableClickToDial();
        desk.interaction.cti.onClickToDial(startCall);
        SP.functions.ready();
    });

    // ** UI Widgets ** //

    // Hook up numpad to input field
    $("div.number").bind('click',function(){
      SP.functions.handleKeyEntry($(this).attr('Value'));
    });

    $( "#customizeScreenPopInputForm" ).submit(function( event ) {
      console.log('Handler for .submit() called.');
      event.preventDefault();
    });

    SP.functions.showCustomizeScreenPop = function() {
        $('#customizeScreenPop').show();
    }

    SP.functions.hideCustomizeScreenPop = function() {
        $('#customizeScreenPop').hide();
    }

    SP.functions.updateScreenPopId = function () {
      newScreenPopId = $('#customizeScreenPopInput').val();
      screenPopId = parseInt(newScreenPopId);
      console.log(screenPopId);
    }

    SP.functions.handleKeyEntry = function (key) {
         $("#number-entry > input").val($("#number-entry > input").val()+key);
    }

    //called when agent is not on a call
    SP.functions.setIdleState = function() {
        $("#action-buttons > .call").show();
        $("#action-buttons > .answer").hide();
        $("#action-buttons > .mute").hide();
        $("#action-buttons > .hold").hide();
        $("#action-buttons > .unhold").hide();
        $("#action-buttons > .hangup").hide();
        $('div.agent-status').hide();
        $("#number-entry > input").val("");
    }

    SP.functions.setRingState = function () {
        $("#action-buttons > .answer").show();
        $("#action-buttons > .call").hide();
        $("#action-buttons > .mute").hide();
        $("#action-buttons > .hold").hide();
        $("#action-buttons > .unhold").hide();
        $("#action-buttons > .hangup").hide();
    }

    SP.functions.setOnCallState = function() {

        $("#action-buttons > .answer").hide();
        $("#action-buttons > .call").hide();
        $("#action-buttons > .mute").show();
        $("#action-buttons > .hold").show();
        //can not hold outbound calls, so disable this
        if (SP.calltype == "Inbound") {
            $("#action-buttons > .hold").show();
        }

        $("#action-buttons > .hangup").show();
        $('div.agent-status').show();
    }

    // Hide caller info
    SP.functions.hideCallData = function() {
      $("#call-data").hide();
    }

    SP.functions.hideCallData();
    SP.functions.setIdleState();

    // Show caller info
    SP.functions.showCallData = function(callData) {
      $("#call-data > ul").hide();
      $(".caller-name").text(callData.callerName);
      $(".caller-number").text(callData.callerNumber);
      $(".caller-queue").text(callData.callerQueue);
      $(".caller-message").text(callData.callerMessage);

      if (callData.callerName) {
        $("#call-data > ul.name").show();
      }

      if (callData.callerNumber) {
        $("#call-data > ul.phone_number").show();
      }

      if (callData.callerQueue) {
        $("#call-data > ul.queue").show();
      }

      if (callData.callerMessage) {
        $("#call-data > ul.message").show();
      }

      $("#call-data").slideDown(400);
    }

    // Attach answer button to an incoming connection object
    SP.functions.attachAnswerButton = function(conn) {
      $("#action-buttons > button.answer").click(function() {
        SP.functions.simulateInboundAnswer();
      }).removeClass('inactive').addClass("active");
    }

    SP.functions.detachAnswerButton = function() {
      $("#action-buttons > button.answer").unbind().removeClass('active').addClass("inactive");
    }

    SP.functions.attachMuteButton = function(conn) {
      $("#action-buttons > button.mute").click(function() {
        //conn.mute();
        SP.functions.attachUnMute(conn);
      }).removeClass('inactive').addClass("active").text("Mute");
    }

    SP.functions.attachUnMute = function(conn) {
      $("#action-buttons > button.mute").click(function() {
        //conn.unmute();
        SP.functions.attachMuteButton(conn);
      }).removeClass('inactive').addClass("active").text("UnMute");
    }

    SP.functions.detachMuteButton = function() {
      $("#action-buttons > button.mute").unbind().removeClass('active').addClass("inactive");
    }

    SP.functions.attachHoldButton = function(conn) {
      $("#action-buttons > button.hold").click(function() {
         console.dir(conn);
         SP.requestedHold = true;
         //can't hold outbound calls from Twilio client
         $.post("/request_hold", { "from":SP.username, "callsid":conn.parameters.CallSid, "calltype":SP.calltype }, function(data) {
             //Todo: handle errors
             //Todo: change status in future
             SP.functions.attachUnHold(conn, data);

          });

      }).removeClass('inactive').addClass("active").text("Hold");
    }

    SP.functions.attachUnHold = function(conn, holdid) {
      $("#action-buttons > button.unhold").click(function() {
        //do ajax request to hold for the conn.id

         $.post("/request_unhold", { "from":SP.username, "callsid":holdid }, function(data) {
             //Todo: handle errors
             //Todo: change status in future
             //SP.functions.attachHoldButton(conn);
          });

      }).removeClass('inactive').addClass("active").text("UnHold").show();
    }

    SP.functions.detachHoldButtons = function() {
      $("#action-buttons > button.unhold").unbind().removeClass('active').addClass("inactive");
      $("#action-buttons > button.hold").unbind().removeClass('active').addClass("inactive");
    }

    SP.functions.updateAgentStatusText = function(statusCategory, statusText, inboundCall) {

      if (statusCategory == "ready") {
           $("#agent-status-controls > button.ready").prop("disabled",true);
           $("#agent-status-controls > button.not-ready").prop("disabled",false);
           $("#agent-status").removeClass();
           $("#agent-status").addClass("ready");
           $('#softphone').removeClass('incoming');

       }

      if (statusCategory == "notReady") {
           $("#agent-status-controls > button.ready").prop("disabled",false);
           $("#agent-status-controls > button.not-ready").prop("disabled",true);
           $("#agent-status").removeClass();
           $("#agent-status").addClass("not-ready");
           $('#softphone').removeClass('incoming');

      }

      if (statusCategory == "onCall") {
          $("#agent-status-controls > button.ready").prop("disabled",true);
          $("#agent-status-controls > button.not-ready").prop("disabled",true);
          $("#agent-status").removeClass();
          $("#agent-status").addClass("on-call");
          $('#softphone').removeClass('incoming');
      }

      if (inboundCall ==  true) {
        //alert("call from " + statusText);
        $('#softphone').addClass('incoming');
        $("#number-entry > input").val(statusText);
      }

      //$("#agent-status > p").text(statusText);
    }

    // Call button will make an outbound call (click to dial) to the number entered
    $("#action-buttons > button.call").click( function( ) {
      params = {"PhoneNumber": $("#number-entry > input").val(), "CallerId": $("#callerid-entry > input").val()};
      //Twilio.Device.connect(params);
      SP.functions.updateAgentStatusText("onCall", status);
      SP.functions.setOnCallState();
      SP.functions.detachAnswerButton();
      SP.functions.simulateOutboundCall($("#number-entry > input").val());
    });

    // Hang up button will hang up any active calls
    $("#action-buttons > button.hangup").click( function( ) {
      //Twilio.Device.disconnectAll();
        SP.functions.detachAnswerButton();
        SP.functions.detachHoldButtons();
        SP.functions.hideCallData();
        SP.functions.ready();
        SP.functions.setIdleState();
        //$(".number").unbind();
        SP.currentCall = null;
    });

    // Wire the ready / not ready buttons up to the server-side status change functions
    $("#agent-status-controls > button.ready").click( function( ) {
      $("#agent-status-controls > button.ready").prop("disabled",true);
      SP.functions.ready();
    });

    $("#agent-status-controls > button.not-ready").click( function( ) {
      $("#agent-status-controls > button.not-ready").prop("disabled",true);
      SP.functions.notReady();
    });

      $("#agent-status-controls > button.userinfo").click( function( ) {


    });

    $("#callerid-entry > input").change( function() {
        $.post("/setcallerid", { "from":SP.username, "callerid": $("#callerid-entry > input").val() });
    });

    SP.functions.notReady = function() {
              SP.functions.updateAgentStatusText("notReady", "Not Ready")
    }

    SP.functions.ready = function() {
              SP.functions.updateAgentStatusText("ready", "Ready")
    }

    SP.functions.simulateInboundCall = function(number) {
        SP.functions.updateAgentStatusText("ready", number, true);
        SP.functions.attachAnswerButton();
        SP.functions.setRingState();
        desk.interaction.searchAndScreenPop(number, 'object=customer');
    }

    SP.functions.simulateEmailCase = function(number) {
        SP.functions.updateAgentStatusText("ready", number, true);
        SP.functions.attachAnswerButton();
        SP.functions.setRingState();
        console.log(screenPopId);
        desk.interaction.screenPop(screenPopId, 'object=case');
    } 

    SP.functions.simulateInboundAnswer = function() {
        SP.functions.updateAgentStatusText("onCall", status);
        SP.functions.setOnCallState();
        SP.functions.detachAnswerButton();
    }

    SP.functions.simulateOutboundCall = function(number) {
        SP.functions.updateAgentStatusText("onCall", number, false);
        SP.functions.setOnCallState();
        SP.functions.detachAnswerButton();
        desk.interaction.searchAndScreenPop(number, 'object=customer');
    }



    /******** GENERAL FUNCTIONS for SFDC  ***********************/

    function cleanInboundTwilioNumber(number) {
      //twilio inabound calls are passed with +1 (number). SFDC only stores
      return number.replace('+1','');
    }

    function cleanFormatting(number) {
            //changes a SFDC formatted US number, which would be 415-555-1212
            return number.replace(' ','').replace('-','').replace('(','').replace(')','').replace('+','');
        }

    function startCall(response) {
            desk.interaction.setVisible(true);
            var cleanednumber = cleanFormatting(response.result.number);
            var inboundnum = cleanInboundTwilioNumber(response.result.number);
            params = {"PhoneNumber": cleanednumber, "CallerId": $("#callerid-entry > input").val()};
            SP.functions.updateAgentStatusText("onCall", status);
            SP.functions.setOnCallState();
            SP.functions.detachAnswerButton();
            desk.interaction.searchAndScreenPop(inboundnum, 'object=customer');
            
    }

    var saveLogcallback = function (response) {
        if (response.result) {
          console.log("saveLog result =" + response.result);
        } else {
          console.log("saveLog error = " + response.error);
        }
    };

    function saveLog(response) {

      console.log("saving log result, response:");
      var result = JSON.parse(response.result);

      console.log(response.result);

      var timeStamp = new Date().toString();
      timeStamp = timeStamp.substring(0, timeStamp.lastIndexOf(':') + 3);
      var currentDate = new Date();
      var currentDay = currentDate.getDate();
      var currentMonth = currentDate.getMonth()+1;
      var currentYear = currentDate.getFullYear();
      var dueDate = currentYear + '-' + currentMonth + '-' + currentDay;
      var saveParams = 'Subject=' + SP.calltype +' Call on ' + timeStamp;

      saveParams += '&Status=completed';
      saveParams += '&CallType=' + SP.calltype;  //should change this to reflect actual inbound or outbound
      saveParams += '&Activitydate=' + dueDate;
      saveParams += '&Phone=' + SP.state.callNumber;  //we need to get this from.. somewhere
      saveParams += '&Description=' + "test description";

      console.log("About to parse  result..");

      var result = JSON.parse(response.result);
      var objectidsubstr = result.objectId.substr(0,3);
      // object id 00Q means a lead.. adding this to support logging on leads as well as contacts.
      if(objectidsubstr == '003' || objectidsubstr == '00Q') {
          saveParams += '&whoId=' + result.objectId;
      } else {
          saveParams += '&whatId=' + result.objectId;
      }

      console.log("save params = " + saveParams);
      sforce.interaction.saveLog('Task', saveParams, saveLogcallback);
  }

});
