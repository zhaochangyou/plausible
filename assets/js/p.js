(function(window, plausibleHost){
  'use strict';

  try {
    const CONFIG = {
      domain: window.location.hostname
    }

    function setCookie(name,value) {
      var date = new Date();
      date.setTime(date.getTime() + (3*365*24*60*60*1000)); // 3 YEARS
      var expires = "; expires=" + date.toUTCString();
      document.cookie = name + "=" + (value || "")  + expires + "; samesite=strict; path=/";
    }

    function getCookie(name) {
      let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
      ));
      return matches ? decodeURIComponent(matches[1]) : null;
    }

    function ignore(reason) {
      console.warn('[Plausible] Ignoring event because ' + reason);
    }

    function getUrl() {
      return window.location.protocol + '//' + window.location.hostname + window.location.pathname + window.location.search;
    }

    function getSourceFromQueryParam() {
      const result = window.location.search.match(/[?&](ref|source|utm_source)=([^?&]+)/);
      return result ? result[2] : null
    }

    function getUserData() {
      var userData = JSON.parse(getCookie('plausible_user'))

      if (userData) {
        return {
          initial_referrer: userData.initial_referrer && decodeURIComponent(userData.initial_referrer),
          initial_source: userData.initial_source && decodeURIComponent(userData.initial_source)
        }
      } else {
        userData = {
          initial_referrer: window.document.referrer || null,
          initial_source: getSourceFromQueryParam(),
        }

        setCookie('plausible_user', JSON.stringify({
          initial_referrer: userData.initial_referrer && encodeURIComponent(userData.initial_referrer),
          initial_source: userData.initial_source && encodeURIComponent(userData.initial_source),
        }))

        return userData
      }
    }

    function trigger(eventName, options) {
      if (/localhost$/.test(window.location.hostname)) return ignore('website is running locally');
      if (window.location.protocol === 'file:') return ignore('website is running locally');
      if (window.document.visibilityState === 'prerender') return ignore('document is prerendering');

      var payload = CONFIG['trackAcquisition'] ? getUserData() : {}
      payload.name = eventName
      payload.url = getUrl()
      payload.domain = CONFIG['domain']
      payload.referrer = window.document.referrer || null
      payload.source = getSourceFromQueryParam()
      payload.user_agent = window.navigator.userAgent
      payload.screen_width = window.innerWidth

      var request = new XMLHttpRequest();
      request.open('POST', plausibleHost + '/api/event', true);
      request.setRequestHeader('Content-Type', 'text/plain');

      request.send(JSON.stringify(payload));

      request.onreadystatechange = function() {
        if (request.readyState == XMLHttpRequest.DONE) {
          options && options.callback && options.callback()
        }
      }
    }

    function page(options) {
      trigger('pageview', options)
    }

    function trackPushState() {
      var his = window.history
      if (his.pushState) {
        var originalFn = his['pushState']
        his.pushState = function() {
          originalFn.apply(this, arguments)
          page();
        }
      }
      window.addEventListener('popstate', page)
    }

    function configure(key, val) {
      CONFIG[key] = val
    }

    const functions = {
      page: page,
      trigger: trigger,
      trackPushState: trackPushState,
      configure: configure
    }

    const queue = window.plausible.q || []

    window.plausible = function() {
      var args = [].slice.call(arguments);
      var funcName = args.shift();
      functions[funcName].apply(this, args);
    };

    for (var i = 0; i < queue.length; i++) {
      window.plausible.apply(this, queue[i])
    }
  } catch (e) {
    new Image().src = plausibleHost + '/api/error?message=' +  encodeURIComponent(e.message);
  }
})(window, BASE_URL);
