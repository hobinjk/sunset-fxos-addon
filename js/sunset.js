window.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var sunsetEnabled = document.getElementById('sunset-enabled');

  /* Set the system setting */
  // lock = navigator.mozSettings.createLock();
  // lock.set({
  //   'screen.sunset.enabled': true
  // });

  sunsetEnabled.onchange = function () {
    var lock;

    if (sunsetEnabled.checked === true) {
      lock = navigator.mozSettings.createLock();
      lock.set({
        'screen.sunset.enabled': true
      });
    } else {
      lock = navigator.mozSettings.createLock();
      lock.set({
        'screen.sunset.enabled': false
      });
    }
  };
});
