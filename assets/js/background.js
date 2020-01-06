
chrome.runtime.onInstalled.addListener(function() {	
	chrome.storage.sync.set({"chromeTooltipBlockSites": []});
});


/*******************/

// Listen for port messages
chrome.runtime.onConnect.addListener(function(port) {
});

// Listen for message to reload current page
chrome.runtime.onMessage.addListener(function(message, sender, send_response) {
   // add group 
        if (message.type == 'addGroup') {
         
        }
});

function getCurrentDate(){
	var d = new Date($.now());
	return d.getDate();
}