// leaflet-back-button.js

// a leaflet control to take the user back to where they came
// Only visible when zooming to an individual plant from the dialog popup. See $('#btn-zoom').click()
L.backButton = L.Control.extend({
	options: {
	  position: 'bottomleft',
	},

    initialize: function(options) {
        L.setOptions(this,options);

        // keep a reference to the basemap control, used below
        this.basemapControl = options.basemapControl;        
    },

	onAdd: function (map) {
	  var container   = L.DomUtil.create('div', 'btn btn-primary btn-back', container);
	  container.title = 'Click to go back to the previous view';
	  this._map       = map;

	  // generate the button
	  var button = L.DomUtil.create('a', 'active', container);
	  button.control   = this;
	  button.href      = 'javascript:void(0);';
	  button.innerHTML = '<span class="glyphicon glyphicon-chevron-left"></span> Go back to previous view';

	  L.DomEvent
	    .addListener(button, 'click', L.DomEvent.stopPropagation)
	    .addListener(button, 'click', L.DomEvent.preventDefault)
	    .addListener(button, 'click', function () {
	      this.control.goBack();
	    });

	  // all set, L.Control API is to return the container we created
	  return container;
	},

	// the function called by the control
	goBack: function (basemapControl) {
	  // set the map to the previous bounds
	  this._map.fitBounds(this._previousBounds);

	  // click the target tracker, so as to open it's info panel
	  this._targetTracker.fire('click');

	  // remove the back button from the map
	  this.remove(this._map);

	  // restore the "map" view
	  this.basemapControl.selectLayer('map');

	},

	// method to set the previous bounds that clicking the button takes us to
	setPreviousBounds: function (bounds) {
		this._previousBounds = bounds;
	},

	// method to set the tracker point that we clicked, so that we can click it again to open the associated info-panel
	setTargetTracker: function (tracker) {
		console.log(tracker);
		this._targetTracker = tracker; 
	},

});
