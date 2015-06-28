/*eslint-env browser */

var Sunset = (function() {
  'use strict';

  var DEFAULT_SETTINGS = {
    'screen.sunset.geolocate': true,
    'screen.sunset.max-alpha': 25,
    'screen.sunset.manual-sunrise': '06:00:00',
    'screen.sunset.manual-sunset': '18:00:00'
  };

  function geolocate() {
    // TODO
  }

  function getSunriseSunset() {
    // TODO
  }

  function setUp() {
    console.log('entering setUp()');

    for (var setting in DEFAULT_SETTINGS) {
      setDefaultValue(setting, DEFAULT_SETTINGS[setting]);
    }
  }

  function setDefaultValue(setting, value) {
    setting = String(setting);
    console.log('entering setDefaultValue() to set ' + setting + 'to ' + String(value));

    var req = navigator.mozSettings.createLock().get(setting);
    req.onsuccess = function () {
      if (!(setting in req.result)) {
        console.log('setting ' + setting + ' to ' + String(value));
        var obj = {};
        obj[setting] = value;
        navigator.mozSettings.createLock().set(obj);
      } else {
        console.log('setting ' + setting + ' already found as: ' + req.result[setting]);
      }
    };

  }

  function init() {
    console.log('entering init()');
    /* Set the listeners, launching Sunset whenever it gets enabled */
    navigator.mozApps.mgmt.onuninstall = uninstall;
    navigator.mozApps.mgmt.onenabledstatechange = function(event) {
      toggle(event.application.enabled);
    };

    /* Set the listener that checks for changes from Sunset.app to screen.sunset.enabled */
    // navigator.mozSettings.addObserver('screen.sunset.enabled', function (event) { toggle(event.settingValue); });
    navigator.mozSettings.addObserver('screen.sunset.max-alpha', function (event) { toggle(true); });

    /* Turn the darned thing on */
    toggle(true);
  }

  function inject() {
    var filter;
    console.log('entering inject()');

    /* Don't allow the filter to be set infinite times; we don't love sunsets *that* much */
    if (document.contains(document.getElementById('sunset'))) {
      console.log('exiting inject() - sunset already exists');
      return;
    }

    /* create the filter element */
    filter = document.createElement('div');
    filter.id = 'sunset';

    /* set all the styles for the filter */
    filter.style.height = '100%';
    filter.style.left = 0;
    filter.style.pointerEvents = 'none';
    filter.style.position = 'absolute';
    filter.style.top = 0;
    filter.style.width = '100%';
    filter.style.zIndex = '10000000';

    /* append the screen filter to the system app */
    document.body.appendChild(filter);

    console.log('successfully injected sunset into system');
  }

  /* Set the alpha transparency of the screen filter */
  function setAlpha(alpha) {
    console.log('entering setAlpha() with alpha of ' + String(alpha / 100));

    var filter = document.getElementById('sunset');
    filter.style.backgroundColor = 'rgba(255, 255, 0, ' + String(alpha / 100) + ')';
  }

  /* Toggle the screen filter on and off */
  function toggle(onoff) {
    console.log('entering toggle()');

    if (onoff === true) {
      inject();

      var lock = navigator.mozSettings.createLock();
      var req = lock.get('screen.sunset.max-alpha');
      req.onsuccess = function () {
        setAlpha(req.result['screen.sunset.max-alpha']);
      };
    } else {
      uninstall(); // I could just set the alpha to zero, but presumably removing the div will increase performance
    }
    console.log('exiting toggle()');
  }

  function uninstall() {
    console.log('entering uninstall()');
    var filter = document.getElementById('sunset');
    filter.parentNode.removeChild(filter);
    console.log('exiting uninstall()');
  }


  return {
    init: init,
    inject: inject,
    setAlpha: setAlpha,
    setUp: setUp,
    uninstall: uninstall
  };
}());

/* Attempt to initialize the application */
if (document.documentElement) {
  console.log('enabling sunset inside system on being enabled');
  Sunset.setUp();
  Sunset.inject();
  Sunset.init();
} else {
  window.addEventListener('DOMContentLoaded', function () {
    'use strict';
    console.log('enabling sunset inside system on startup');

    Sunset.inject();
    Sunset.init();
  });
}
