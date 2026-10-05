function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  SpreadsheetApp.getActive().getSheets()[0]
    .appendRow([new Date(), d.name, String(d.message).slice(0, 1000), d.anonymous]);
  return ContentService.createTextOutput('ok');
}
