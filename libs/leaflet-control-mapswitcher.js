/*
 * Bar-style "map" picker by GreenInfo Network
 * Takes two map layers as options, and toggles between them
 * Also shows a legend on the map
 */

L.Control.MapSwitcher = L.Control.extend({
    options: {
        position: 'topright'
    },
    initialize: function(options) {
        if (! options.layers || ! Array.isArray(options.layers) ) throw "L.Control.MapSwitcher: missing layers list";

        L.setOptions(this,options);

        this.buttons            = {};                        // random-access to our own buttons, so we can arbitrarily fetch a button by name, e.g. to toggle one programatically
        this.map                = null;                      // linkage to our containing L.Map instance

    },
    onAdd: function (map) {
        // add a linkage to the map, since we'll be managing map layers
        this.map = map;

        // pass 1
        // create an internal registry entry for each layer-option, mapping the button text onto the L.tileLayer instance
        // this is the key to the selectLayer() function being able to identify which layer is desired
        this._layers = {};
        for (var i=0, l=this.options.layers.length; i<l; i++) {
            var layeroption = this.options.layers[i];

            this._layers[ layeroption.key ] = layeroption.layer;
        }

        // pass 2
        // create a button for each registered layer, complete with a data attribute for the layer to get toggled, and a linkage to the parent control
        var controlDiv = L.DomUtil.create('div', 'leaflet-control-mapswitcher');
        for (var i=0, l=this.options.layers.length; i<l; i++) {
            var label            = this.options.layers[i].label;
            var key              = this.options.layers[i].key;
            var tooltip          = this.options.layers[i].tooltip ? this.options.layers[i].tooltip : '';

            var button           = L.DomUtil.create('div', 'leaflet-control-mapswitcher-option', controlDiv);
            button.control       = this;
            button.innerHTML     = label.toUpperCase();
            button.title         = tooltip;
            button.dataset.layer = key;

            // on a click on a button, it calls the control's selectLayer() method by name
            L.DomEvent
                .addListener(button, 'mousedown', L.DomEvent.stopPropagation)
                .addListener(button, 'click', L.DomEvent.stopPropagation)
                .addListener(button, 'click', L.DomEvent.preventDefault)
                .addListener(button, 'click', function () {
                    // select the given layer
                    this.control.selectMap( this.dataset.layer );
                });

            // add the button to our internal random-access list, so we can arbitrarily fetch buttons later, e.g. to toggle one programatically
            this.buttons[key] = button;
        }

        // done!
        return controlDiv;
    },
    selectMap: function (which) {
        // selectMap() is *the* public method to trigger the layer picker to select a layer, highlight appropriately, and trigger a change in the map layers
        for (var key in this.buttons) {
            var button = this.buttons[key];
            if (key == which) {
                L.DomUtil.addClass(button,'leaflet-control-mapswitcher-option-active');
                this.map.addLayer(this._layers[key],true);
            } else {
                L.DomUtil.removeClass(button,'leaflet-control-mapswitcher-option-active');
                this.map.removeLayer(this._layers[key]);
            }
        }

        // return myself cuz method chaining is awesome
        return this;
    },
    whichLayer: function () {
        for (var key in this.buttons) {
            var button = this.buttons[key];
            if ( L.DomUtil.hasClass(button,'leaflet-control-mapswitcher-option-active') ) return key;
        }
        return null; // impossible, none of them at all
    },
});