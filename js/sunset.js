function init() {
  var DEFAULT_SETTINGS = {
    'sunset-max-alpha': 'screen.sunset.max-alpha',
    'sunset-manual-sunrise': 'screen.sunset.manual-sunrise',
    'sunset-manual-sunset': 'screen.sunset.manual-sunset'
  };

  for (var setting in DEFAULT_SETTINGS) {
    getSetSettings(setting, DEFAULT_SETTINGS[setting]);
  }

}

function getSetSettings (domNodeId, systemPref) {
  'use strict';

  domNodeId = String(domNodeId);
  systemPref = String(systemPref);
  var event;

  var node = document.getElementById(String(domNodeId));
  if (node.type === 'time') { event = 'input'; }
  else { event = 'change'; }

  var req = navigator.mozSettings.createLock().get(systemPref);
  req.onsuccess = function() {
    if (systemPref in req.result) {
      console.log('setting page pref to: ' + String(req.result[systemPref]));
      node.value = req.result[systemPref];
    }
  };

  node.addEventListener(event, function() {
    console.log('changed');
    console.log('updating system pref: ' + systemPref + ' to ' + String(node.value));
    var obj = {};
    obj[systemPref] = node.value;
    console.log(obj);
    navigator.mozSettings.createLock().set(obj);
  });
}

window.addEventListener('DOMContentLoaded', function () {
  'use strict';

  init();

  // var geolocationEnabled = document.getElementById('geolocation-enabled');
  // var geolocationLocation = document.getElementById('geolocation-location');
  // var sunsetMaxAlpha = document.getElementById('sunset-max-alpha');
  // var sunsetManualTimeSunrise = document.getElementById('sunset-manual-time-sunrise');
  // var sunsetManualTimeSunset = document.getElementById('sunset-manual-time-sunset');

  // var req;

  /* The settings API is a horrible thing to work with */
  // req = navigator.mozSettings.createLock().get('screen.sunset.max-alpha');
  // req.onsuccess = function() {
  //   if ('screen.sunset.max-alpha' in req.result) {
  //     sunsetMaxAlpha.value = req.result['screen.sunset.max-alpha'];
  //   }
  // };

  // req = navigator.mozSettings.createLock().lock.get('screen.sunset.manual-sunrise');
  // req.onsuccess = function() {
  //   if ('screen.sunset.manual-sunrise' in req.result) {
  //     sunsetManualTimeSunrise.value = req.result['screen.sunset.manual-sunrise'];
  //   }
  // };

  // req = navigator.mozSettings.createLock().lock.get('screen.sunset.manual-sunset');
  // req.onsuccess = function() {
  //   if ('screen.sunset.manual-sunset' in req.result) {
  //     sunsetManualTimeSunset.value = req.result['screen.sunset.manual-sunset'];
  //   }
  // };


  // sunsetMaxAlpha.onchange = function () {
  //     var lock = navigator.mozSettings.createLock();
  //     lock.set({
  //     'screen.sunset.max-alpha': sunsetMaxAlpha.value
  //   });
  // };

  /* Set the global system setting to enable or disable the filter */
  // sunsetEnabled.onchange = function () {
  //   var lock = navigator.mozSettings.createLock();
  //   lock.set({
  //     'screen.sunset.enabled': sunsetEnabled.checked
  //   });
  // };

  // /* If geolocation is disabled, enable manual geolocation setting */
  // geolocationEnabled.onchange = function () {
  //   geolocationLocation.disabled = geolocationEnabled.checked;
  // };

  //  Commit the setting for location when it is entered by a user
  // geolocationLocation.onchange = function () {
  //   var lock = navigator.mozSettings.createLock();
  //   lock.set({
  //     'screen.sunset.location': geolocationLocation.value
  //   });
  // };
});
