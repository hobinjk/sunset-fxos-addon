/*eslint-env browser */

function launchSunset() {
  'use strict';

  navigator.mozApps.mgmt.getAll().then(function(apps) {
    apps.forEach(function(app) {
      if (app.manifest.name === 'Sunset') {
        app.launch();
      }
    });
  });
}

function inject() {
  'use strict';

  /* don't double inject */
  if (document.getElementById('display-sunset-launcher')) {
    return;
  }

  /* try to find the screen orientation lock link */
  if (document.getElementsByName('screen.orientation.lock').length === 0) {
    return;
  }

  /* Insert new list item, underneath the screen orientation lock */
  var li = document.createElement('li');
  var a = document.createElement('a');
  a.id = 'display-sunset-launcher';
  a.onclick = launchSunset;
  a.textContent = 'Sunset Preferences';
  li.appendChild(a);

  /* inject the link and then remove the listener */
  document.getElementsByName('screen.orientation.lock')[0].parentNode.parentNode.appendChild(li);
  document.body.removeEventListener('click', inject);
}

function initialize() {
  'use strict';

  if (!window._sunsetListenerInjected) {
    window._sunsetListenerInjected = true;
    document.body.addEventListener('click', inject);
  }

}

/* Attempt to initialize the application */
if (document.documentElement) {
  initialize();
} else {
  window.addEventListener('DOMContentLoaded', initialize);
}
