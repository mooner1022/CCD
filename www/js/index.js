/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function () {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function () {
        this.receivedEvent('deviceready');
        window.addEventListener("batterystatus", onBatteryStatus, false);
        
        ble.stopScan();
        var lastMac = window.localStorage.getItem("mac");
        ble.autoConnect(lastMac, connectCallback, disconnectCallback);
        
        cordova.plugins.backgroundMode.isIgnoringBatteryOptimizations(function(isIgnoring) {
            if(!isIgnoring) {
                cordova.plugins.backgroundMode.disableBatteryOptimizations();
            }
        })
        
        cordova.plugins.backgroundMode.enable();
        cordova.plugins.backgroundMode.overrideBackButton();
        cordova.plugins.backgroundMode.excludeFromTaskList();
        cordova.plugins.backgroundMode.on('activate', function() {
            cordova.plugins.backgroundMode.disableWebViewOptimizations();
        });
        cordova.plugins.backgroundMode.setDefaults({
            title: "Running in Background",
            text: "Background run test",
            icon: 'ic_launcher',
            color: 'b388ff', // hex format like 'F14F4D'
            resume: true,
            hidden: false,
            bigText: false,
            channelName: "App Background NotificationChannel", // Shown when the user views the app's notification settings
            channelDescription: "A notification channel to show notification for maintaining the background status.", // Shown when the user views the channel's settings
            showWhen: false, //(Default: true) Show the time since the notification was created
        })
        
        /*
        function success(data){
            console.log(data);
            for(var i = 0; i < data.length; i++){
                $('#device_list').append("<li>"+data[i].name+"</li>");
            }
        }
        function failure(data){
            console.log("failure\n" + data);
        }
        */
    },

    // Update DOM on a Received Event
    receivedEvent: function (id) {

    }
};

var connectedStat = false;
var devName = {};
var devMac = {};

function onBatteryStatus(status) {
    var storage = window.localStorage;
    var value = window.localStorage.getItem("battery");
    window.localStorage.setItem("chargeState", status.isPlugged);
    window.localStorage.setItem("batState", status.level);
    $('#percent_text').text(status.level + "%");
    if (status.isPlugged) {
        $('#charging_text').text("충전중");
        var leftPerc = (value - status.level);
        if (leftPerc > 0) {
            $('#left_percent_text').text("남은 충전량 " + leftPerc + "%");
            sendSerial("1");
        } else {
            $('#left_percent_text').text("충전이 완료되었습니다.");
            sendSerial("0");
        }
    } else if (!status.isPlugged) {
        $('#charging_text').text("방전중");
        $('#left_percent_text').text("");
    }
    console.log("Level: " + status.level + " isPlugged: " + status.isPlugged);
}

function findDevice() {
    console.log("start");
    $('#device_list').text("");
    openLoader();
    var numCount = 1;
    ble.scan([], 20, function (device) {
        console.log(device);
        //if(device.name == "BT05"){
        if (!(device.name == null)) {
            $('#device_list').append("<li id='" + numCount + "' class='list'> " + device.name + " (" + device.id + ")" + "</li>");
            console.log(numCount);
            devName[numCount] = device.name;
            devMac[numCount] = device.id;
            numCount++;
        }
        //}
    }, function () {
        console.log("Failed");
    });
    setTimeout(ble.stopScan,
        10000,
        function () {
            console.log("Scan complete");
            $('#text_searching').animate({
                transform: 'scaleX(1) scaleY(0)',
                height: '0px'
            }, 300);
            $('#popup_connect_search').animate({
                'bottom': 70
            }, 500);
        },
        function () {
            console.log("stopScan failed");
        }
    );
}
//걍 연결
function connectDevice(num) {
    console.log(devName[num] + ":" + devMac[num]);
    ble.stopScan();
    ble.connect(devMac[num], connectCallback, disconnectCallback);
    window.localStorage.setItem("mac", devMac[num]);
}
//자동 연결
function autoConnectDevice(num) {
    console.log(devName[num] + ":" + devMac[num]);
    ble.stopScan();
    ble.autoConnect(devMac[num], connectCallback, disconnectCallback);
    window.localStorage.setItem("mac", devMac[num]);
    window.localStorage.setItem("lastname", devName[num]);
}
function disconnectDevice(name, mac) {
    console.log(name + ":" + mac);
    ble.stopScan();
    ble.disconnect(mac, disconnectCallback, disconnectFailCallback);
}

function setDialogText(id) {
    $('#popup_confirm_text').text(devName[id] + " (" + devMac[id] + ")");
}

function openLoader() {
    $('#text_searching').animate({
        transform: 'scaleX(1) scaleY(1)',
        height: '40px'
    }, 300);
}

function sendSerial(state) {
    console.log(state);
    var preState = window.localStorage.getItem("prestate");
    if(!(preState == state)){
        var savedMac = window.localStorage.getItem("mac");
        ble.write(savedMac, "FFE0", "FFE1", stringToBytes(state), function () {
            console.log("Send Success " + state);
            console.log(savedMac + " " + "FFE0 FFE1 " + stringToBytes(state));
            window.localStorage.setItem("prestate", state);
        }, function () {
            console.log("Send Failure");
            console.log(savedMac + " " + "FFE0 FFE1 " + stringToBytes(state));
        });
    } else {
        console.log("Send calceled " + preState);
    }
}

// ASCII only
function stringToBytes(string) {
   var array = new Uint8Array(string.length);
   for (var i = 0, l = string.length; i < l; i++) {
       array[i] = string.charCodeAt(i);
    }
    return array.buffer;
}

function connectCallback() {
    console.log("Connect success");
    var storage = window.localStorage;
    var value = window.localStorage.getItem("chargeState");
    var batVal = window.localStorage.getItem("batState");
    var batSet = window.localStorage.getItem("battery");
    connectedStat = true;
    var leftPerc = (batSet - batVal);
    if(value) {
        if (leftPerc > 0) {
            sendSerial("1");
        } else if (leftPerc <= 0) {
            sendSerial("0");
        }
    }else{
        sendSerial("0");
    }
    cordova.plugins.snackbar.create('기기와 연결되었습니다.', 'INDEFINITE', "확인", function(){
        
    });
}

function disconnectCallback() {
    console.log("Disconnected");
    connectedStat = false;
    cordova.plugins.snackbar.create('기기와 연결이 해제되었습니다.', 'INDEFINITE', "확인", function(){
        
    });
    $('#popup_connect').fadeIn(100);
}

function disconnectFailCallback() {
    console.log("Disconnect Failed");
    cordova.plugins.snackbar.create('기기와 연결을 해제하지 못했습니다.', 'INDEFINITE', "확인", function(){
        
    });
}

app.initialize();
