/*eslint-env browser */

var Sunset = (function() {
  var GLOBAL_MAX_ALPHA = .25;

  function geolocate() {
    // TODO
  }

  function getSunriseSunset() {
    // TODO
  }

  function initialize() {
    'use strict';

    var filter, lock;

    /* Reset the enablement setting to true whenever the add-on is toggled in Settings -> Add-Ons */
    lock = navigator.mozSettings.createLock();
    lock.set({
      'screen.sunset.enabled': true
    });

    /* Don't allow the filter to be set infinite times; we don't love sunsets *that* much */
    if (document.contains(document.getElementById('sunset'))) {
      return;
    }

    /* create the filter element */
    filter = document.createElement('div');
    filter.id = 'sunset';

    /* set all the styles for the filter */
    filter.style.backgroundColor = 'rgba(255, 255, 0, ' + String(GLOBAL_MAX_ALPHA) + ')';
    filter.style.height = '100%';
    filter.style.left = 0;
    filter.style.pointerEvents = 'none';
    filter.style.position = 'absolute';
    filter.style.top = 0;
    filter.style.width = '100%';
    filter.style.zIndex = '10000000';

    /* append the screen filter to the system app */
    document.body.appendChild(filter);

    /* Set the listeners */
    navigator.mozApps.mgmt.onuninstall = uninstall;
    navigator.mozApps.mgmt.onenabledstatechange = function(event) { toggle(event.application.enabled); };

    navigator.mozSettings.addObserver('screen.sunset.enabled', function (event) { toggle(event.settingValue); });
  }

  /* Set the alpha transparency of the screen filter */
  function setAlpha(alpha) {
    'use strict';

    var filter = document.getElementById('sunset');
    filter.style.backgroundColor = 'rgba(255, 255, 0, ' + String(alpha) + ')';
  }

  /* Toggle the screen filter on and off */
  function toggle(onoff) {
    'use strict';

    // var lock = navigator.mozSettings.createLock();

    if (onoff === true) {
      setAlpha(GLOBAL_MAX_ALPHA);
    } else {
      setAlpha(0); // this could probably eventually be changed to uninstall it, for performance reasons
    }
  }

  function uninstall() {
    'use strict';

    var filter = document.getElementById('sunset');
    filter.parentNode.removeChild(filter);
  }

  return {
    initialize: initialize,
    setAlpha: setAlpha,
    uninstall: uninstall
  };
}());

/* Attempt to initialize the application */
if (document.documentElement) {
  Sunset.initialize();
} else {
  window.addEventListener('DOMContentLoaded', Sunset.initialize);
}

// navigator.mozApps.mgmt.getAll().then(function(apps) {
//   apps.forEach(function(app) {
//     if (app.manifest.name === 'Sunset') {
//       app.launch();
//     }
//   });
// });
