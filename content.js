(function () {
  'use strict'
  const ESC_KEY_CODE = 27
  const JACKUP_HEIGHT = 30
  const REMOVE_GYAZOMENU_EVENT = new Event('removeGyazoMenu')

  if (/gyazo\.com/.test(location.hostname)) {
    document.documentElement.setAttribute('data-extension-installed', true)
  }

  function check_duplicate_capture () {
    return document.getElementsByClassName('gyazo-jackup-element').length > 0
  }

  function isPressCommandKey (event) {
    //  Return true when
    //  Press CommandKey on MacOSX or CtrlKey on Windows or Linux
    if (!(event instanceof MouseEvent || event instanceof KeyboardEvent)) {
      return false
    }
    if (navigator.platform.match(/mac/i).length > 0) {
      return event.metaKey || event.keyIdentifier === 'Meta'
    } else {
      return event.ctrlKey || event.keyIdentifier === 'Ctrl'
    }
  }

  function changeFixedElementToAbsolute () {
    Array.prototype.slice.apply(document.querySelectorAll('*')).filter(function (item) {
      return (window.window.getComputedStyle(item).position === 'fixed')
    }).forEach(function (item) {
      item.classList.add('gyazo-whole-capture-onetime-absolute')
      item.style.position = 'absolute'
    })
  }

  function restoreFixedElement () {
    var fixedElms = document.getElementsByClassName('gyazo-whole-capture-onetime-absolute')
    Array.prototype.slice.apply(fixedElms).forEach(function (item) {
      item.classList.remove('gyazo-whole-capture-onetime-absolute')
      item.style.position = 'fixed'
    })
  }

  function lockScroll () {
    var overflow = document.documentElement.style.overflow
    var overflowY = document.documentElement.style.overflowY
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overflowY = 'hidden'
    return {overflow: overflow, overflowY: overflowY}
  }

  function unlockScroll (old) {
    old = old || {overflow: 'auto', overflowY: 'auto'}
    document.documentElement.style.overflow = old.overflow
    document.documentElement.style.overflowY = old.overflowY
  }

  function getZoomAndScale () {
    var zoom = Math.round(window.outerWidth / window.innerWidth * 100) / 100
    var scale = window.devicePixelRatio / zoom
    // XXX: on Windows, when window is not maximum, it should tweak zoom.(Chrome zoom level 1 is 1.10)
    var isWindows = navigator.platform.match(/^win/i)
    var isMaximum = (window.outerHeight === screen.availHeight && window.outerWidth === screen.availWidth)
    if (isWindows && !isMaximum && zoom > 1.00 && zoom < 1.05) {
      zoom = 1.00
    }
    return {
      zoom: zoom,
      scale: scale
    }
  }

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    var actions = {
      notification: function () {
        let notificationContainer = document.querySelector('.gyazo-menu.gyazo-menu-element') || document.querySelector('.gyazo-menu.gyazo-notification')
        if (notificationContainer) {
          notificationContainer.classList.add('gyazo-notification')
        } else {
          notificationContainer = document.createElement('div')
          notificationContainer.className = 'gyazo-menu gyazo-notification'
          document.body.appendChild(notificationContainer)
        }
        let title = request.title || ''
        let message = request.message || ''
        let showImage = ''
        if (request.imagePageUrl) {
          showImage = `
            <a href='${request.imagePageUrl}' target='_blank'>
              <img class='image' src='${request.imageUrl}' />
            </a>`
        } else {
          showImage = `<img class='image' src='${chrome.extension.getURL('/icons/loading.gif')}' />`
        }
        notificationContainer.innerHTML = `
        <span class='gyazo-notification-title'>${title}</span><br />
        <span class='gyazo-notification-message'>${message}</span><br />
        ${showImage}
        `
        if (request.isFinish) {
          window.setTimeout(function () {
            document.body.removeChild(notificationContainer)
          }, 5000)
        }
        sendResponse()
      },
      insertMenu: function () {
        let gyazoMenu = document.querySelector('.gyazo-menu')
        if (gyazoMenu) {
          window.dispatchEvent(REMOVE_GYAZOMENU_EVENT)
          return true
        }
        let hideMenu = function () {
          document.body.removeChild(gyazoMenu)
          window.dispatchEvent(REMOVE_GYAZOMENU_EVENT)
        }
        gyazoMenu = document.createElement('div')
        gyazoMenu.className = 'gyazo-menu gyazo-menu-element'

        let selectElementBtn = document.createElement('div')
        selectElementBtn.className = 'gyazo-big-button gyazo-button gyazo-menu-element'
        selectElementBtn.textContent = chrome.i18n.getMessage('selectElement')

        let selectAreaBtn = document.createElement('div')
        selectAreaBtn.className = 'gyazo-big-button gyazo-button gyazo-menu-element'
        selectAreaBtn.textContent = chrome.i18n.getMessage('selectArea')

        let windowCaptureBtn = document.createElement('div')
        windowCaptureBtn.className = 'gyazo-big-button gyazo-button gyazo-menu-element'
        windowCaptureBtn.textContent = chrome.i18n.getMessage('captureWindow') + ' [W]'

        let wholeCaptureBtn = document.createElement('div')
        wholeCaptureBtn.className = 'gyazo-small-button gyazo-button gyazo-menu-element'
        wholeCaptureBtn.textContent = chrome.i18n.getMessage('topToBottom') + ' [D]'
        let hotKeySettings = function (sKeyElm) {
          let hotKey = function (event) {
            window.removeEventListener('keydown', hotKey)
            if (event.keyCode === ESC_KEY_CODE) {
              hideMenu()
            }
            switch (String.fromCharCode(event.keyCode)) {
              case 'W':
                windowCaptureBtn.click()
                break
              case 'D':
                wholeCaptureBtn.click()
                break
              case 'S':
                sKeyElm.click()
                break
            }
          }
          window.addEventListener('keydown', hotKey)
        }
        document.body.appendChild(gyazoMenu)
        gyazoMenu.appendChild(selectElementBtn)
        gyazoMenu.appendChild(windowCaptureBtn)
        gyazoMenu.appendChild(selectAreaBtn)
        gyazoMenu.appendChild(wholeCaptureBtn)
        chrome.storage.sync.get({behavior: 'element'}, function (item) {
          if (item.behavior === 'element') {
            // Default behavior is select element
            selectAreaBtn.textContent += ' [S]'
            selectElementBtn.classList.add('gyazo-button-active')
            hotKeySettings(selectAreaBtn)
            window.requestAnimationFrame(actions.gyazoSelectElm)
          } else if (item.behavior === 'area') {
            // Default behavior is select area
            selectElementBtn.textContent += ' [S]'
            selectAreaBtn.classList.add('gyazo-button-active')
            hotKeySettings(selectElementBtn)
            actions.gyazoCapture()
          }
        })
        selectAreaBtn.addEventListener('click', function () {
          hideMenu()
          window.requestAnimationFrame(function () {
            actions.gyazoCapture()
          })
        })
        selectElementBtn.addEventListener('click', function () {
          hideMenu()
          window.requestAnimationFrame(function () {
            actions.gyazoSelectElm()
          })
        })
        windowCaptureBtn.addEventListener('click', function () {
          hideMenu()
          window.requestAnimationFrame(function () {
            actions.gyazocaptureWindow()
          })
        })
        wholeCaptureBtn.addEventListener('click', function () {
          hideMenu()
          window.requestAnimationFrame(function () {
            actions.gyazoWholeCapture()
          })
        })
      },
      changeFixedElementToAbsolute: function () {
        changeFixedElementToAbsolute()
        var waitScroll = function () {
          if (Math.abs(window.scrollX - request.scrollTo.x) < 1 && Math.abs(window.scrollY - request.scrollTo.y) < 1) {
            sendResponse()
          } else {
            window.requestAnimationFrame(waitScroll)
          }
        }
        window.requestAnimationFrame(waitScroll)
      },
      gyazocaptureWindow: function () {
        var data = {}
        var scaleObj = getZoomAndScale()
        data.w = window.innerWidth
        data.h = window.innerHeight
        data.x = window.scrollX
        data.y = window.scrollY
        data.t = document.title
        data.u = location.href
        data.s = scaleObj.scale
        data.z = scaleObj.zoom
        data.positionX = window.scrollX
        data.positionY = window.scrollY
        data.defaultPositon = window.scrollY
        data.innerHeight = window.innerHeight
        chrome.runtime.sendMessage(chrome.runtime.id, {
          action: 'gyazoCaptureWithSize',
          data: data,
          tab: request.tab
        }, function () {})
      },
      gyazoSelectElm: function () {
        const MARGIN = 3
        if (check_duplicate_capture()) {
          return false
        }
        document.body.classList.add('gyazo-select-element-mode')
        var jackup = document.createElement('div')
        jackup.classList.add('gyazo-jackup-element')
        document.body.appendChild(jackup)
        var layer = document.createElement('div')
        layer.className = 'gyazo-crop-select-element'
        document.body.appendChild(layer)
        layer.style.background = 'rgba(9, 132, 222, 0.55)'
        layer.style.margin = '-0.5px'
        layer.style.border = '0.5px solid rgb(9, 132, 222)'
        layer.style.position = 'fixed'
        layer.style.pointerEvents = 'none'
        layer.style.zIndex = 2147483646 // Maximun number of 32bit Int - 1
        var allElms = Array.prototype.slice.apply(document.body.querySelectorAll('*')).filter(function (item) {
          return !item.classList.contains('gyazo-crop-select-element') &&
                 !item.classList.contains('gyazo-menu-element')
        })
        var moveLayer = function (event) {
          var item = event.target
          event.stopPropagation()
          var rect = item.getBoundingClientRect()
          layer.style.width = rect.width + 'px'
          layer.style.height = rect.height + 'px'
          layer.style.left = rect.left + 'px'
          layer.style.top = rect.top + 'px'
        }
        var takeMargin = function () {
          layer.style.width = parseInt(window.getComputedStyle(layer).width, 10) + MARGIN * 2 + 'px'
          layer.style.height = parseInt(window.getComputedStyle(layer).height, 10) + MARGIN * 2 + 'px'
          layer.style.left = parseInt(window.getComputedStyle(layer).left, 10) - MARGIN + 'px'
          layer.style.top = parseInt(window.getComputedStyle(layer).top, 10) - MARGIN + 'px'
        }
        var keydownHandler = function (event) {
          if (event.keyCode === ESC_KEY_CODE) {
            cancel()
          }else if (isPressCommandKey(event)) {
            takeMargin()
          }
        }
        var keyUpHandler = function (event) {
          if (isPressCommandKey(event)) {
            layer.style.width = parseInt(window.getComputedStyle(layer).width, 10) - MARGIN * 2 + 'px'
            layer.style.height = parseInt(window.getComputedStyle(layer).height, 10) - MARGIN * 2 + 'px'
            layer.style.left = parseInt(window.getComputedStyle(layer).left, 10) + MARGIN + 'px'
            layer.style.top = parseInt(window.getComputedStyle(layer).top, 10) + MARGIN + 'px'
          }
        }
        var cancel = function () {
          document.body.removeChild(jackup)
          document.body.removeChild(layer)
          document.body.classList.remove('gyazo-select-element-mode')
          window.removeEventListener('contextmenu', cancel)
          document.removeEventListener('keydown', keydownHandler)
          document.removeEventListener('keyup', keyUpHandler)
          Array.prototype.slice.apply(document.querySelectorAll('.gyazo-select-element-cursor-overwrite')).forEach(function (item) {
            item.classList.remove('gyazo-select-element-cursor-overwrite')
          })
          restoreFixedElement()
        }
        window.addEventListener('removeGyazoMenu', cancel)
        window.addEventListener('contextmenu', cancel)
        document.addEventListener('keydown', keydownHandler)
        document.addEventListener('keyup', keyUpHandler)
        var clickElement = function (event) {
          event.stopPropagation()
          event.preventDefault()
          document.body.classList.remove('gyazo-select-element-mode')
          allElms.forEach(function (item) {
            if (item.classList.contains('gyazo-select-element-cursor-overwrite')) {
              item.classList.remove('gyazo-select-element-cursor-overwrite')
            }
            item.removeEventListener('mouseover', moveLayer)
            item.removeEventListener('click', clickElement)
          })
          var data = {}
          var scaleObj = getZoomAndScale()
          data.w = parseFloat(layer.style.width)
          data.h = parseFloat(layer.style.height)
          data.x = window.scrollX + layer.offsetLeft
          data.y = window.scrollY + layer.offsetTop
          data.t = document.title
          data.u = location.href
          data.s = scaleObj.scale
          data.z = scaleObj.zoom
          data.positionX = window.scrollX
          data.positionY = window.scrollY
          data.innerHeight = window.innerHeight
          document.body.removeChild(layer)
          if (document.querySelector('.gyazo-menu')) {
            document.body.removeChild(document.querySelector('.gyazo-menu'))
          }
          jackup.style.height = (window.innerHeight + JACKUP_HEIGHT) + 'px'
          window.removeEventListener('contextmenu', cancel)
          window.removeEventListener('keydown', keydownHandler)
          document.removeEventListener('keyup', keyUpHandler)
          if (layer.offsetTop >= 0 && layer.offsetTop + layer.offsetHeight <= window.innerHeight) {
            // Only when required scroll
            changeFixedElementToAbsolute()
          }
          var overflow = lockScroll()
          var finish = function () {
            if (document.getElementsByClassName('gyazo-crop-select-element').length > 0) {
              return window.requestAnimationFrame(finish)
            }
            window.requestAnimationFrame(function () {
              chrome.runtime.sendMessage(chrome.runtime.id, {
                action: 'gyazoCaptureWithSize',
                data: data,
                tab: request.tab
              }, function () {
                restoreFixedElement()
                document.body.removeChild(jackup)
                unlockScroll(overflow)
              })
            })
          }
          window.requestAnimationFrame(finish)
        }
        window.requestAnimationFrame(function () {
          allElms.forEach(function (item) {
            item.addEventListener('mouseover', moveLayer)
            item.addEventListener('click', clickElement)
          })
        })
      },
      gyazoCapture: function () {
        if (check_duplicate_capture()) {
          return false
        }
        var startX
        var startY
        var data = {}
        var tempUserSelect = document.body.style.webkitUserSelect
        var layer = document.createElement('div')
        var jackup = document.createElement('div')
        jackup.classList.add('gyazo-jackup-element')
        document.body.appendChild(jackup)
        var pageHeight = Math.max(document.body.clientHeight, document.body.offsetHeight, document.body.scrollHeight)
        layer.style.position = 'absolute'
        layer.style.left = document.body.clientLeft + 'px'
        layer.style.top = document.body.clientTop + 'px'
        layer.style.width = Math.max(document.body.clientWidth, document.body.offsetWidth, document.body.scrollWidth) + 'px'
        layer.style.height = pageHeight + 'px'
        layer.style.zIndex = 2147483646 // Maximun number of 32bit Int - 1
        layer.style.cursor = 'crosshair'
        layer.className = 'gyazo-select-layer'
        document.body.style.webkitUserSelect = 'none'
        var selectionElm = document.createElement('div')
        layer.appendChild(selectionElm)
        document.body.appendChild(layer)
        selectionElm.styleUpdate = function (styles) {
          Object.keys(styles).forEach(function (key) {
            selectionElm.style[key] = styles[key]
          })
        }
        selectionElm.styleUpdate({
          background: 'rgba(92, 92, 92, 0.3)',
          position: 'absolute'
        })
        var cancelGyazo = function () {
          document.body.removeChild(layer)
          document.body.removeChild(jackup)
          document.body.style.webkitUserSelect = tempUserSelect
          document.removeEventListener('keydown', keydownHandler)
          window.removeEventListener('contextmenu', cancelGyazo)
          restoreFixedElement()
          if (document.querySelector('.gyazo-menu')) {
            document.body.removeChild(document.querySelector('.gyazo-menu'))
          }
        }
        window.addEventListener('removeGyazoMenu', cancelGyazo)
        var keydownHandler = function (event) {
          if (event.keyCode === ESC_KEY_CODE) {
            //  If press Esc Key, cancel it
            cancelGyazo()
          }
        }
        var mousedownHandler = function (e) {
          let gyazoMenu = document.querySelector('.gyazo-menu')
          if (gyazoMenu) {
            document.body.removeChild(gyazoMenu)
          }
          startX = e.pageX
          startY = e.pageY
          selectionElm.styleUpdate({
            border: '1px solid rgba(255, 255, 255, 0.8)',
            left: startX + 'px',
            top: startY + 'px'
          })
          layer.removeEventListener('mousedown', mousedownHandler)
          layer.addEventListener('mousemove', mousemoveHandler)
          layer.addEventListener('mouseup', mouseupHandler)
        }
        var mousemoveHandler = function (e) {
          selectionElm.styleUpdate({
            width: (Math.abs(e.pageX - startX) - 1) + 'px',
            height: (Math.abs(e.pageY - startY) - 1) + 'px',
            left: Math.min(e.pageX, startX) + 'px',
            top: Math.min(e.pageY, startY) + 'px'
          })
        }
        var mouseupHandler = function (e) {
          document.body.style.webkitUserSelect = tempUserSelect
          document.removeEventListener('keydown', keydownHandler)
          window.addEventListener('contextmenu', function (event) {
            cancelGyazo()
            event.preventDefault()
          })
          var scaleObj = getZoomAndScale()
          var rect = selectionElm.getBoundingClientRect()
          data.w = rect.width
          data.h = rect.height
          if (data.h < 1 || data.w < 1) {
            document.body.removeChild(layer)
            return false
          }
          data.x = rect.left + window.scrollX
          data.y = rect.top + window.scrollY
          data.t = document.title
          data.u = location.href
          data.s = scaleObj.scale
          data.z = scaleObj.zoom
          data.positionX = window.scrollX
          data.positionY = window.scrollY
          data.innerHeight = window.innerHeight
          document.body.removeChild(layer)
          if (document.querySelector('.gyazo-menu')) {
            document.body.removeChild(document.querySelector('.gyazo-menu'))
          }
          var overflow = lockScroll()
          jackup.style.height = (window.innerHeight + JACKUP_HEIGHT) + 'px'
          // wait for rewrite by removeChild
          let finish = function () {
            if (document.getElementsByClassName('gyazo-select-layer').length > 0) {
              return window.requestAnimationFrame(finish)
            }
            window.requestAnimationFrame(function () {
              chrome.runtime.sendMessage(chrome.runtime.id, {
                action: 'gyazoCaptureWithSize',
                data: data,
                tab: request.tab
              }, function () {
                document.body.removeChild(jackup)
                unlockScroll(overflow)
                restoreFixedElement()
              })
            })
          }
          window.requestAnimationFrame(finish)
        }
        layer.addEventListener('mousedown', mousedownHandler)
        document.addEventListener('keydown', keydownHandler)
        window.addEventListener('contextmenu', cancelGyazo)
      },
      gyazoWholeCapture: function () {
        if (check_duplicate_capture()) {
          return false
        }
        var overflow = lockScroll()
        var data = {}
        var scaleObj = getZoomAndScale()
        data.w = window.innerWidth
        data.h = Math.max(document.body.clientHeight, document.body.offsetHeight, document.body.scrollHeight)
        data.x = 0
        data.y = 0
        data.t = document.title
        data.u = location.href
        data.s = scaleObj.scale
        data.z = scaleObj.zoom
        data.positionX = window.scrollX
        data.positionY = window.scrollY
        data.innerHeight = window.innerHeight
        var jackup = document.createElement('div')
        jackup.classList.add('gyazo-jackup-element')
        document.body.appendChild(jackup)
        jackup.style.height = (data.h + 30) + 'px'
        chrome.runtime.sendMessage(chrome.runtime.id, {
          action: 'gyazoCaptureWithSize',
          data: data,
          tab: request.tab
        }, function () {
          document.body.removeChild(jackup)
          unlockScroll(overflow)
        })
      }
    }
    if (request.action in actions) {
      actions[request.action]()
    }
    return true
  })
})()
