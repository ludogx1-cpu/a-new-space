// Toolbar button: open the converter in a new tab. The extension needs no permissions.
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});

// First install: show the how-to page once.
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('how-to-use.html') });
});
