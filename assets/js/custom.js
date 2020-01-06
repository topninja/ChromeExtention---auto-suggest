$(document).ready(function () {
	var $body = $("body");
	// $body.on('click', '#yesBtn', function (e) {
	// 	e.preventDefault();
	// 	var $chromeTooltipWrapper = $('#chromeTooltipWrapper', $body);
	// 	$chromeTooltipWrapper.html(tooltip2Html);
	// });
	// $body.on('click', '#closeTooltipBtn', function (e) {
	// 	e.preventDefault();
	// 	var $chromeTooltipWrapper = $('#chromeTooltipWrapper', $body);
	// 	$('mark[data-index="i_' + $chromeTooltipWrapper.data('mark') + '"]', '.hwt-backdrop').removeClass('chromeTooltipMark');
	// 	$chromeTooltipWrapper.html('');
	// });
	// $body.on('click', '#dontShow', function (e) {
	// 	e.preventDefault();
	// 	$('.chromeTA').highlightWithinTextarea('destroy');
	// 	$('#chromeTooltipWrapper', $body).html('');

	// 	chrome.storage.sync.get(['chromeTooltipBlockSites'], function (result) {
	// 		console.log('Value currently is ', result.chromeTooltipBlockSites);
	// 		var sites = result.chromeTooltipBlockSites;
	// 		if (sites) {
	// 			sites.push(window.location.hostname);
	// 			chrome.storage.sync.set({ "chromeTooltipBlockSites": sites });
	// 		} else {
	// 			chrome.storage.sync.set({ "chromeTooltipBlockSites": [window.location.hostname] });
	// 		}
	// 	});
	// });

	$body.on('click', '.copy-url', function (e) {
		e.preventDefault();
		copyToClipboard($('#techspecs_product_url'));
		$(this).text('Copied!');
	});
	
	$body.on('click', '#close-tooltip', function (e) {
		chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, {from: 'custom', action: 'closeTooltip'});
		});
	});
	
	$body.on('click', '#widgetBtn', function (e) {
		e.preventDefault();
		chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {from: 'custom', action: 'renderWidget', dId: $('.chrome-tooltip').data('dId')});
        });
	});

});
// alert("in");
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
	// alert(msg);

	if (msg.action === "getDim") {
		var $tooptip = $('.chrome-tooltip');
		$tooptip.data('dId', msg.data.dId);
		$('#techspecs_product_url').text('https://techspecs.io/specs/' + msg.data.dId);
		sendResponse({dim: {
			h: $tooptip.outerHeight(),
			w: $tooptip.outerWidth()
		}})
	}
});

function copyToClipboard(element) {
	var $temp = $("<input>");
	$("body").append($temp);
	$temp.val($(element).text()).select();
	document.execCommand("copy");
	$temp.remove();
}