/*eslint-env browser */


/* Sets all the initial values for the inputs on the page, and then binds events to update the system preferences
   when they're changed */
function getSetSettings (domNodeId, systemPref) {
  'use strict';

  var event;
  domNodeId = String(domNodeId);
  systemPref = String(systemPref);

  /* find the node on the page, determine the appropriate event type */
  var node = document.getElementById(String(domNodeId));
  if (node.type === 'time') { event = 'input'; } // time goes a bit crazy with onchange
  else { event = 'change'; }

  /* Get all of the system settings, and apply the values to the inputs */
  var req = navigator.mozSettings.createLock().get(systemPref);
  req.onsuccess = function() {
    if (systemPref in req.result) {
      node.value = req.result[systemPref];
    }
  };

  /* Whenever an input is changed, update the system setting */
  node.addEventListener(event, function() {
    var obj = {};
    obj[systemPref] = node.value;
    navigator.mozSettings.createLock().set(obj);
  });
}

/* Use the system settings to set the values on all of the inputs on the page */
function init() {
  var ID_SETTING_MAPPING = {
    'sunset-max-alpha': 'screen.sunset.max-alpha',
    'sunset-manual-sunrise': 'screen.sunset.manual-sunrise',
    'sunset-manual-sunset': 'screen.sunset.manual-sunset'
  };

  for (var setting in ID_SETTING_MAPPING) {
    getSetSettings(setting, ID_SETTING_MAPPING[setting]);
  }

}

/* Start 'er up! */
window.addEventListener('DOMContentLoaded', function () {
  'use strict';

  init();
});
