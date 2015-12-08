(function () {
  var captureBtn = document.getElementById('capture')
  captureBtn.appendChild(document.createTextNode(chrome.i18n.getMessage('selectArea')))
  var wholeBtn = document.getElementById('whole')
  wholeBtn.appendChild(document.createTextNode(chrome.i18n.getMessage('topToBottom')))
  var selectElm = document.getElementById('selectElm')
  selectElm.appendChild(document.createTextNode(chrome.i18n.getMessage('selectElement')))

  captureBtn.addEventListener('click', function () {
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
      chrome.runtime.sendMessage(chrome.runtime.id, {
        tab: tabs[0],
        action: 'yabumiCapture'
      }, function (mes) {})
      window.close()
    })
  })
  wholeBtn.addEventListener('click', function () {
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
      chrome.runtime.sendMessage(chrome.runtime.id, {
        tab: tabs[0],
        action: 'yabumiWholeCaptureFromPopup'
      }, function () {})
      window.close()
    })
  })
  selectElm.addEventListener('click', function () {
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
      chrome.runtime.sendMessage(chrome.runtime.id, {
        tab: tabs[0],
        action: 'yabumiSelectElmFromPopup'
      }, function () {})
      window.close()
    })
  })
})()
