/*eslint-env browser */

var Sunset = (function() {
  'use strict';

  var DEFAULT_SETTINGS = {
    'screen.sunset.geolocate': true,
    'screen.sunset.max-alpha': 25,
    'screen.sunset.manual-sunrise': '07:00',
    'screen.sunset.manual-sunset': '20:00'
  };

  /* Replicate the Sunset settings into SunsetSettings, so we don't have to constantly make async
     calls to the painful Settings API */
  var SunsetSettings = {};

  function syncMozSettings(event) {
    console.log('entering syncMozSettings()');
    SunsetSettings[String(event.settingName)] = event.settingValue;
    toggle(true);
    console.log(SunsetSettings);
  }

  function setUp() {
    console.log('entering setUp()');

    for (var setting in DEFAULT_SETTINGS) {
      setUpGetSetMonitorValues(setting, DEFAULT_SETTINGS[setting]);
    }
  }

  function setUpGetSetMonitorValues(setting, value) {
    setting = String(setting);
    console.log('entering setUpGetSetMonitorValues() to set ' + setting + 'to ' + String(value));

    var syncevent = {};
    syncevent.settingName = setting;

    var req = navigator.mozSettings.createLock().get(setting);
    req.onsuccess = function () {
      if (!(setting in req.result)) {
        console.log('setting ' + setting + ' to ' + String(value));
        var obj = {};
        obj[setting] = value;
        navigator.mozSettings.createLock().set(obj);

        syncevent.settingValue = value;
      } else {
        syncevent.settingValue = req.result[setting];
        console.log('setting ' + setting + ' already found as: ' + req.result[setting]);
      }

      console.log('attempting to setup observer');
      navigator.mozSettings.addObserver(setting, syncMozSettings);

      syncMozSettings(syncevent);
    };
  }

  function init() {
    console.log('entering init()');
    /* Set the listeners, launching Sunset whenever it gets enabled */
    navigator.mozApps.mgmt.onuninstall = function() {
      clearTimeout(window._sunsetTimer);
      removeFilter();
    };
    navigator.mozApps.mgmt.onenabledstatechange = function(event) {
      toggle(event.application.enabled);
    };

    // navigator.mozSettings.addObserver('screen.sunset.max-alpha', function (event) {
    //   console.log(event);
    //   toggle(true);
    // });

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
    console.log('entering setAlpha() with alpha of ' + String(alpha));

    var filter = document.getElementById('sunset');
    filter.style.backgroundColor = 'rgba(255, 255, 0, ' + String(alpha) + ')';
  }

  /* Toggle the screen filter on and off */
  function toggle(onoff) {
    console.log('entering toggle()');
    var diff = 0;

    if (onoff === true) {
      inject();
    } else {
      removeFilter();
      return;
    }

    if (window._sunsetTimer) {
      clearTimeout(window._sunsetTimer);
    }

    var curTime = new Date();
    curTime = curTime.getHours() * 60 + curTime.getMinutes();

    var sunriseTime = SunsetSettings['screen.sunset.manual-sunrise'].split(':');
    sunriseTime = Number(sunriseTime[0]) * 60 + Number(sunriseTime[1]);

    var sunsetTime = SunsetSettings['screen.sunset.manual-sunset'].split(':');
    sunsetTime = Number(sunsetTime[0]) * 60 + Number(sunsetTime[1]);

    if (curTime < sunriseTime) {
      diff = sunriseTime - curTime;
    } else if (curTime > (sunsetTime - 60)) { // 60 minutes before sunset
      diff = Math.abs(sunsetTime - 60 - curTime);
    } else {
      removeFilter();
      return;
    }

    console.log('the sun is down with a difference of ' + String(diff) + ' - let\'s do this!');
    if (diff >= 60) { diff = 1; }
    else if (diff > 0) { diff = diff / 60; }

    /* Calculate the correct alpha setting, based on the time of day */
    if (diff !== 0) {
      var alpha = (SunsetSettings['screen.sunset.max-alpha'] / 100 * diff).toFixed(3);
      console.log('setting alpha to ' + alpha);
      setAlpha(alpha);
    }

    window._sunsetTimer = setTimeout(function () {
      toggle(true).bind(this);
    }, 60000);

    console.log('exiting toggle()');
  }

  function removeFilter() {
    console.log('entering removeFilter()');
    var filter = document.getElementById('sunset');
    filter.parentNode.removeChild(filter);
    console.log('exiting removeFilter()');
  }


  return {
    init: init,
    inject: inject,
    removeFilter: removeFilter,
    setAlpha: setAlpha,
    setUp: setUp
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
    Sunset.setUp();
    Sunset.inject();
    Sunset.init();
  });
}
