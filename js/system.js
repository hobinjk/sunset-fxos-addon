/*eslint-env browser */
console.error('Sunrise system exists');

/* Try not to pollute the global namespace too much */
var Sunrise = (function() {
  'use strict';

  /* a carefully chosen set of times, based on what my gut and eyeballs told me */
  var SunriseSettings = {
    'screen.sunset.geolocate': false,
    'screen.sunset.max-alpha': 17, // your foxfood may vary
    'screen.sunset.manual-sunrise': '07:00',
    'screen.sunset.manual-sunset': '20:00'
  };

  /* Whenever the application is initialized, we need to do some setup to:
    1) Replicate the DEFAULT_SETTINGS to Global Settings, if they don't already exist
    2) Push the proper setting (either default or global into mozSyncSettings())
    3) Set observers that call back to syncMozSettings whenever they're changed */
  function setUp() {

    /* Call toggle() whenever the attributes on 'screen' change (particularly locked), to set size to 100% */
    window._sunsetSoftwareButtonMO = new MutationObserver(toggle);
    window._sunsetSoftwareButtonMO.observe(document.getElementById('screen'), { attributes: true });
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
      var app = event.application;
      if (app.manifest.name === 'Sunrise') {
        toggle(app.enabled);
      }
    };

    /* whenever the screen's orientation changes, call toggle to set the width/height calc setting properly */
    window.addEventListener('orientationchange', toggle);

    /* We've finally done it! Turn the filter on! Maybe even grab a beer! */
    toggle();
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

    /* above #utility-tray (16385), below #software-buttons-fullscreen-layout (auto -> 90000), above #cards-view (65535)
       unfortunately, I have to choose between the filter showing up on screen long presses >=cards-view, or covering the
       software buttons < cards-view */
    filter.style.zIndex = '80000'; // above #utility-tray (16385), above #cards-view (65535)

    /* append the screen filter to the system app */
    document.body.appendChild(filter);
  }

  /* Set the alpha transparency of the screen filter */
  function setAlpha(alpha, taskBarBrightness) {
    document.getElementById('sunset').style.backgroundColor = 'rgba(255, 255, 0, ' + alpha + ')';
    document.getElementById('software-home-button').style.filter = 'brightness(' + taskBarBrightness + ')';
  }

  /* toggle() is a bit of a misnomer; it does toggle (setting onoff to true or false), but mostly it is responsible
     for calculating how yellow the filter should be, as well as how dim the home screen button should be */
  function toggle(onoff) {
    var diff = 0;

    /* if onoff is set to false (like on disabling), kill everything */
    if (onoff === false) {
      removeFilter(); // remove the filter from the screen and get out of here
      return;
    } else {
      inject(); // inject just in case the filter got removed with removeFilter
    }

    /* We never want more than a single timer to be called to be set on the global scope, else we end up calling
       toggle() too many times and waste battery */
    if (window._sunsetTimer) {
      clearTimeout(window._sunsetTimer);
    }

    /* Call toggle every minute so that the filter gets darker and brighter throughout the day */
    window._sunsetTimer = setTimeout(function () {
      toggle.call(this);
    }, 60000);

    /* to avoid having to mess with the software button's z-index, we calculate its height, and then set the
       screen filter's width/height to 100% minus that size */
    var filter = document.getElementById('sunset');
    var taskbar = document.getElementById('software-buttons-fullscreen-layout');

    /* if it's a locked screen or there are no software buttons(!!), set the width and height to 100% */
    if ((document.getElementById('screen').className.split(/\s+/).indexOf('locked') !== -1) || (taskbar === null)) {
      filter.style.height = '100%';
      filter.style.width = '100%';
    } else if (taskbar.clientWidth > taskbar.clientHeight) { // software buttons on the bottom
      filter.style.height = 'calc(100% - ' + String(taskbar.clientHeight) + 'px';
      filter.style.width = '100%';
    } else { // software buttons on the right
      filter.style.height = '100%';
      filter.style.width = 'calc(100% - ' + String(taskbar.clientWidth) + 'px';
    }

    /* Calculate the current time, as well as the sunrise and sunset times, in terms of minutes into the day */
    var curTime = new Date();
    curTime = curTime.getHours() * 60 + curTime.getMinutes();

    var sunriseTime = SunriseSettings['screen.sunset.manual-sunrise'].split(':');
    sunriseTime = Number(sunriseTime[0]) * 60 + Number(sunriseTime[1]);

    var sunsetTime = SunriseSettings['screen.sunset.manual-sunset'].split(':');
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
      var alpha = (SunriseSettings['screen.sunset.max-alpha'] / 100 * diff).toFixed(3);
      var brightness = (1 - (diff * .25)).toFixed(3); // min: .75, max: 1

      setAlpha(alpha, brightness);
    }

  }

  /* Remove the screen filter (for performance), set the software button panel's zindex back to auto, and
     set the home button back to its default brightness (100%) */
  function removeFilter() {
    var filter = document.getElementById('sunset');
    filter.parentNode.removeChild(filter);
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
  Sunrise.setUp();
  Sunrise.inject();
  Sunrise.init();
} else {
  window.addEventListener('DOMContentLoaded', function () { // bootup
    'use strict';
    Sunrise.setUp();
    Sunrise.inject();
    Sunrise.init();
  });
}
