var itemsByNotificationId = {};
var itemsByExistingId = {};
var searchedItems = {};

chrome.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
  var searchFilter = {
    state: "complete",
    exists: true, 
    query: [downloadItem.filename]
  };
  chrome.downloads.search(searchFilter, function (downloadItems) {
    var foundFile = false;
      for (i = 0; i <  downloadItems.length; i++) {
        if (downloadItems[i].fileSize == downloadItem.fileSize || (downloadItems[i].url == downloadItem.url && downloadItem.fileSize == 0)) {
          foundFile = true;
          chrome.downloads.pause(downloadItem.id);
          itemsByExistingId[downloadItems[i].id] = {exists: true};
          chrome.notifications.create({
            type: "basic",
            iconUrl: "images/icon128.png",
            title: chrome.i18n.getMessage("fileExistsTitle"),
            message: chrome.i18n.getMessage("fileExistsMessage", downloadItem.filename),
            contextMessage: chrome.i18n.getMessage("contextMessage"),
            isClickable: true,
            buttons: [{title: chrome.i18n.getMessage("btnOpenExistingFile"), iconUrl: "images/open.png"},{title: chrome.i18n.getMessage("btnDownloadAnyway"), iconUrl: "images/download.png"}]
          }, function (notificationId) {
            if (itemsByExistingId[downloadItems[i].id].exists) {
              itemsByNotificationId[notificationId] = {foundItem: downloadItems[i], downloadItem: downloadItem, suggest: suggest};
              itemsByExistingId[downloadItems[i].id] = {notificationId: notificationId, suggest: suggest};
            } else {
              chrome.notifications.clear(notificationId);
              chrome.downloads.resume(downloadItem.id);
              suggest();
            }
          });
          break;
        }
      }
      if (!foundFile) {
        suggest();
      }
  });
  return true;
});

chrome.downloads.onChanged.addListener(function (downloadDelta) {
  if (itemsByExistingId[downloadDelta.id]) {
    if (downloadDelta.exists && downloadDelta.exists.previous === true && downloadDelta.exists.current === false) {
      itemsByExistingId[downloadDelta.id] = {exists: false};
    }
  }
});

chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
  if (itemsByNotificationId[notificationId]) {
    chrome.downloads.cancel(itemsByNotificationId[notificationId].downloadItem.id);
    chrome.downloads.erase({id: itemsByNotificationId[notificationId].downloadItem.id});
    delete itemsByExistingId[itemsByNotificationId[notificationId].foundItem.id];
    delete itemsByNotificationId[notificationId];
  }
});

chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
  if (itemsByNotificationId[notificationId]) {
    if (buttonIndex === 0) {
      chrome.notifications.clear(notificationId);
      chrome.downloads.cancel(itemsByNotificationId[notificationId].downloadItem.id);
      chrome.downloads.erase({id: itemsByNotificationId[notificationId].downloadItem.id});
      chrome.downloads.open(itemsByNotificationId[notificationId].foundItem.id);
    } else if (buttonIndex === 1) {
      chrome.notifications.clear(notificationId);
      chrome.downloads.resume(itemsByNotificationId[notificationId].downloadItem.id);
      itemsByNotificationId[notificationId].suggest();
    }
    delete itemsByExistingId[itemsByNotificationId[notificationId].foundItem.id];
    delete itemsByNotificationId[notificationId];
  }
});

chrome.notifications.onClicked.addListener(function (notificationId) {
  if (itemsByNotificationId[notificationId]) {
    chrome.notifications.clear(notificationId);
    chrome.downloads.cancel(itemsByNotificationId[notificationId].downloadItem.id);
    chrome.downloads.erase({id: itemsByNotificationId[notificationId].downloadItem.id});
    chrome.downloads.show(itemsByNotificationId[notificationId].foundItem.id);
    delete itemsByExistingId[itemsByNotificationId[notificationId].foundItem.id];
    delete itemsByNotificationId[notificationId];
  }
});