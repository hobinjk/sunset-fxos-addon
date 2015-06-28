/*eslint-env browser */

/* Blatently stolen from MDN, it launches your application when the a link for it (which has onclick set)
is clicked */
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

/* It turns out that even if you inject to the DOM directly in your very own personal addon's details page,
   that such an injection will show up in *every* addon's detail's page. This is because settings page
   simply changes the content of the addon-detail's page; it doesn't create/destroy, nor does it simply
   put both addons into the DOM.

   As such, you have to constantly be observing which addon is being viewed and hide your Settings pane
   if the details page being viewed isn't your own. Event handlers don't seem to fire, so you need to set a
   mutation observer to catch these changes */
function hideShowSunsetSettings () {
  'use strict';

  if (window._addonDetailsHeaderNode.textContent === 'Sunset') {
    document.getElementById('addon-sunset-launcher-container').style.display = '';
  } else {
    document.getElementById('addon-sunset-launcher-container').style.display = 'none';
  }
}

/* attempt to inject the Settings link into Sunset's add-on details page */
function inject() {
  'use strict';
  var a, headers, li;

  /* inject() shouldn't be called after the first (successful) injection,
     but this should be a fine sanity check just in case */
  if (document.getElementById('addon-sunset-launcher')) {
    return;
  }

  /* addon-details-header (and all the addon listings) are lazily loaded, and aren't part of the DOM when system
     is first launched; as such, we keep trying to inject until addon-details-header is loaded, which is basically
     when you click on an addon's name */
  headers = document.getElementsByClassName('addon-details-header');
  if (headers.length > 0) {
    window._addonDetailsHeaderNode = headers[0]; // save to the global scope, so we don't have to constantly query
  }

  /* Insert new <li>, underneath the enable/disable switch <li> */
  li = document.createElement('li');
  a = document.createElement('a');
  li.id = 'addon-sunset-launcher-container';
  a.id = 'addon-sunset-launcher';
  a.onclick = launchSunset;
  a.textContent = 'Settings';
  li.appendChild(a);

  /* inject the <li><a></li> link to launch the application; this is pretty ugly, and is going to likely
     be extremely difficult to maintain over time */
  window._addonDetailsHeaderNode.parentNode.nextSibling.nextSibling.getElementsByTagName('ul')[0].appendChild(li); // Curse you, mhenretty!!

  /* Once we've successfully injected the application jumper, we no longer need to be notified of mutations
     to the addons section for the purposes of injection */
  window._sunsetInjectionMO.disconnect();
}

/* Initialize the application, which should happen when the add-on is either enabled, or when the system boots.
   We have to set MutationObserver's on the addon-details page, as they are lazily loaded and events (such as onclick)
   seem to be pretty unreliable */
function init() {
  'use strict';
  var node = document.getElementById('addon-details');

  window._sunsetInjectionMO = new MutationObserver(inject);
  window._sunsetInjectionMO.observe(node, { childList: true });

  window._sunsetSettingsMO = new MutationObserver(hideShowSunsetSettings);
  window._sunsetSettingsMO.observe(node, { childList: true, subtree: true });
}

/* If it's just being enabled (ie, document.body exists), then initialize and immediately inject, otherwise
   just initialize and the injection will be called as needed */
if (document.body) {  // this should get called when first enabled after installation
  init();
  inject();
} else {              // on bootup
  window.addEventListener('DOMContentLoaded', init);
}
