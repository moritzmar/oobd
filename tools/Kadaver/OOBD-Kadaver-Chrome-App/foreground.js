/*
	
	This file is part of the OOBD.org distribution.

	OOBD.org is free software; you can redistribute it and/or modify it
	under the terms of the GNU General Public License (version 2) as published
	by the Free Software Foundation and modified by the FreeRTOS exception.

	OOBD.org is distributed in the hope that it will be useful, but WITHOUT
	ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
	FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
	more details.

	For details about the protocols used, please refer to http://www.oobd.org/doku.php?id=doc:rfc_kadaver

*/
function init_WS() {
	//VIA https://developer.chrome.com/apps/app_bluetooth
	app = window.document;
	wsURL = "wss://oobd.luxen.de/websockssl";
	//wsURL = "ws://oobd.luxen.de/websock/";
	//wsURL = "ws://192.168.1.21:9000/";
	var powered = false;
	var btDeviceName = "";
	device_names = {};
	Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
		if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

	var outputWS;
	var thisChannel;

	// create random channel number
	var min = 10000000;
	var max = 99999999;
	thisChannel = Math.floor(Math.random() * (max - min + 1) + min) + "";
	console.log("Mychannel: " + thisChannel);
	outputWS = document.getElementById("outputWS");
	document.getElementById('help').onclick=function() {
					//chrome.tabs.create({'url': "http://www.oobd.org/doku.php?id=doc:tools_kadaver"});
					window.open("http://www.oobd.org/doku.php?id=doc:tools_kadaver");
				};
	
	chrome.bluetooth.onAdapterStateChanged.addListener(function(adapter) {
		console.log(adapter);
		if (adapter.powered != powered) {
			powered = adapter.powered;
			if (powered) {
				console.log("Adapter radio is on");
			} else {
				console.log("Adapter radio is off");
					setColor("carsvg", "red");

			}
		}
	});
	var updateDeviceName = function(device) {
		if (device.name.indexOf("OOBD") == 0){
			console.log("+OOBD-Dongle", device);
			device_names[device.address] = device.name;
		}
	};
	var removeDeviceName = function(device) {
		console.log("-", device);
		delete device_names[device.address];
	}

	// Add listeners to receive newly found devices and updates
	// to the previously known devices.
	chrome.bluetooth.onDeviceAdded.addListener(updateDeviceName);
	chrome.bluetooth.onDeviceChanged.addListener(updateDeviceName);
	chrome.bluetooth.onDeviceRemoved.addListener(removeDeviceName);

	// With the listeners in place, get the list of devices found in
	// previous discovery sessions, or any currently active ones,
	// along with paired devices.
	chrome.bluetooth.getDevices(function(devices) {
		for (var i = 0; i < devices.length; i++) {
			updateDeviceName(devices[i]);
		}
	});

	var onConnectedCallback = function() {
		if (chrome.runtime.lastError) {
			console.log("BT connect error");
			eventFlowControl("WSCONNECTED", chrome.runtime.lastError.message);
			showStatusLine("Dongle connection failed, try again");
				setColor("carsvg", "red");

		} else {
			// Profile implementation here.
			console.log("BT connected");
			eventFlowControl("BTCONNECTED", null);
				setColor("carsvg", "green");

		}
	};

	chrome.bluetoothSocket.onReceive.addListener(function(receiveInfo) {
		if (receiveInfo.socketId != socketId) {
			return;
		}
		// receiveInfo.data is an ArrayBuffer.
		console.log("BT Received: ", ab2str(receiveInfo.data));
		eventFlowControl("BTRECEIVE",null)
		doSend(ab2str(receiveInfo.data));
	});

	chrome.bluetoothSocket.onReceiveError.addListener(function(errorInfo) {
		// Cause is in errorInfo.error.
		console.log("BTRECVERROR:" +errorInfo.errorMessage);
			setColor("carsvg", "red");
			eventFlowControl("DONGLEFOUND",btDeviceName);

	});

	
	//################# Starting the event driven program flow by creating the first event by looking for the BT Adaptor state ############
	
	eventFlowControl("CHKBTAPAPTER", null);


	//End of Programm
	
	
	function eventFlowControl(evt, data){
	
		console.log("Incoming Event:"+evt);
		switch(evt){
			case "CHKBTAPAPTER":
				showStatusLine("Search for Bluetooth Hardware");
				checkBluetoothSocket();
				break;
			case "BTAVAILABLE":
				showStatusLine("Connect to Kadaver Server");
				connectWebserver();
				break;
			case "WSCONNECTED":
				showStatusLine("Scan for OOBD Dongles...");
				BluetoothDiscovery();
				break;
			case "DONGLEFOUND":
				showStatusLine("Connect to "+ data);
				BluetoothPairing(data);
				break;
			case "BTCONNECTED":
				normalOperation();
				break;
			case "WSDISCONNECTED":
				break;
			case "WSRECEIVE":
				triggerBarberPole("wsrx");
				break;
			case "BTRECEIVE":
				triggerBarberPole("btrx");
				break;
			case "JSONERRORRECV":
				break;
			case "WSSEND":
				triggerBarberPole("wstx");
				break;
			case "BTSEND":
				triggerBarberPole("bttx");
				break;
			case "ENDPROGRAM":
				chrome.app.window.AppWindow.close();
				app.close();
				break;
		}
	}
	
	function checkBluetoothSocket() {
		console.log("State checkBluetoothSocket");
		chrome.bluetooth.getAdapterState(function(adapter) {
			console.log("Adapter " + adapter.address + ": " + adapter.name);
			powered = adapter.powered;
			if (powered) {
				eventFlowControl("BTAVAILABLE",null)
			}else{
				var dialog = document.getElementById('BTonDialog');
				dialog.showModal();
				dialog.addEventListener('close', function(event) {
					if (dialog.returnValue == 'yes') {
						eventFlowControl("CHKBTAPAPTER",null)
					} else {
						eventFlowControl("ENDPROGRAM",null)
					}
				});
			}
		});
	}

	function connectWebserver() {
		console.log("State connectWebserver");
		
		// http://demo.agektmr.com/dialog/ 

		websocket = new WebSocket(wsURL);
		console.log("new WS???");
		websocket.onopen = function(evt) {
			wsOnOpen(evt);
				setColor("earthsvg", "green");

		};
		websocket.onclose = function(evt) {
			wsOnClose(evt)
			setColor("earthsvg", "black");
		};
		websocket.onmessage = function(evt) {
			wsOnMessage(evt)
		};
		websocket.onerror = function(evt) {
			console.log("WS reports error..."+evt.type);
			console.log(evt);
			if (evt.type=="error"){
				setColor("earthsvg", "red");
				console.log("WS Error handling");
				app.getElementById('ws_return_value').value=wsURL;
				var wsdialog = app.getElementById('wsdialog');
				app.getElementById('wsCloseDialogBtn').onclick = function() {
					wsURL = app.getElementById('ws_return_value').value;
					console.log("new WS Server:"+wsURL);
					wsdialog.close(wsURL);
				};
				wsdialog.addEventListener('close', function (event) {
					console.log("Dialog closed with "+wsdialog.returnValue);
					if (wsdialog.returnValue != 'no') {
						eventFlowControl("BTAVAILABLE",null);
					} else {
						eventFlowControl("ENDPROGRAM",null);
					}
				});
				wsdialog.showModal();
			}
			
			wsOnError(evt)
		};

	}

	function BluetoothDiscovery() {
		console.log("State doBluetoothDiscovery");
		chrome.bluetooth.startDiscovery(function() {
			// Stop discovery after 30 seconds.
			console.log("BluetoothDiscovery  2");
			setTimeout(function() {
				clearTimeout();
				console.log("BluetoothDiscovery  3");
				chrome.bluetooth.stopDiscovery(function() {});
				console.log("Discovery Ends -nr of dongles found: "+Object.size(device_names))
				for (var i in device_names) {
					console.log("data-address=" + device_names[i] + " [" + i + "]");
				}
				if (Object.size(device_names)==0){
					var noDongleDialog = app.getElementById('noDongleDialog');
					noDongleDialog.addEventListener('close', function (event) {
						console.log("Dialog closed with "+noDongleDialog.returnValue);
						if (noDongleDialog.returnValue != 'no') {
							eventFlowControl("WSCONNECTED",null);
						} else {
							eventFlowControl("ENDPROGRAM",null);
						}
					});
					noDongleDialog.showModal();
				}else if (Object.size(device_names)>1){
					setColor("carsvg", "yellow");
					var dongleSelect = document.getElementById("dongleSelect");
					while(dongleSelect.options.length > 0){                
						dongleSelect.remove(0);
					}
					for (var i in device_names) { // 
							var option = document.createElement("option");
							option.text = device_names[i];
							option.value = i;
							dongleSelect.add(option);
					}
					var dongleSelectDialog=app.getElementById('dongleSelectDialog');
					app.getElementById('dongleSelectButton').onclick  = function() {
						dongleSelectDialog.close(dongleSelect.value);
						};
					dongleSelectDialog.addEventListener('close', function (event) {
						console.log("Dongle select Dialog closed with "+dongleSelectDialog.returnValue);
						if (dongleSelectDialog.returnValue != 'no') {
							eventFlowControl("DONGLEFOUND",dongleSelectDialog.returnValue);
						} else {
							eventFlowControl("ENDPROGRAM",null);
						}
					});
					dongleSelectDialog.showModal();

				}else if (Object.size(device_names)==1){
					setColor("carsvg", "yellow");
					for (var i in device_names) { // 
						btDeviceName=i;
						eventFlowControl("DONGLEFOUND",i);
					}
				}
				
			}, 5000);
		});
	}

	function BluetoothPairing(address) {
		console.log("State BluetoothPairing with "+address);
	//"49aca6e6-0596-11e4-8f46-b2227cce2b54", "49aca9f2-0596-11e4-8f46-b2227cce2b54", 
		console.log("connectTo " + device_names[address]);
/*		var uuid = 1105;
		var uuid = "fa87c0d0-afac-11de-8a39-0800200c9a66";
		var uuid = "00001101-0000-1000-8000-00805f9b34fb";
		var uuid = "0x1101";
		var uuid = "cc8894db-f550-4a33-8a02-fd8a99fe38fb"
		var uuid = "00001101-0000-1000-8000-00805f9b34fb";
*/		var uuid = "1101";


		chrome.bluetoothSocket.create(function(createInfo) {
			window.socketId = createInfo.socketId;
			console.log(uuid, createInfo, address);
			chrome.bluetoothSocket.connect(createInfo.socketId,
				address, uuid, onConnectedCallback);
		});
	}

	function normalOperation() {
		setColor("laptopsvg", "green");
		app.getElementById("channel").innerHTML = thisChannel;
		showStatusLine("Connection Number");
		startService();
		console.log("State normalOperation");
		return 99;
	}


	function ab2str(buf) {
		return String.fromCharCode.apply(null, new Uint8Array(buf));
	}

	function str2ab(str) {
		var buf = new ArrayBuffer(str.length);
		var bufView = new Uint8Array(buf);
		for (var i = 0, strLen = str.length; i < strLen; i++) {
			bufView[i] = str.charCodeAt(i);
		}
		return buf;
	}


	function showStatusLine(StatusTtext){
	app.getElementById("status").innerHTML = StatusTtext;
}	

	function wsOnOpen(evt) {
		eventFlowControl("WSCONNECTED",null);
		doSend("OOBD rocks");
	}

	function wsOnClose(evt) {
		eventFlowControl("WSDISCONNECTED",null);
		setColor("earthsvg", "red");
	}

	function wsOnMessage(evt) {

		eventFlowControl("WSRECEIVE",null);
		try {
			obj = JSON.parse(evt.data);
			if (obj.msg) {
				console.log("WS receive: "+obj.msg);
				sendMessage(str2ab(atob(obj.msg)));
			}
		} catch (err) {
			eventFlowControl("JSONERRORRECV",null);
		}
	}

	function wsOnError(evt) {
		//error handling defined already at ws contructor
	}

	function doSend(message) {
		var msg = JSON.stringify({
			reply: btoa(message),
			channel: btoa(thisChannel)
		});
		console.log("WSSend: "+message);
		eventFlowControl("WSSEND",null);
		websocket.send(msg);
	}

	function writeToScreen(message) {
		var pre = document.createElement("p");
		pre.style.wordWrap = "break-word";
		pre.innerHTML = message;
		outputWS.appendChild(pre);
	}


	function startService() {
		console.log("Starting...");
		sendMessage(str2ab("\r"));

		setTimeout(function() {

			sendMessage(str2ab("p 0 0 0\r"));
		}, 200);


	}

	function sendMessage(data) {
		chrome.bluetoothSocket.send(window.socketId, data, function(bytes_sent) {
			if (chrome.runtime.lastError) {
				console.log("BTSENDERROR" + chrome.runtime.lastError.message);
			} else {
				eventFlowControl("BTSEND",null)
				console.log("BTSEND: Sent " + bytes_sent + " bytes:" + ab2str(data));
			}
		});
	}



	function setColor(element, color) {
		app.getElementById(element).style.fill = color;
	}

	
	
	function triggerBarberPole(name){
		// retrieve the element
		element = app.getElementById(name);
		var newone = element.cloneNode(true);
		element.parentNode.replaceChild(newone, element);
		

	}
}
window.addEventListener("load", init_WS, false);
