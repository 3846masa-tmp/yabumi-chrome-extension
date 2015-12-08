(function () {
  'use strict'

  if (window.__embededYabumiContentJS) {
    return
  }
  window.__embededYabumiContentJS = true

  const ESC_KEY_CODE = 27
  const JACKUP_HEIGHT = 30
  const REMOVE_GYAZOMENU_EVENT = new window.Event('removeYabumiMenu')

  if (/yabumi\.com/.test(location.hostname)) {
    document.documentElement.setAttribute('data-extension-installed', true)
  }

  function isPressCommandKey (event) {
    //  Return true when
    //  Press CommandKey on MacOSX or CtrlKey on Windows or Linux
    if (!(event instanceof MouseEvent || event instanceof KeyboardEvent)) {
      return false
    }
    if (navigator.platform.match(/mac/i)) {
      return event.metaKey || event.keyIdentifier === 'Meta'
    } else {
      return event.ctrlKey || event.keyIdentifier === 'Control'
    }
  }

  function changeFixedElementToAbsolute () {
    Array.prototype.slice.apply(document.querySelectorAll('*')).filter(function (item) {
      return (window.window.getComputedStyle(item).position === 'fixed')
    }).forEach(function (item) {
      item.classList.add('yabumi-whole-capture-onetime-absolute')
      item.style.position = 'absolute'
    })
  }

  function restoreFixedElement () {
    var fixedElms = document.getElementsByClassName('yabumi-whole-capture-onetime-absolute')
    Array.prototype.slice.apply(fixedElms).forEach(function (item) {
      item.classList.remove('yabumi-whole-capture-onetime-absolute')
      item.style.position = 'fixed'
    })
  }

  function lockScroll () {
    var overflow = document.documentElement.style.overflow
    var overflowY = document.documentElement.style.overflowY
    var marginRight = document.documentElement.style.marginRight
    var _w = document.documentElement.getBoundingClientRect().width
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overflowY = 'hidden'
    var w = document.documentElement.getBoundingClientRect().width
    var scrollBarWidth = w - _w
    console.log(scrollBarWidth)
    document.documentElement.style.marginRight = `${scrollBarWidth}px`
    return {overflow: overflow, overflowY: overflowY, marginRight: marginRight}
  }

  function unlockScroll (old) {
    old = old || {overflow: 'auto', overflowY: 'auto'}
    document.documentElement.style.overflow = old.overflow
    document.documentElement.style.overflowY = old.overflowY
    document.documentElement.style.marginRight = old.marginRight
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
        let notificationContainer = document.querySelector('.yabumi-menu.yabumi-menu-element.yabumi-notification') || document.querySelector('.yabumi-menu.yabumi-notification')
        if (notificationContainer) {
          notificationContainer.classList.add('yabumi-notification')
        } else {
          notificationContainer = document.createElement('div')
          notificationContainer.className = 'yabumi-menu yabumi-notification'
          document.body.appendChild(notificationContainer)
        }
        let title = request.title ? `<div class='yabumi-notification-title'>${request.title}</div>` : ''
        let message = request.message ? `<div class='yabumi-notification-message'>${request.message}</div>` : ''
        let showImage = ''
        if (request.imagePageUrl) {
          showImage = `
            <iframe style='display:none' src='${request.imageStoreUrl}'></iframe>
            <a href='${request.imagePageUrl}' target='_blank'>
              <img class='image' src='${request.imageUrl}' />
            </a>`
        } else {
          showImage = `<span class='yabumi-icon-spinner3 yabumi-spin'></span>`
        }
        notificationContainer.innerHTML = `${title}${message}${showImage}`
        if (request.isFinish) {
          notificationContainer.querySelector('.image').addEventListener('load', function () {
            window.setTimeout(function () {
              if (document.body.contains(notificationContainer)) {
                document.body.removeChild(notificationContainer)
              }
            }, 5000)
          })
        }
        sendResponse()
      },
      insertMenu: function () {
        let yabumiMenu = document.querySelector('.yabumi-menu:not(.yabumi-notification)')
        if (yabumiMenu) {
          document.body.removeChild(yabumiMenu)
          window.dispatchEvent(REMOVE_GYAZOMENU_EVENT)
          return true
        }
        let hideMenu = function () {
          if (document.body.contains(yabumiMenu)) {
            document.body.removeChild(yabumiMenu)
          }
          window.dispatchEvent(REMOVE_GYAZOMENU_EVENT)
        }
        yabumiMenu = document.createElement('div')
        yabumiMenu.className = 'yabumi-menu yabumi-menu-element'

        let createButton = function (iconClass, text, shortcutKey) {
          let btn = document.createElement('div')
          btn.className = 'yabumi-big-button yabumi-button yabumi-menu-element'
          btn.setAttribute('title', 'Press: ' + shortcutKey)

          let iconElm = document.createElement('div')
          iconElm.className = 'yabumi-button-icon ' + iconClass

          let textElm = document.createElement('div')
          textElm.className = 'yabumi-button-text'
          textElm.textContent = text

          btn.appendChild(iconElm)
          btn.appendChild(textElm)

          return btn
        }

        let selectElementBtn = createButton('yabumi-icon-selection', chrome.i18n.getMessage('selectElement'), 'E')
        let selectAreaBtn = createButton('yabumi-icon-crop', chrome.i18n.getMessage('selectArea'), 'S')
        let windowCaptureBtn = createButton('yabumi-icon-window', chrome.i18n.getMessage('captureWindow'), 'P')
        let wholeCaptureBtn = createButton('yabumi-icon-window-scroll', chrome.i18n.getMessage('topToBottom'), 'W')
        let closeBtn = document.createElement('div')
        closeBtn.className = 'yabumi-close-button yabumi-menu-element yabumi-icon-cross'
        closeBtn.setAttribute('title', 'Press: Escape')

        window.addEventListener('contextmenu', function (event) {
          hideMenu()
        })
        document.body.appendChild(yabumiMenu)
        yabumiMenu.appendChild(selectElementBtn)
        yabumiMenu.appendChild(selectAreaBtn)
        yabumiMenu.appendChild(windowCaptureBtn)
        yabumiMenu.appendChild(wholeCaptureBtn)
        yabumiMenu.appendChild(closeBtn)

        let hotKey = function (event) {
          window.removeEventListener('keydown', hotKey)
          if (event.keyCode === ESC_KEY_CODE) {
            hideMenu()
          }
          switch (String.fromCharCode(event.keyCode)) {
            case 'E':
              selectElementBtn.click()
              break
            case 'S':
              selectAreaBtn.click()
              break
            case 'P':
              windowCaptureBtn.click()
              break
            case 'W':
              wholeCaptureBtn.click()
              break
          }
        }
        window.addEventListener('keydown', hotKey)
        chrome.storage.sync.get({behavior: 'element'}, function (item) {
          if (item.behavior === 'element') {
            // Default behavior is select element
            selectElementBtn.classList.add('yabumi-button-active')
            window.requestAnimationFrame(actions.yabumiSelectElm)
          } else if (item.behavior === 'area') {
            // Default behavior is select area
            selectAreaBtn.classList.add('yabumi-button-active')
            actions.yabumiCaptureSelectedArea()
          }
        })
        selectAreaBtn.addEventListener('click', function () {
          hideMenu()
          window.requestAnimationFrame(function () {
            actions.yabumiCaptureSelectedArea()
          })
        })
        selectElementBtn.addEventListener('click', function () {
          hideMenu()
          window.requestAnimationFrame(function () {
            actions.yabumiSelectElm()
          })
        })
        windowCaptureBtn.addEventListener('click', function () {
          hideMenu()
          window.requestAnimationFrame(function () {
            actions.yabumicaptureWindow()
          })
        })
        wholeCaptureBtn.addEventListener('click', function () {
          hideMenu()
          window.requestAnimationFrame(function () {
            actions.yabumiWholeCapture()
          })
        })
        closeBtn.addEventListener('click', function () {
          hideMenu()
        })
      },
      changeFixedElementToAbsolute: function () {
        changeFixedElementToAbsolute()
        var waitScroll = function () {
          if (Math.abs(window.scrollX - request.scrollTo.x) < 1 &&
              Math.abs(window.scrollY - request.scrollTo.y) < 1) {
            window.requestAnimationFrame(sendResponse)
          } else {
            window.requestAnimationFrame(waitScroll)
          }
        }
        window.requestAnimationFrame(waitScroll)
      },
      yabumicaptureWindow: function () {
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
          action: 'yabumiCaptureWithSize',
          data: data,
          tab: request.tab
        }, function () {})
      },
      yabumiSelectElm: function () {
        if (document.querySelector('.yabumi-crop-select-element')) {
          return false
        }
        const MARGIN = 3
        document.body.classList.add('yabumi-select-element-mode')
        var jackup = document.createElement('div')
        jackup.classList.add('yabumi-jackup-element')
        document.body.appendChild(jackup)
        var layer = document.createElement('div')
        layer.className = 'yabumi-crop-select-element'
        document.body.appendChild(layer)
        layer.style.background = 'rgba(9, 132, 222, 0.35)'
        layer.style.margin = '0px'
        layer.style.border = '1px solid rgb(9, 132, 222)'
        layer.style.position = 'fixed'
        layer.style.pointerEvents = 'none'
        layer.style.zIndex = 2147483646 // Maximun number of 32bit Int - 1
        var allElms = Array.prototype.slice.apply(document.body.querySelectorAll('*')).filter(function (item) {
          return !item.classList.contains('yabumi-crop-select-element') &&
                 !item.classList.contains('yabumi-menu-element')
        })
        allElms.forEach(function (item) {
          item.classList.add('yabumi-select-element-cursor-overwrite')
        })
        var moveLayer = function (event) {
          var item = event.target
          event.stopPropagation()
          if (item.tagName === 'IMG') {
            layer.setAttribute('data-img-url', item.src)
          } else {
            layer.setAttribute('data-img-url', '')
          }
          var rect = item.getBoundingClientRect()
          layer.style.width = rect.width + 'px'
          layer.style.height = rect.height + 'px'
          layer.style.left = rect.left + 'px'
          layer.style.top = rect.top + 'px'
        }
        let hasMargin = false
        var takeMargin = function () {
          if (hasMargin) return
          hasMargin = true
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
            hasMargin = false
            layer.style.width = parseInt(window.getComputedStyle(layer).width, 10) - MARGIN * 2 + 'px'
            layer.style.height = parseInt(window.getComputedStyle(layer).height, 10) - MARGIN * 2 + 'px'
            layer.style.left = parseInt(window.getComputedStyle(layer).left, 10) + MARGIN + 'px'
            layer.style.top = parseInt(window.getComputedStyle(layer).top, 10) + MARGIN + 'px'
          }
        }
        var clickElement = function (event) {
          event.stopPropagation()
          event.preventDefault()
          document.body.classList.remove('yabumi-select-element-mode')
          allElms.forEach(function (item) {
            if (item.classList.contains('yabumi-select-element-cursor-overwrite')) {
              item.classList.remove('yabumi-select-element-cursor-overwrite')
            }
            item.removeEventListener('mouseover', moveLayer)
            item.removeEventListener('click', clickElement)
          })
          var data = {}
          var scaleObj = getZoomAndScale()

          // Sanitize yabumi desc for ivy-search
          Array.from(document.querySelectorAll('*')).forEach(function (elm) {
            if (window.getComputedStyle(elm).display === 'none' || window.getComputedStyle(elm).visibility === 'hidden') {
              elm.classList.add('yabumi-hidden')
            }
          })
          var dupTarget = event.target.cloneNode(true)
          Array.from(dupTarget.querySelectorAll('*')).forEach(function (elm) {
            switch (elm.tagName) {
              case 'SCRIPT':
              case 'STYLE':
                return elm.remove()
            }
            if (elm.classList.contains('yabumi-hidden')) {
              elm.remove()
            }
          })
          Array.from(document.getElementsByClassName('yabumi-hidden')).forEach(function (elm) {
            elm.classList.remove('yabumi-hidden')
          })

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
          data.desc = dupTarget.textContent
          if (document.body.contains(layer)) {
            document.body.removeChild(layer)
          }
          if (document.querySelector('.yabumi-menu')) {
            document.body.removeChild(document.querySelector('.yabumi-menu'))
          }
          jackup.style.height = (window.innerHeight + JACKUP_HEIGHT) + 'px'
          window.removeEventListener('contextmenu', cancel)
          window.removeEventListener('keydown', keydownHandler)
          document.removeEventListener('keyup', keyUpHandler)
          if (layer.offsetTop >= 0 && layer.offsetTop + layer.offsetHeight <= window.innerHeight) {
            // Only when required scroll
            changeFixedElementToAbsolute()
          }
          if (layer.getAttribute('data-img-url')) {
            restoreFixedElement()
            return chrome.runtime.sendMessage(chrome.runtime.id, {
              action: 'yabumiSendRawImage',
              data: {srcUrl: layer.getAttribute('data-img-url')},
              tab: request.tab
            }, function () {})
          }
          var overflow = lockScroll()
          var finish = function () {
            if (document.getElementsByClassName('yabumi-crop-select-element').length > 0) {
              return window.requestAnimationFrame(finish)
            }
            window.requestAnimationFrame(function () {
              chrome.runtime.sendMessage(chrome.runtime.id, {
                action: 'yabumiCaptureWithSize',
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
        var cancel = function () {
          if (document.body.contains(jackup)) {
            document.body.removeChild(jackup)
          }
          if (document.body.contains(layer)) {
            document.body.removeChild(layer)
          }
          document.body.classList.remove('yabumi-select-element-mode')
          window.removeEventListener('contextmenu', cancel)
          document.removeEventListener('keydown', keydownHandler)
          document.removeEventListener('keyup', keyUpHandler)
          Array.prototype.slice.apply(document.querySelectorAll('.yabumi-select-element-cursor-overwrite')).forEach(function (item) {
            item.classList.remove('yabumi-select-element-cursor-overwrite')
            item.removeEventListener('mouseover', moveLayer)
            item.removeEventListener('click', clickElement)
          })
          restoreFixedElement()
        }
        let removedYabumiMenu = function () {
          window.removeEventListener('removeYabumiMenu', removedYabumiMenu)
          cancel()
        }
        window.addEventListener('removeYabumiMenu', removedYabumiMenu)
        window.addEventListener('contextmenu', cancel)
        document.addEventListener('keydown', keydownHandler)
        document.addEventListener('keyup', keyUpHandler)
        window.requestAnimationFrame(function () {
          allElms.forEach(function (item) {
            item.addEventListener('mouseover', moveLayer)
            item.addEventListener('click', clickElement)
          })
        })
      },
      yabumiCaptureSelectedArea: function () {
        if (document.querySelector('.yabumi-jackup-element')) {
          return false
        }
        var startX
        var startY
        var data = {}
        var tempUserSelect = document.body.style.webkitUserSelect
        var layer = document.createElement('div')
        var jackup = document.createElement('div')
        jackup.classList.add('yabumi-jackup-element')
        document.body.appendChild(jackup)
        var pageHeight = Math.max(document.body.clientHeight, document.body.offsetHeight, document.body.scrollHeight)
        layer.style.position = 'absolute'
        layer.style.left = document.body.clientLeft + 'px'
        layer.style.top = document.body.clientTop + 'px'
        layer.style.width = Math.max(document.body.clientWidth, document.body.offsetWidth, document.body.scrollWidth) + 'px'
        layer.style.height = pageHeight + 'px'
        layer.style.zIndex = 2147483646 // Maximun number of 32bit Int - 1
        layer.style.cursor = 'crosshair'
        layer.className = 'yabumi-select-layer'
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
        var cancelYabumi = function () {
          document.body.removeChild(layer)
          document.body.removeChild(jackup)
          document.body.style.webkitUserSelect = tempUserSelect
          document.removeEventListener('keydown', keydownHandler)
          window.removeEventListener('contextmenu', cancelYabumi)
          restoreFixedElement()
          if (document.querySelector('.yabumi-menu')) {
            document.body.removeChild(document.querySelector('.yabumi-menu'))
          }
        }
        let removedYabumiMenu = function () {
          cancelYabumi()
          window.removeEventListener('removeYabumiMenu', removedYabumiMenu)
        }
        window.addEventListener('removeYabumiMenu', removedYabumiMenu)
        var keydownHandler = function (event) {
          if (event.keyCode === ESC_KEY_CODE) {
            //  If press Esc Key, cancel it
            cancelYabumi()
          }
        }
        var mousedownHandler = function (e) {
          let yabumiMenu = document.querySelector('.yabumi-menu')
          if (yabumiMenu) {
            document.body.removeChild(yabumiMenu)
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
            cancelYabumi()
            event.preventDefault()
          })
          var scaleObj = getZoomAndScale()
          var rect = selectionElm.getBoundingClientRect()
          data.w = rect.width
          data.h = rect.height
          if (data.h <= 3 || data.w <= 3) {
            cancelYabumi()
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
          if (document.querySelector('.yabumi-menu')) {
            document.body.removeChild(document.querySelector('.yabumi-menu'))
          }
          var overflow = lockScroll()
          jackup.style.height = (window.innerHeight + JACKUP_HEIGHT) + 'px'
          // wait for rewrite by removeChild
          let finish = function () {
            if (document.getElementsByClassName('yabumi-select-layer').length > 0) {
              return window.requestAnimationFrame(finish)
            }
            window.setTimeout(function () {
              chrome.runtime.sendMessage(chrome.runtime.id, {
                action: 'yabumiCaptureWithSize',
                data: data,
                tab: request.tab
              }, function () {
                document.body.removeChild(jackup)
                unlockScroll(overflow)
                restoreFixedElement()
              })
            }, 100)
          }
          window.requestAnimationFrame(finish)
        }
        layer.addEventListener('mousedown', mousedownHandler)
        document.addEventListener('keydown', keydownHandler)
        window.addEventListener('contextmenu', cancelYabumi)
      },
      yabumiWholeCapture: function () {
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
        jackup.classList.add('yabumi-jackup-element')
        document.body.appendChild(jackup)
        jackup.style.height = (data.h + 30) + 'px'
        chrome.runtime.sendMessage(chrome.runtime.id, {
          action: 'yabumiCaptureWithSize',
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
