/*eslint-env browser */

/* Try not to pollute the global namespace too much */
var Sunset = (function() {
  'use strict';

  /* a carefully chosen set of times, based on what my gut and eyeballs told me */
  var DEFAULT_SETTINGS = {
    'screen.sunset.geolocate': true,
    'screen.sunset.max-alpha': 17, // your foxfood may vary
    'screen.sunset.manual-sunrise': '07:00',
    'screen.sunset.manual-sunset': '20:00'
  };

  /* Replicate the Sunset settings into SunsetSettings, so we don't have to constantly make async
     calls to the painful Settings API.  Once an update is made, call toggle so that the screen
     properly reflects the change */
  var SunsetSettings = {};
  function syncMozSettings(event) {
    SunsetSettings[String(event.settingName)] = event.settingValue;
    toggle(true);
  }

  /* Whenever the application is initialized, we need to do some setup to:
    1) Replicate the DEFAULT_SETTINGS to Global Settings, if they don't already exist
    2) Push the proper setting (either default or global into mozSyncSettings())
    3) Set observers that call back to syncMozSettings whenever they're changed */
  function setUp() {
    for (var setting in DEFAULT_SETTINGS) {
      setUpGetSetMonitorValues(setting, DEFAULT_SETTINGS[setting]);
    }
  }

  function setUpGetSetMonitorValues(setting, value) {
    setting = String(setting);

    /* Create a fake event like what createLock().get() returns that we will use when calling syncMozSettings */
    var event = {};
    event.settingName = setting;

    var req = navigator.mozSettings.createLock().get(setting); // the Settings API makes this unnecessarily difficult
    req.onsuccess = function () {
      if (!(setting in req.result)) { // global pref doesn't exist yet
        var obj = {};
        obj[setting] = value;
        navigator.mozSettings.createLock().set(obj); // push to global setting

        event.settingValue = value;
      } else {
        event.settingValue = req.result[setting]; // if it's already set, don't do anything besides push to syncMozSettings
      }

      /* Call syncMozSetting whenever the setting is updated by Sunset.app or through WebIDE */
      navigator.mozSettings.addObserver(setting, syncMozSettings);

      /* Push the fake event (which addObserver would generate) into syncMozSettings */
      syncMozSettings(event);
    };
  }

  /* init() is the final part of the startup process, it does:
     1) Sets up callback for when the add-on is uninstalled (Delete Add-on), aka, onuninstall()
     2) Sets up a callback for when the addon is toggled (Disabled/Enabled),
     3) Toggles the filter, aka, actually set its hue
  */
  function init() {

    /* When you delete the addon, clear minutely timer, then remove the filter */
    navigator.mozApps.mgmt.onuninstall = function() {
      clearTimeout(window._sunsetTimer);
      removeFilter();
    };

    /* When you enable/disable the add-on, call toggle to see if the filter should be added or destroyed */
    navigator.mozApps.mgmt.onenabledstatechange = function(event) {
      toggle(event.application.enabled);
    };

    /* We've finally done it! Turn the filter on! Maybe even grab a beer! */
    toggle(true);
  }

  /* inject() injects the (invisible) screen filter and toggles the z-indicies properly so that the filter
     doesn't cover up the software buttons */
  function inject() {
    var filter;

    /* Don't allow the filter to be set infinite times; we don't love sunsets *that* much */
    if (document.contains(document.getElementById('sunset'))) {
      return;
    }

    /* create the filter element */
    filter = document.createElement('div');
    filter.id = 'sunset';

    /* set all the styles for the filter */
    filter.style.height = '100%';
    filter.style.left = 0;
    filter.style.pointerEvents = 'none'; // we actually want to be able to click on the screen
    filter.style.position = 'absolute';
    filter.style.top = 0;
    filter.style.width = '100%';
    filter.style.zIndex = '80000'; // above #utility-tray (16385), below #software-buttons-fullscreen-layout (auto -> 90000), above #cards-view (65535)

    /* adjust the z-index of the taskbar on the bottom, so that sunset doesn't affect it;
       hopefully this doesn't break something horribly */
    document.getElementById('software-buttons-fullscreen-layout').style.zIndex = '90000';

    /* append the screen filter to the system app */
    document.body.appendChild(filter);
  }

  /* Set the alpha transparency of the screen filter */
  function setAlpha(alpha, taskBarBrightness) {
    document.getElementById('sunset').style.backgroundColor = 'rgba(255, 255, 0, ' + String(alpha) + ')';
    document.getElementById('software-home-button').style.filter = 'brightness(' + String(taskBarBrightness) + ')';
  }

  /* toggle() is a bit of a misnomer; it does toggle (setting onoff to true or false), but mostly it is responsible
     for calculating how yellow the filter should be, as well as how dim the home screen button should be */
  function toggle(onoff) {
    var diff = 0;

    if (onoff === true) {
      inject(); // inject just in case the filter got removed with removeFilter()
    } else {
      removeFilter(); // remove the filter from the screen and get out of here
      return;
    }

    /* We never want more than a single timer to be called to be set on the global scope, else we end up calling
       toggle() too many times and waste battery */
    if (window._sunsetTimer) {
      clearTimeout(window._sunsetTimer);
    }

    /* Call toggle every minute so that the filter gets darker and brighter throughout the day */
    window._sunsetTimer = setTimeout(function () {
      toggle.call(this, true);
    }, 60000);

    /* Sometimes the Settings API is a bit slow in feeding into SunsetSettings; we'll just return and catch it the
       next time about */
    if (!('screen.sunset.manual-sunset' in SunsetSettings)) {
      return;
    }

    /* Calculate the current time, as well as the sunrise and sunset times, in terms of minutes into the day */
    var curTime = new Date();
    curTime = curTime.getHours() * 60 + curTime.getMinutes();

    var sunriseTime = SunsetSettings['screen.sunset.manual-sunrise'].split(':');
    sunriseTime = Number(sunriseTime[0]) * 60 + Number(sunriseTime[1]);

    var sunsetTime = SunsetSettings['screen.sunset.manual-sunset'].split(':');
    sunsetTime = Number(sunsetTime[0]) * 60 + Number(sunsetTime[1]);

    /* diff controls how strong the filter is, if it's after sunset or an hour before sunrise, it's set to 1 (100%),
       otherwise it is set to a percentage of close we are to that time in the proceeding hour.  For example,
       15 minutes before sunrise = 75% strength (.75), 30 minutes = 50% strength, etc. */

    if (curTime < sunriseTime) { // before sunrise
      diff = sunriseTime - curTime;
    } else if (curTime > (sunsetTime - 60)) { // 60 minutes before sunset
      diff = Math.abs(sunsetTime - 60 - curTime);
    } else {
      removeFilter(); // if it's between sunrise and 60 minutes before sunset, remove the filter entirely
      return;
    }

    if (diff >= 60) { diff = 1; }
    else if (diff > 0) { diff = diff / 60; }

    /* Calculate the correct alpha setting for the filter, as well as the proper home button brightness.
       The home button brightness will vary between 75% (diff == 1), and 100% (diff == 0) */
    if (diff !== 0) {
      var alpha = (SunsetSettings['screen.sunset.max-alpha'] / 100 * diff).toFixed(3);
      var brightness = (1 - (diff * .25)).toFixed(3); // min: .75, max: 1

      setAlpha(alpha, brightness);
    }

  }

  /* Remove the screen filter (for performance), set the software button panel's zindex back to auto, and
     set the home button back to its default brightness (100%) */
  function removeFilter() {
    var filter = document.getElementById('sunset');
    filter.parentNode.removeChild(filter);
    document.getElementById('software-buttons-fullscreen-layout').style.zIndex = 'auto';
    document.getElementById('software-home-button').style.filter = 'none';
  }

  return {
    init: init,
    inject: inject,
    removeFilter: removeFilter,
    setAlpha: setAlpha,
    setUp: setUp,
    toggle: toggle
  };
}());

/* Attempt to initialize the application */
if (document.documentElement) { // system already exists, ie, enable/disable
  Sunset.setUp();
  Sunset.inject();
  Sunset.init();
} else {
  window.addEventListener('DOMContentLoaded', function () { // bootup
    'use strict';
    Sunset.setUp();
    Sunset.inject();
    Sunset.init();
  });
}
