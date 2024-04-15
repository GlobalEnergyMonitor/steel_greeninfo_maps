///////////////////////////////////////////////////////////////////////////////////////////////////////////
// IMPORTS
///////////////////////////////////////////////////////////////////////////////////////////////////////////
import MobileDetect from 'mobile-detect';
import * as JsSearch from 'js-search';

///////////////////////////////////////////////////////////////////////////////////
// STYLES, in production, these will be written to <script> tags
///////////////////////////////////////////////////////////////////////////////////
import './loading.css';
import styles from './index.scss';

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// GLOBAL VARIABLES & STRUCTURES
///////////////////////////////////////////////////////////////////////////////////////////////////////////
// global config
const CONFIG = {};
const DATA = {};

// specify which basemap will be on by default, and when the map is reset by the 'Home' button
CONFIG.default_basemap = 'basemap';

// default title for results
CONFIG.default_title = 'Worldwide';

// default tilte for the thing we are mapping
CONFIG.fossil_name = 'iron/steel plant';
CONFIG.fossil_name2 = 'iron/steel plant capacity reduction';
CONFIG.fossil_name3 = 'iron/steel plant capacity addition';

// outerring, used for constructing the mask, see drawCountry();
CONFIG.outerring = [[-90,-360],[-90,360],[90,360],[90,-360],[-90,-360]];
// the starting view: bounds, see initMap()
CONFIG.homebounds = [[51.069, 110.566], [-36.738,-110.566]];

// minzoom and maxzoom for the map
CONFIG.minzoom = 2;
CONFIG.maxzoom = 15;

// Style definitions (see also scss exports, which are imported here as styles{})
// style for highlighting countries on hover and click
CONFIG.country_hover_style    = { stroke: 3, color: '#1267a5', opacity: 0.6, fill: '#fff', fillOpacity: 0 };
CONFIG.country_selected_style = { stroke: 3, color: '#1267a5', opacity: 1, fill: false, fillOpacity: 0 };
// an "invisible" country style, as we don't want countries to show except on hover or click
CONFIG.country_no_style = { opacity: 0, fillOpacity: 0 };

// primary use will be in the DataTable
CONFIG.attributes = {
  'id': {name: 'ID', format: 'string', classname: 'pid', table: false},
  'project': {name: 'Plant Name (English)', format: 'string', classname: 'project', table: true},
  'plant_phase': {name: 'Plant Phase', format: 'string', classname: 'plant_phase', table: true},
  'project_other': {name: 'Plant Name (other language)', format: 'string', classname: 'project_other', table: true},
  'parent': {name: 'Parent', format: 'string', classname: 'parent', table: true},
  'owner': {name: 'Owner', format: 'string', classname: 'owner', table: true},
  // 'ownership': {name: 'SOE Status', format: 'string', classname: 'ownership', tooltip: 'state-owned or private', table: true},
  'province': {name: 'Subnational unit', format: 'string', classname: 'province', tooltip: 'province, state, administrative division, etc.', table: true}, 
  'country': {name: 'Country', format: 'string', classname: 'country', table: true},
  'region': {name: 'Region', format: 'string', classname: 'region', table: true},
  'status': {name: 'Status', format: 'string', classname: 'status', table: true},
  'steel_capacity': {name: 'Crude steel capacity', format: 'mixed', classname: 'steel_capacity', tooltip: 'TTPA (thousand tons per annum)', table: true}, 
  'iron_capacity': {name: 'Iron capacity', format: 'mixed', classname: 'iron_capacity', tooltip: 'TTPA (thousand tons per annum)', table: true}, 
  'process': {name: 'Steelmaking process', format: 'string', classname: 'process', tooltip: 'integrated, electric, or oxygen', table: true}, 
  'equipment': {name: 'Steel production equipment', format: 'string', classname: 'equipment', table: true}, 
  'url': {name: 'Wiki page', format: 'string', table: false},
};

CONFIG.format = {
  'string': function(s) { return s },
  'number': function(n) {return parseFloat(n).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})},
  'mixed':  function(m) { return isNaN(m) ? m : CONFIG.format['number'](m) },
}

// Process types: these are the categories used to symbolize coal plants on the map and in clusters
//          key: allowed status names, matching those used in DATA.fossil_data
//          text: human readible display
//          order: order in the legend
//          color: color on the map
CONFIG.process_types = {
  'electric': {text: 'Electric', order: 1, color: styles.status4, cssclass: 'status4'},
  'electric_oxygen': {text: 'Electric, Oxygen', order: 2, color: styles.status5, cssclass: 'status5'},
  'integrated_BF_and_DRI': {text: 'Integrated (BF and DRI)', order: 3, color: styles.status2, cssclass: 'status2'},
  'integrated_BF': {text: 'Integrated (BF)', order: 4, color: styles.status1, cssclass: 'status1'},
  'integrated_DRI': {text: 'Integrated (DRI)', order: 5, color: styles.status3, cssclass: 'status3'},
  'integrated_unknown': {text: 'Integrated (unknown)', order: 6, color: styles.status9, cssclass: 'status9'},
  'integrated_other': {text: 'Integrated (other)', order: 6, color: styles.status9, cssclass: 'status9'},
  'unknown': {text: 'Unknown', order: 7, color: styles.status11, cssclass: 'status11'}, 
  'oxygen': {text: 'Oxygen', order: 8, color: styles.status6, cssclass: 'status6'}, 
  'ironmaking_BF': {text: 'Ironmaking (BF)', order: 9, color: styles.status7, cssclass: 'status7'}, 
  'ironmaking_DRI': {text: 'Ironmaking (DRI)', order: 10, color: styles.status10, cssclass: 'status10'}, 
  'ironmaking_BF_and_DRI': {text: 'Ironmaking (BF and DRI)', order: 11, color: styles.status12, cssclass: 'status12'}, 
  'ironmaking_unknown': {text: 'Ironmaking (unknown)', order: 12, color: styles.status8, cssclass: 'status8'}, 
  'ironmaking_other': {text: 'Ironmaking (other)', order: 13, color: styles.status13, cssclass: 'status13'}, 
  'steelmaking_other': {text: 'Steelmaking (other)', order: 14, color: styles.status14, cssclass: 'status14'}, 
};

// define secondary "types" here. These also get a set of checkboxes for filtering the map 
CONFIG.status_types = {
  'announced': {text: 'Announced'}, 
  'construction': {text: 'Construction'}, 
  'operating': {text: 'Operating'}, 
  'mothballed': {text: 'Mothballed'}, 
  'retired': {text: 'Retired'}, 
  'cancelled': {text: 'Cancelled'}, 
  'operating_pre-retirement': {text: 'Operating pre-retirement'},
};


// Note: prunecluster.markercluster.js needs this, and I have not found a better way to provide it
CONFIG.markercluster_colors = Object.keys(CONFIG.process_types).map(function(v) { return CONFIG.process_types[v].color });

// false until the app and map are fully loaded
CONFIG.first_load = true;
CONFIG.map_loaded = false;

// chinese provinces: we need a way to recognize these, so that a URL param for "country" correctly matches data for the Chinese province in "province"
CONFIG.ch_provinces = ['Anhui','Beijing','Chongqing','Fujian','Gansu','Guangdong','Guangxi','Guizhou','Hainan','Hebei','Heilongjiang','Henan','Hubei','Hunan','Inner Mongolia','Jiangsu','Jiangxi','Jilin','Liaoning','Ningxia','Qinghai','Shaanxi','Shandong','Shanghai','Shanxi','Sichuan','Tianjin','Tibet','Xinjiang','Yunnan','Zhejiang'];

///////////////////////////////////////////////////////////////////////////////////////////////////////////
///// INITIALIZATION: these functions are called when the page is ready,
///////////////////////////////////////////////////////////////////////////////////////////////////////////
$(document).ready(function () {
  // data initialization first, then the remaining init steps
  Promise.all([initData('./data/map_file_gspt2024-04-15.csv'), initData('./data/countries.json')])
    .then(function(data) {
      initDataFormat(data)    // get data ready for use
      initButtons();          // init button listeners
      initTabs();             // init the main navigation tabs
      initSearch();           // init the full text search
      initFreeSearch();       // init the "free" search inputs, which implement full-text search
      initTable();            // the Table is fully populated from the trackers dataset, but is filtered at runtime
      initMap();              // regular leaflet map setup
      initMapLayers();        // init some map layers and map feature styles
      initMapControls();      // initialize the layer pickers, etc.
      initPruneCluster();     // init the "prune cluster" library

      // before we go further, wait for the map to fully load
      initState();          // init app state. This is the app "entry point"
      initTooltips();       // init Tippy tooltips _after_ the table is ready

console.log(DATA);
console.log(CONFIG);

      // ready!
      setTimeout(function () {
        resize();
        $('div#loading').hide();
        CONFIG.first_load = false;
      }, 300);
    }); // Promise.then()

    // initialize a resize handler
    $(window).on('resize', resize );
});

// resize everything: map, content divs, table
function resize() {
  // calculate the content height for this window:
  // 42px for the nav bar, 10px top #map, 10px top of #container = 42 + 20 + 10
  var winheight = $(window).height();
  var height = winheight - 54;
  if (height > 1000) height = 1000; // on giant screens, we need a max height

  // resize the map
  $('div#map').height(height - 8);
  CONFIG.map.invalidateSize();

  // resize the content divs to this same height
  $('div.content').height(height);

  // resize the table body
  // guesstimate a good scrollbody height; dynamic based on the window height
  var tablediv = $('.dataTables_scrollBody');
  if (!tablediv.length) return;

  // differential sizing depending on if there is a horizontal scrollbar or not
  var factor = 300; // seems to work well across screen widths
  if (tablediv.hasHorizontalScrollBar()) factor += 10;
  var height = $('body').height() - factor;
  // set the scrollbody height via css property
  tablediv.css('height', height);
  CONFIG.table.columns.adjust().draw();
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////
///// FUNCTIONS CALLED ON DOC READY
///////////////////////////////////////////////////////////////////////////////////////////////////////////

// Basic data init, returns a promise
function initData(url) {
  // wrap this in a promise, so we know we have it before continuing on to remaining initialize steps
  return new Promise(function(resolve, reject) {
    $.get(url, function(data) {
      resolve(data);
    });
  });
}

// Data formatting routines, to get the static, raw data files into the form we need it in
function initDataFormat(data) {
  // set country data equal to the second data object from the initData() Promise()
  DATA.country_data = data[1];

  // get the list of valid types, for data checks, below
  var processes = Object.keys(CONFIG.process_types);

  // format the "tracker" point data
  // 1) parse raw JSON from CSV
  var json = Papa.parse(data[0], {header: true});

  // 2) create stubs for geojson files, one for terminals, one for pipelines
  var fossils = {};
  fossils['type'] = 'FeatureCollection';
  fossils['features'] = [];

  // 3) iterate over raw json to extract geometry and props for GeoJSON
  json.data.forEach(function(row,i) {
    // stub out a feature, and empty coords
    var feature = {
      "type": "Feature",
      "geometry": {},
      "properties": {},
      // This is not well documented, but js-search requires a unique ID for indexing
      // see initSearch()
      id: i,
    };

    // Data checks and fixes
    // a) Skip rows with invalid status
    if (processes.indexOf(row.process) < 0) {
      console.log(feature)
      console.log(row.process)
      console.log(row)
      console.log(`Error: ${row.project} has invalid production type: ${row.process}`);
      return;
    }

    // b) Skip rows without a latitude or longitude
    if (!row.lat || !row.lng) {
      console.log(`Error: ${row.project} missing latitude and/or longitude`);
      return;
    } 

    // c) Skip invalid lat/lng
    if (isNaN(parseFloat(row.lat)) || isNaN(parseFloat(row.lng))) {
      console.log(`Error: ${row.project} invalid latitude and/or longitude`);
    }

    // d) fix "blanks" for the following. We can't filter data by "blank"
    // needed? 

    // looks good, make the record
    var type = "Point";
    var coordinates = [];
    coordinates[0] = parseFloat(row.lng);
    coordinates[1] = parseFloat(row.lat);

    // all done setting up coordinates, add to the feature
    feature.geometry.type = type;
    feature.geometry.coordinates = coordinates;

    // Properties: Add these from the keys defined in CONFIG.attributes. These will be the same for pipelines/terminals
    var props = Object.keys(CONFIG.attributes);
    props.forEach(function(property) {
      var thisprop = row[property];
      // formatting and special cases
      feature.properties[property] = thisprop;
    });
    // all set with this feature push it to fossils
    fossils['features'].push(feature);
  });

  // Final step: keep a reference to this geojson in DATA
  DATA.fossil_data = fossils;
}

// init tippy tooltips. We are using the data-tippy-content form here
function initTooltips() {
  // not much to it...
  tippy('[data-tippy-content]');
}

// init state from params, or not
function initState() {
  // set initial map view, this may be overridden in a moment
  CONFIG.map.fitBounds(CONFIG.homebounds);

  // check for params, and if found, use them to update the view
  var params = new URLSearchParams(window.location.search);
  // check if the params object has anything in it
  if (params.toString()) {
    setStateFromParams(params);
  } else {
    // no params, carry on as usual
    render();
  }
}

function setStateFromParams(params) {
  // parse status params
  if (params.has('status')) {
    // get the checkboxes and clear them all
    let checks = $('div#status-types input').prop('checked', false);
    // gather all the checked statuses from the params
    let statuses = params.get('status').split(',');

    // check those that were specified in the params 
    statuses.forEach(function(value) {
      $(`div#status-types input[value=${value}]`).prop('checked', true);
    });
  }

  // parse process param
  if (params.has('process')) {
    // get the checkboxes and clear them all
    let checks = $('div#process-types input').prop('checked', false);
    // gather all the checked statuses from the params
    let processes = params.get('process').split(',');

    // check those that were specified in the params 
    processes.forEach(function(value) {
      $(`div#process-types input[value=${value}]`).prop('checked', true);
    });
  }

  if (params.has('process') || params.has('status')) {
    // trigger change on one layer checkbox. It doesn't matter which one 
    $('div#process-types input').first().trigger('change');
  }

  // parse basemapmap param
  if (params.has('basemap')) {
    let basemap = params.get('basemap');
    CONFIG.basemap_control.selectLayer(basemap);
  }

  // parse country param
  if (params.has('country')) {
    // parse the country param, to Title Case
    let countryname = params.get('country')
    countryname = countryname.toTitleCase();

    // find the matching feature for the map
    let feature;
    DATA.country_data.features.forEach(function(f) {
      if (f.properties['NAME'] == countryname) {
        feature = f;
        return;
      }
    })

    // if this is a Chinese province, then we need to switch which attribute we search for data
    // note: not needed in previous step, as DATA.country_data already has province names in NAME
    let attribute = CONFIG.ch_provinces.indexOf(countryname) > -1 ? 'province' : 'country';

    // find the matching data for the result panel
    var data = [];
    DATA.fossil_data.features.forEach(function(feature) {
      // look for matching names in feature.properties.country
      // note that we use the country lookup to match the map name to the name in the data
      if (feature.properties[attribute] == countryname) data.push(feature);
    });

    // highlight it on the map and update the result panel
    CONFIG.selected_country.name = countryname;
    CONFIG.selected_country.layer.addData(feature);
    updateResultsPanel(data, countryname);
  }

  // parse view params
  if (params.has('view')) {
    let view = params.get('view');
    let views = view.split(',');
    CONFIG.map.setView([views[0],views[1]],views[2]);
  }

  // parse map type params
  if (params.has('maptype')) {
    let maptype = params.get('maptype');
    $(`div.leaflet-control-mapswitcher-option[data-layer="${maptype}"]`).click();
  }

  // parse the search params 
  // do this last, as it makes the most UI changes
  if (params.has('search')) {
    let search = params.get('search');
    // simply submitting this should do and update everything
    $('input#mapsearch').val(search).submit(); 
  }

}

// the inverse of setStateFromParams: update the params on the address bar based on user interactions
function updateStateParams() {
  if (CONFIG.first_load) return;
  // get the current search params
  let params = new URLSearchParams(window.location.search);

  // set the view param
  let zoom   = CONFIG.map.getZoom();
  let center = CONFIG.map.getCenter();
  let view = `${center.lat.toPrecision(8)},${center.lng.toPrecision(8)},${zoom}`;
  params.delete('view');
  params.append('view', view);

  // set a param for selected country
  // this one we want to explicity clear if it gets "unselected", so always start with delete
  params.delete('country');
  if (CONFIG.selected_country && CONFIG.selected_country.name) {
    params.append('country', CONFIG.selected_country.name);
  }

  // set a param for selected status
  let statuses = $('div#status-types input:checked').map(function(){
    return $(this).val();
  }).get();
  if (statuses.length) {
    params.delete('status');
    params.append('status', statuses);
  }

  // set a param for selected process type
  let processes = $('div#process-types input:checked').map(function(){
    return $(this).val();
  }).get();
  if (processes.length) {
    params.delete('process');
    params.append('process', processes);
  }

  // set a param for map type
  let maptype = $('div.leaflet-control-mapswitcher-option-active').data().layer;
  if (maptype) {
    params.delete('maptype');
    params.append('maptype', maptype);
  }

  // set a basemap param
  let basemap = $('div.leaflet-control-basemapbar-option-active').data().layer;
  if (basemap) {
    params.delete('basemap');
    params.append('basemap', basemap);
  }

  // set a search term param
  let search = $('input#mapsearch').val(); // this is mirrored on the table search, so grabbing one or the other should be sufficient
  params.delete('search'); // always delete, this handles the case where the search input is cleared
  if (search) {
    params.append('search', search);
  }

  // all set! if we have anything, parse the string, make it a query and
  // replace state in our local address bar
  let searchstring = decodeURIComponent(params.toString());
  if (searchstring) {
    var newparams = '?' + searchstring;
    window.history.replaceState(newparams, '', newparams);
  }

  // final step: Let the iframe know the new params
  // so we can get this on the address bar of the parent page
  parent.postMessage(newparams, '*');
}


function initButtons() {
  // "home" button that resets the map
  $('div a#home-button').on('click', function(){
    resetTheMap();
  });

  // search icons on the search forms, click to submit
  $('form.search-form span.glyphicon-search').on('click', function() {
    $(this).closest('form').submit();
  });

  // close button, generically closes it's direct parent
  $('div.close').on('click', function() { $(this).parent().hide(); });

  // init the layer icon control to open the legend
  $('#layers-icon').on('click', function() { $('div.layer-control').show(); });

  // init the menu icon to open the "results" panel
  $('div#results-icon').on('click', function() { $('div#country-results').show(); });

  // the clear search button, clears the search inputs on the map and table
  $('div.searchwrapper a.clear-search').on('click', function() {
    $('form.search-form input').val('').trigger('keyup');
    $(this).hide();
    DATA.filtered = null;
    $('div#zoom-filtered').remove();
    updateStateParams();
  });

  // select all/clear all "buttons" by status and type
  $('div#layer-control-clear span#select-all').on('click', function(e) {
    let type = $(this).data().type;
    $(`div#${type}-types input:not(:checked)`).each(function(c) { $(this).click() });
    return false;
  });
  $('div#layer-control-clear span#clear-all').on('click', function(e) {
    let type = $(this).data().type;
    $(`div#${type}-types input:checked`).each(function(c) { $(this).click() });
    return false;
  });

  // zoom to button on reesults panel, delegated click handler
  $('body').on('click', 'a.zoomto', function() {
    zoomToResults();
  });

  // init the zoom button that shows on the modal details for an individual coal plant
  $('#btn-zoom').click(function(){
    var zoomtarget = this.dataset.zoom.split(',');
    var latlng = L.latLng([zoomtarget[0], zoomtarget[1]]);
    var zoom = 16;

    // switch to satellite view
    CONFIG.basemap_control.selectLayer('photo');

    // get the target tracker that opened this info panel
    CONFIG.backbutton.setTargetTracker($(this).data().tracker);

    // set the previous bounds that we should go to when we click the back button
    CONFIG.backbutton.setPreviousBounds(CONFIG.map.getBounds());

    // add the back button, which takes the user back to previous view (see function goBack()
    // but only if there is not already a back button on the map
    if ($('.btn-back').length == 0) CONFIG.backbutton.addTo(CONFIG.map);

    // move and zoom the map to the selected unit
    CONFIG.map.setView(latlng, zoom);
  });

  // callback on showing the tracker info panel: make the columns the same height
  $(document).on('#tracker-modal', 'shown.bs.modal', function () {
    setTimeout(function() {
      let cols = $('#tracker-modal').find('.modal-cols');

      var maxheight = -1; 
      cols.each(function() {
        let col = $(this);
        maxheight = maxheight > col.height() ? maxheight : col.height();
      })

      cols.each(function() { $(this).height(maxheight); })
    }, 500);
 })

}

// initialize the nav tabs: what gets shown, what gets hidden, what needs resizing, when these are displayed
// important: to add a functional tab, you must also include markup for it in css, see e.g. input#help-tab:checked ~ div#help-content {}
function initTabs() {
  $('input.tab').on('click', function(e) {
    // get the type from the id
    var type = e.currentTarget.id.split("-")[0];
    switch (type) {
      case 'map':
        // show the correct search form, and resize the map
        $('#nav-table-search').hide();
        $('#nav-place-search').show();
        CONFIG.map.invalidateSize(false);
        break;
      case 'table':
        // resize the table, if it exists
        if (CONFIG.table) {
          resize();
        }
        // show the correct search form
        $('#nav-place-search').hide();
        $('#nav-table-search').show();
        break;
      default:
        // hide search forms
        $('form.search-form').hide();
        break;
    }
  });

  // update (c) year
  let year = new Date().getFullYear();
  $('span#year').text(year);
}

function initSearch() {
  // instantiate the search on a "universal id" (or uid in the docs)
  CONFIG.searchengine = new JsSearch.Search('id');
  // add fields to be indexed
  Object.keys(CONFIG.attributes).forEach(function(key) {
    CONFIG.searchengine.addIndex(['properties', key]);
  });
  // add data documents to be searched
  var documents = [];
  DATA.fossil_data.features.forEach(function(feature) {
    documents.push(feature);
  });
  CONFIG.searchengine.addDocuments(documents);
}

// "Free" search searches the data for matching keywords entered in the input at top-right
// we use JSsearch https://github.com/bvaughn/js-search as the search "engine"
function initFreeSearch() {
  // This inits the "free search" form input, which looks for matching keywords in data
  $('form.free-search input').on('keyup', function(event) {
    // prevent default browser behaviour, especially on 'enter' which would refresh the page
    event.preventDefault();
    // if the input is cleared, redo the 'everything' search (e.g. show all results)
    // this is distinct from the case of "No results", in searchMapForText
    if (!this.value) return render();
    // submit the form
    $(this).submit();
  });

  // the submit function itself
  $('form.free-search').on('submit', searchMapForText);
}

// initialize the map in the main navigation map tab
function initMap() {
  // basic leaflet map setup
  CONFIG.map = L.map('map', {
    attributionControl: false,
    zoomControl: false,
    minZoom: CONFIG.minzoom, maxZoom: CONFIG.maxzoom,
  });

  // map panes
  // - create a pane for the carto streets basemap
  CONFIG.map.createPane('basemap-map'); 
  CONFIG.map.getPane('basemap-map').style.zIndex = 200;

  // - create a pane for the esri satellite tiles
  CONFIG.map.createPane('basemap-photo');  
  CONFIG.map.getPane('basemap-photo').style.zIndex = 225;

  // - create a pane for basemap tile labels
  CONFIG.map.createPane('basemap-labels');
  CONFIG.map.getPane('basemap-labels').style.zIndex = 575;
  CONFIG.map.getPane('basemap-labels').style.pointerEvents = 'none';

  // - create map panes for county interactions, which will sit between the basemap and labels
  CONFIG.map.createPane('country-hover');
  CONFIG.map.getPane('country-hover').style.zIndex = 350;
  CONFIG.map.createPane('country-select');
  CONFIG.map.getPane('country-select').style.zIndex = 450;

  // define the basemaps
  const basemaps = [
    {
      type:'xyz',
      label:'photo',
      pane: 'basemap-photo',
      maxZoom: CONFIG.maxzoom,
      minZoom: CONFIG.minzoom,
      url:'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution:'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community.',
      tooltip:'Satellite + aerial photo basemap by ESRI'
    },
    {
      type:'xyz',
      label:'map',
      pane: 'basemap-map',
      maxZoom: CONFIG.maxzoom,
      minZoom: CONFIG.minzoom,
      url:'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'),
      attribution:'Map tiles by <a target="_blank" href="http://www.mapbox.com">MapBox</a>. Tile data &copy; <a target="_blank" href="http://openstreetmap.org/copyright" target="_blank">OpenStreetMap contributers</a>',
      tooltip:'Plain grey map with Open Street Map data'
    },
  ];

  // add attribution
  var credits = L.control.attribution({ 
    prefix: 'Interactive mapping by <a href="http://greeninfo.org" target="_blank">GreenInfo Network</a>. Data: <a href="https://globalenergymonitor.org/" target="_blank">Global Energy Monitor</a>',
    position: 'bottomleft' 
  }).addTo(CONFIG.map);

  // construct the basemapbar, it will be added later
  CONFIG.basemap_control = new L.Control.BasemapBar({
    layers: basemaps,
    position: 'topright',
    credits: credits,
  });

  // construct the custom zoom home control, it will be added later
  CONFIG.zoombar = new L.Control.ZoomBar({
    position: 'topright',
    // homeLatLng: [CONFIG.startlat, CONFIG.startlng],
    homeBounds: CONFIG.homebounds,
    homeZoom: CONFIG.startzoom,
  });

  // Add a layer to hold countries, for click and hover (not mobile) events on country features
  CONFIG.countries = L.featureGroup([], { pane: 'country-hover' }).addTo(CONFIG.map);
  var countries = L.geoJSON(DATA.country_data,{ style: CONFIG.country_no_style, onEachFeature: massageCountryFeaturesAsTheyLoad }).addTo(CONFIG.countries);

  // add a layer to hold any selected country
  CONFIG.selected_country = {};
  CONFIG.selected_country.layer = L.geoJson([], {
    style: CONFIG.country_selected_style, pane: 'country-select'
  }).addTo(CONFIG.map);

  // mobile: hide legend
  var layercontrol = $('.layer-control');
  if (isMobile()) layercontrol.hide();

  // once the map is done loading, resize and hide the loading spinner
  CONFIG.map.on('load', function() {
    resize();
    CONFIG.map.invalidateSize();
    CONFIG.map_loaded = true;
  });

  // create an instance of L.backButton()
  CONFIG.backbutton = new L.backButton({basemapControl: CONFIG.basemap_control}) // not added now, see initButtons()

  // listen for changes to the map, and update state params
  CONFIG.map.on('move zoom', function() {
    updateStateParams();
  });

  // country hover is annoying at high zoom
  CONFIG.map.on('zoomend', function() {
    if (CONFIG.map.getZoom() > 10) {
      CONFIG.countries.removeFrom(CONFIG.map);
    } else {
      CONFIG.countries.addTo(CONFIG.map);
    }
  });

}

function initMapLayers() {
  // add the labels to the top of the stack
  let labels = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}@2x.png', { pane: 'basemap-labels' });
  CONFIG.map.addLayer(labels);

  // Add a layer to hold features for clusters and proportional circles
  // these will get toggled on and off by a radio control in the control panel, and never both show at the same time
  CONFIG.cluster_layer = L.featureGroup([], {}).addTo(CONFIG.map); // on by default
  CONFIG.circle_layer = L.featureGroup([], {});                    // off by default
 
  let mapswitcherlayers = [
    {label: 'plant view', key: 'plantview', layer: CONFIG.cluster_layer, tooltip: 'Select capacity view'},
    {label: 'steelmaking capacity view', key: 'capacityview', layer: CONFIG.circle_layer, tooltip: 'Select plant view'}
  ]

  // add a map switcher control to the map, with these two layers
  CONFIG.mapswitcher = new L.Control.MapSwitcher({
    layers: mapswitcherlayers,
    position: 'topright',
  }).addTo(CONFIG.map).selectMap('plantview');

  // add the basemap control, and the zoom control
  CONFIG.basemap_control.addTo(CONFIG.map).selectLayer('map');
  CONFIG.zoombar.addTo(CONFIG.map);

  // create a mutation observer, so we can respond to changes to the map and basemap buttons
  const attrObserver = new MutationObserver((mutations) => {
    mutations.forEach(mu => {
      if (mu.type !== "attributes" && mu.attributeName !== "class") return;
      let layer = mu.target.dataset.layer;
      switch (layer) {
        case 'plantview':
        case 'capacityview':
          updateStateParams();
          if ($('div.leaflet-control-mapswitcher-option-active').data().layer == 'capacityview') {
            $('div#circle-legend').show();
          } else {
            $('div#circle-legend').hide();
          }
          break;

        case 'map':
        case 'photo':
          updateStateParams();
          break;
      }
    });
  });

  // register the observers on the specified elements
  const mapswitch_observers = document.querySelectorAll(".leaflet-control-mapswitcher-option");
  mapswitch_observers.forEach(el => attrObserver.observe(el, {attributes: true}));

  const basemap_observers = document.querySelectorAll(".leaflet-control-basemapbar-option");
  basemap_observers.forEach(el => attrObserver.observe(el, {attributes: true}));

  // mobile feature styles: larger lines, bigger circles, for easier clicks
  if ( isMobile() ) {
    styles.circlesize = styles.circlesize_mobile;
  }
}

// Create and init the legend and layer control
// there are several classes of controls, that work independently, 
// you can toggle features on the map by type OR by status OR ...
function initMapControls() {
  // grab keys for fossil and status types. Each of these will be one legend 'section', and the keys within will form one entry per type
  var processes = Object.keys(CONFIG.process_types);
  var statuses  = Object.keys(CONFIG.status_types);

  // iterate PROCESSES, and create the legend entries for each
  processes.sort(function(a,b) {return CONFIG.process_types[a]["order"] - CONFIG.process_types[b]["order"]});
  processes.forEach(function(proci) {
    var target = $('div.layer-control div#process-types div.leaflet-control-layers-overlays');
    // add a wrapper for the legend items
    var inner = $('<div>', {'class': 'legend-labels'}).appendTo(target);
    // then add a label and checkbox
    var label = $('<label>').appendTo(inner);
    var input = $('<input>', {
      type: 'checkbox',
      value: proci,
      checked: true,
    }).appendTo(label);
    // now add colored circle to legend
    var outerSpan = $('<span>').appendTo(label);
    var div = $('<div>', {
      'class': `circle ${CONFIG.process_types[proci].cssclass}`,
    }).appendTo(outerSpan);
    var innerSpan = $('<span>', {
      text: ' ' + CONFIG.process_types[proci].text
    }).appendTo(outerSpan);
  });

  // iterate STATUS, and create the legend entries for each
  statuses.forEach(function(status){
    var target = $('div.layer-control div#status-types div.leaflet-control-layers-overlays');
    // add a wrapper for the legend items
    var inner = $('<div>', {'class': 'legend-labels'}).appendTo(target);
    // then add a label and checkbox
    var label = $('<label>').appendTo(inner);
    var input = $('<input>', {
      type: 'checkbox',
      value: status,
      checked: true,
    }).appendTo(label);
    // add text to label
    var outerSpan = $('<span>').appendTo(label);
    // adds text to legend
    var innerSpan = $('<span>', {
      text: ' ' + CONFIG.status_types[status].text
    }).appendTo(outerSpan);
  });

  // Set up change triggers on the checkboxes. 
  // In short, filter the data and send it off to various handlers for drawing the map, table, etc.
  $('div.layer-control div.leaflet-control-layers-overlays').on('change', 'input', function(e) {
    var status = e.currentTarget.dataset.layer;
    var checkbox = $(this);

    // get selected statuses
    var statuses = $('div#status-types input:checkbox:checked').map(function() {
      return this.value;
    }).get();

    // get selected types
    var processes = $('div#process-types input:checkbox:checked').map(function() {
      return this.value;
    }).get();

    // filter all data for the current set of checkboxes. This means we also need to clear any search term
    let data_to_filter = DATA.fossil_data.features;
    var filtered = data_to_filter.filter(function(d) {
      return statuses.indexOf(d.properties.status) > -1 && processes.indexOf(d.properties.process) > -1;
    });

    $('form.search-form input').val(''); // clear out search. This is either "search a term" or "search using filters", not both
    $('a.clear-search').hide();
    DATA.filtered = null;
    let message = getResultsMessage();
    updateResultsPanel(filtered, message);
    drawMap(filtered); 
    drawTable(filtered, message);
    updateStateParams();
  });


  // init the controls for "map type"
  $('div#map-type-controls input').on('change', function() {
    let checkbox = $(this);
    // first remove all layers
    CONFIG.map.removeLayer(CONFIG.circle_layer);
    CONFIG.map.removeLayer(CONFIG.cluster_layer);
    // and add back the one that was checked
    if (checkbox.is(':checked')) {
      if (checkbox.val() == 'circles') {
        $('div#circle-legend').show();
        CONFIG.map.addLayer(CONFIG.circle_layer);
      } 
      if (checkbox.val() == 'clusters') { 
        $('div#circle-legend').hide();
        CONFIG.map.addLayer(CONFIG.cluster_layer);
      }
    }
    // all set: update params
    updateStateParams();
  }); 
}

// initialize the PruneClusters, and override some factory methods
function initPruneCluster() {
  // create a new PruceCluster object, with a minimal cluster size of (X)
  // updated arg to 30; seems to really help countries like China/India
  CONFIG.clusters = new PruneClusterForLeaflet(30);
  CONFIG.cluster_layer.addLayer(CONFIG.clusters);

  // this is from the categories example; sets ups cluster stats used to derive category colors in the clusters
  CONFIG.clusters.BuildLeafletClusterIcon = function(cluster) {
    var e = new L.Icon.MarkerCluster();
    e.stats = cluster.stats;
    e.population = cluster.population;
    return e;
  };

  var pi2 = Math.PI * 2;

  L.Icon.MarkerCluster = L.Icon.extend({
    options: {
      iconSize: new L.Point(22, 22),
      className: 'prunecluster leaflet-markercluster-icon'
    },

    createIcon: function () {
      // based on L.Icon.Canvas from shramov/leaflet-plugins (BSD licence)
      var e = document.createElement('canvas');
      this._setIconStyles(e, 'icon');
      var s = this.options.iconSize;
      e.width = s.x;
      e.height = s.y;
      this.draw(e.getContext('2d'), s.x, s.y);
      return e;
    },

    createShadow: function () {
      return null;
    },

    draw: function(canvas, width, height) {
      // the pie chart itself
      var start = 0;
      for (var i = 0, l = CONFIG.markercluster_colors.length; i < l; ++i) {
        // the size of this slice of the pie
        var size = this.stats[i] / this.population;
        if (size > 0) {
          canvas.beginPath();
          canvas.moveTo(11, 11);
          canvas.fillStyle = CONFIG.markercluster_colors[i];
          // start from a smidgen away, to create a tiny gap, unless this is a single slice pie
          // in which case we don't want a gap
          var gap = size == 1 ? 0 : 0.15
          var from = start + gap;
          var to = start + size * pi2;

          if (to < from) {
            from = start;
          }
          canvas.arc(11,11,11, from, to);
          start = start + size*pi2;
          canvas.lineTo(11,11);
          canvas.fill();
          canvas.closePath();
        }
      }

      // the white circle on top of the pie chart, to make the middle of the "donut"
      canvas.beginPath();
      canvas.fillStyle = 'white';
      canvas.arc(11, 11, 7, 0, Math.PI*2);
      canvas.fill();
      canvas.closePath();

      // the text label count
      canvas.fillStyle = '#555';
      canvas.textAlign = 'center';
      canvas.textBaseline = 'middle';
      canvas.font = 'bold 9px sans-serif';

      canvas.fillText(this.population, 11, 11, 15);
    }
  });

  // we override this method: don't force zoom to a cluster on click (the default)
  CONFIG.clusters.BuildLeafletCluster = function (cluster, position) {
    var _this = this;
    var m = new L.Marker(position, {
      icon: this.BuildLeafletClusterIcon(cluster)
    });
    // this defines what happen when you click a cluster, not the underlying icons
    m.on('click', function () {
      var markersArea = _this.Cluster.FindMarkersInArea(cluster.bounds);
      var b = _this.Cluster.ComputeBounds(markersArea);
      if (b) {
        // skip the force zoom that is here by default, instead, spiderfy the overlapping icons
        _this._map.fire('overlappingmarkers', { cluster: _this, markers: markersArea, center: m.getLatLng(), marker: m });
      }
    });
    return m;
  }

  // we override this method to handle clicks on individual plant markers (not the clusters)
  CONFIG.clusters.PrepareLeafletMarker = function(leafletMarker, data){
    var html = `<div style='text-align:center;'><strong>${data.title}</strong><br><div class='popup-click-msg'>Click the circle for details</div></div>`;
    leafletMarker.bindPopup(html);
    leafletMarker.setIcon(data.icon);
    leafletMarker.attributes = data.attributes;
    leafletMarker.coordinates = data.coordinates;
    leafletMarker.on('click',function () {
      openTrackerInfoPanel(this);
    });
    leafletMarker.on('mouseover', function() {
      this.openPopup();
    });
    leafletMarker.on('mouseout', function() { CONFIG.map.closePopup(); });
  }

  // A convenience method for marking a given feature as "filtered" (e.g. not shown on the map and removed from a cluster)
  CONFIG.clusters.FilterMarkers = function (markers, filter) {
    for (var i = 0, l = markers.length; i < l; ++i) {
      // false to add, true to remove
      markers[i].filtered = filter;
    }
  };
}

// itialization functions for the table. Table data is populated only after a search is performed
function initTable() {
  // init the table search form. This mimics the built-in datatables 'filter', but includes the already selected area
  // this way, we only ever search within a given selection (either all records, or a subset)
  // if we are looking at the default table, do not filter, start from all records. Otherwise, use the selection term
  $('form#nav-table-search input').keyup(_.debounce(function() {
    if (!this.value) return render();
    $(this).submit();
  },200));

  // the submit function itself
  $('form#nav-table-search').on('submit', searchTableForText);
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////
///// NAMED FUNCTIONS 
///////////////////////////////////////////////////////////////////////////////////////////////////////////

function resetTheMap() {
  // clear anything in the search inputs
  $('form.search-form input').val('');

  // reset map & table display with the default search
  render({name: '', map: true, results: true, table: true });

  // clear any existing country and feature selection
  CONFIG.selected_country.layer.clearLayers();
  CONFIG.selected_country.name = '';
  DATA.filtered = null;
  $('div#zoom-filtered').remove();

  // switch back to the map tab
  $('input#map-tab').click();

  // resize everything
  resize(); 

  // reset the default view extent and basemap
  CONFIG.map.fitBounds(CONFIG.homebounds);
  CONFIG.basemap_control.selectLayer('map');

  // reset the map type
  $('div#map-type-controls input[value="clusters"]').click();

  // check all checkboxes 
  $('div.leaflet-control-layers-overlays input').prop('checked','checked'); // select everything in the legend
}

// a controller for rendering 'everything', with the following options
function render(options) {

  // get or set the following options
  if (options === undefined) options = {};
  if (options.name === undefined) options.name = '';
  if (options.map === undefined) options.map = true;
  if (options.results === undefined) options.results = true;
  if (options.table === undefined) options.table = true;

  // optionally draw the map (and legend) table, results
  $('div.searchwrapper a.clear-search').hide();
  if (options.map) drawMap(DATA.fossil_data.features);
  if (options.results) updateResultsPanel(DATA.fossil_data.features);
  if (options.table) drawTable(DATA.fossil_data.features, options.name);
}

// the main map update rendering function
// when all is said and done, there's really not much to this: 
// just send the data off to updateClusters() and updateCircles()
function drawMap(data) {
  // call the clustering algorithm and the circle generator
  // only one is visible at a time
  updateClusters(data);
  updateCircles(data); 
}

// given filtered data, update the proportional circles
function updateCircles(data) {
  // clear whatever layers we have
  CONFIG.circle_layer.clearLayers();

  // first, a sort so smaller circles will be placed on top of larger ones
  data.sort(function(a, b) {
    return b.properties.steel_capacity - a.properties.steel_capacity;
  });

  // create circles and icons for the circle map
  L.geoJson(data, {
    pointToLayer: function(feature, latlng) {
      let circle; 
      let capacity = feature.properties.steel_capacity;

      // don't handle these at all. These plants make iron, not steel, or we don't know
      if (capacity == 'N/A' || capacity == 'unknown') return; 

      // for these cases, return a regular old leaflet marker
      if (capacity == '>0' || isNaN(capacity)) {
        let icon = L.divIcon({
          // Specify a class name we can refer to in CSS.
          // fossil-feature allows us to distinguish between fossil features and countries on hover
          className: 'fossil-feature circle-div status8',
          // Set the marker width and height
          iconSize: [styles.circlesize, styles.circlesize],
        });
        circle = L.marker(latlng, {icon: icon});
      } else {
        // make a circleMarker
        circle = L.circleMarker(latlng, {
          color: '#333',
          weight: 1,
          opacity: 0.5,
          fillColor: CONFIG.process_types[feature.properties.process].color,
          fillOpacity: 0.5,
          radius: getRadiusForCircleSybols(capacity),
        });
      }
      // all set
      return circle;
    }, 
    onEachFeature: function(feature, layer) {
      // bind a simple Tooltip
      let html = `<div style='text-align:center;'><strong>${feature.properties.project}</strong><br><div class='popup-click-msg'>Steel Capacity: ${CONFIG.format['mixed'](feature.properties.steel_capacity)} (TTPA)</div></div>`;
      layer.bindTooltip(html);
      
      // for circleMarkers only, apply some hover interaction
      if (typeof layer.setStyle === 'function') {
        layer.on('mouseover', function() {
          layer.setStyle({
            weight: 2,
            fillOpacity: 1
          });
        });
        layer.on('mouseout', function() {
          layer.setStyle({
            weight: 1,
            fillOpacity: 0.5,
          });
        });      
      }
    },
  // all set! Add it to the layer
  }).addTo(CONFIG.circle_layer);

  // update the circle legend, from the min and max capacity values of this set
  let capacity_values = data.map(function(o) { 
    return parseInt(o.properties.steel_capacity);
  })
  let min = _.min(capacity_values);
  let max = _.max(capacity_values);
  let minradius = getRadiusForCircleSybols(min);
  let maxradius = getRadiusForCircleSybols(max);

  // then use 2D Canvas to render circles in the legend: one for the largest "capacity" in the data, and one for the smallest
  let canvas = document.getElementById('circle-legend-canvas');
  let buffer = 30;
  canvas.height = maxradius * 2 + buffer;
  let context = canvas.getContext('2d');
  let centerX = canvas.width / 2;
  let centerY = canvas.height / 2;

  let maxcircle = new Path2D(); 
  context.fillStyle = 'rgba(255, 255, 255, 0.5)';
  context.lineWidth = 1;
  maxcircle.arc(centerX, centerY, maxradius, 0, 2 * Math.PI, false);
  context.fill(maxcircle); 
  context.strokeStyle = '#ccc';
  context.stroke(maxcircle);

  let mincircle = new Path2D(); 
  context.fillStyle = 'rgba(255, 255, 255, 0.5)';
  // context.fillOpacity = 0.5;
  mincircle.arc(centerX, canvas.height - minradius - (buffer / 2), minradius, 0, 2 * Math.PI, false);
  context.fill(mincircle);
  context.strokeStyle = '#aaa';
  context.stroke(mincircle);

  context.font = '8pt Arial';
  context.textAlign = 'center';
  context.fillStyle = '#333';
  let mintext = CONFIG.format['number'](min) + ' TTPA';
  let maxtext = CONFIG.format['number'](max) + ' TTPA';
  context.fillText(mintext, centerX, canvas.height - (minradius * 2) - (buffer * .66));
  context.fillText(maxtext, centerX, canvas.height - (canvas.height - (buffer * .33)));
}

// calculate the circle radius from the capacity, so that comparing circles compares two like areas/amounts
// using the capacity as the radius would not be a good idea for visual comparison
function getRadiusForCircleSybols(area) {
  var radius = Math.sqrt(area/Math.PI);
  // arbitrary scalar to make the circles "fit"
  return radius * .5;
}

// given filtered data, update and render the clusters
function updateClusters(data, fitbounds=false) {
  // start by clearing out existing clusters
  CONFIG.clusters.RemoveMarkers();
  // iterate over the data and set up the clusters
  data.forEach(function(feature) {
    // the "process" of the tracker point affects its icon color
    var proci = feature.properties.process;
    var lng = feature.geometry.coordinates[0];
    var lat = feature.geometry.coordinates[1];

    // if we dom't have this proci in our list of valid process types, return
    if (! CONFIG.process_types[proci]) return;
    var cssClass = CONFIG.process_types[proci]['cssclass'];
    var marker = new PruneCluster.Marker(parseFloat(lat), parseFloat(lng), {
      title: feature.properties.project,
      icon: L.divIcon({
          className: 'circle-div ' + cssClass, // Specify a class name we can refer to in CSS.
          iconSize: [15, 15] // Set the marker width and height
        })
    });

    // get the attributes for use in the custom popup dialog (see openTrackerInfoPanel())
    marker.data.attributes = feature.properties;

    // get the lat-lng now so we can zoom to the plant's location later
    // getting the lat-lng of the spider won't work, since it gets spidered out to some other place
    // tip: the raw dataset is lng,lat and Leaflet is lat,lng
    marker.data.coordinates = [ lat, lng ];

    // set the category for PruneCluster-ing. Note this is 0 indexed
    let order = CONFIG.process_types[proci]['order'];
    marker.category = parseInt(order - 1);

    // register the marker for PruneCluster clustering
    CONFIG.clusters.RegisterMarker(marker);
  });

  // all set! process the view, and fit the map to the new bounds
  CONFIG.clusters.ProcessView();
  var cluster_bounds = CONFIG.clusters.Cluster.ComputeGlobalBounds();
  if (cluster_bounds) {
    var bounds = [[cluster_bounds.minLat, cluster_bounds.minLng],[cluster_bounds.maxLat, cluster_bounds.maxLng]];
  } else {
    // we have no clusters (empty result)!
    bounds = CONFIG.homebounds;
  }
  // fit the map to the bounds, if instructed
  if (fitbounds) {
    // timeout appears necessary to let the clusters do their thing, before fitting bounds
    setTimeout(function() {
      // typically we'll just do this (e.g. on search)
      CONFIG.map.fitBounds(bounds);
      // first load: a trick to always fit the bounds in the map, see #20
      if (! CONFIG.homebounds) {
        let center = CONFIG.map.getCenter();
        let zoom = CONFIG.map.getBoundsZoom(bounds, true); // finds the zoom where bounds are fully contained
        CONFIG.map.setView([center.lat, center.lng], zoom);
        CONFIG.map.once("moveend zoomend", function() {
          // wait til this animation is complete, then set homebounds
          CONFIG.homebounds = CONFIG.map.getBounds();
        });
      } 
    }, 200);
  }
}

// update the "results" panel that sits above the map, top left
// this always shows either the Global tally of things, or a country-specific count, or a count from a search term enterd in the "Free Search" input
function updateResultsPanel(data, country=CONFIG.default_title) {
  // update primary content
  $('div#country-results div#results-title h3').text(country);

  // tally results per type of fossil project, and add a row for each if there is more than one
  var results = $('div#type-count').empty();

  // for each fossil proci, get the count of that process from the data
  // update: the total count is now displayed in three buckets (see #24)
  var total1 = 0;
  var total2 = 0;
  var total3 = 0;
  var statuses1 = ['cancelled', 'mothballed', 'retired', 'operating_pre-retirement'];
  var statuses2 = ['announced', 'construction', 'operating'];
  Object.keys(CONFIG.process_types).forEach(function(proci) {
    var count = 0;
    data.forEach(function(d) {
      // count matching processes, but only if the accompanying checkbox is checked
      // and its process is selected
      if ( d.properties.process == proci ) count += 1;

      // tally the "other" totals
      // if ( d.properties.process == proci && d.properties.id.indexOf('-') == -1 ) total1 += 1;
      // if ( d.properties.process == proci && d.properties.id.indexOf('-') > -1 && statuses1.indexOf(d.properties.status) > -1 ) total2 += 1;
      // if ( d.properties.process == proci && d.properties.id.indexOf('-') > -1 && statuses2.indexOf(d.properties.status) > -1 ) total3 += 1;
      if ( d.properties.process == proci && d.properties.plant_phase == 'Main plant' ) total1 += 1;
      if ( d.properties.process == proci && d.properties.plant_phase == 'Closure' ) total2 += 1;
      if ( d.properties.process == proci && d.properties.plant_phase == 'Expansion' ) total3 += 1;
    });
    // format label for type(s) and add to results
    // show a count for all types, whether 0 or >0
    var label = CONFIG.process_types[proci].text;
    var html = `${label}<span>${count}</span>`;
    let div = $('<div>', {html: html}).appendTo(results);
    if (count == 0) div.addClass('zerocount');
  });

  // update the total counts, which now consists of three rows
  // get the target div
  var totalrow = $('div#country-results div#total-count').empty();
  
  // add the top level total
  var totaltext1 = total1 > 0 ? (total1 > 1 ? `${total1} ${CONFIG.fossil_name}s` : `${data.length} ${CONFIG.fossil_name}`) : 'Nothing found';
  $('<div>',{text: totaltext1}).appendTo(totalrow);

  // add the "other" totals
  var totaltext2 = total2 > 0 ? (total2 > 1 ? `${total2} ${CONFIG.fossil_name2}s` : `${total2} ${CONFIG.fossil_name2}`) : '';
  $('<div>',{text: totaltext2}).appendTo(totalrow);
  var totaltext3 = total3 > 0 ? (total3 > 1 ? `${total3} ${CONFIG.fossil_name3}s` : `${total3} ${CONFIG.fossil_name3}`) : '';
  $('<div>',{text: totaltext3}).appendTo(totalrow);

  // add the "zoom to" button
  if (DATA.filtered && data.length) {
    $('<div id="zoom-filtered"><a class="zoomto">zoom to results</a></div>').appendTo(totalrow);
  }
}

// invoked by clicking "zoom to results" on zoom panel
function zoomToResults() {
  // not much to it: 
  if (DATA.filtered.length) {
    let bounds = L.geoJSON(DATA.filtered).getBounds();
    CONFIG.map.fitBounds(bounds);
  }
}

// draw or update the table on the "Table" tab
function drawTable(trackers, title) {
  // update the table name, if provided
  var text = title ? title : CONFIG.default_title;
  $('div#table h3 span').text(text);

  // set up the table columns: this is the subset of table column names we want to use in the table
  const columns = $.map(CONFIG.attributes, function(value){ if (value.table) return value; });
  // set up table names. These are the formatted column names for the table
  const names = [];
  Object.keys(CONFIG.attributes).forEach(function(d) {
    if (CONFIG.attributes[d].table) names.push(d);
  });
  
  // put table column names into format we need for DataTables
  const colnames = [];
  columns.forEach(function(d) {
    // set up an empty object and push defs to it for each column title
    var obj = {};
    obj['title'] = d.name;
    obj['className'] = d.classname;
    colnames.push(obj);
  });
  
  // set up the table data
  var data = [];
  trackers.forEach(function(tracker) {
    if (! tracker.properties.project) return; // no project name = bad data, bail
    // get the properties for each feature
    var properties = tracker.properties;
    // make up a row entry for the table: a list of column values.
    // and copy over all columns from [names] as is to this row
    var row = [];
    names.forEach(function(name) {
      // if it has a value, lookup the value on properties, and format it 
      let value = properties[name];
      if (value === undefined || value == '' ) {
        value = 'n/a';
        console.log("Object is undefined for");
        console.log(name);
      } else {
        value = CONFIG.format[CONFIG.attributes[name].format](value);
        // custom handlers for certain types: get the formatted string, format as a link, etc.
        if (name == 'project')   value = '<a href="' + tracker.properties['url'] + '" target="_blank" title="click to open the Wiki page for this project">' + tracker.properties.project + '</a>';
        if (name == 'process')   value = CONFIG.process_types[value].text;
        if (name == 'status')    value = CONFIG.status_types[value].text;
        
      }

      // all set, push this to the row
      row.push(value);
    });

    // and all set with the row, push the row to the data array
    data.push(row);
  });

  // get the table target from the dom
  var tableElement = $('#table-content table');
  // purge and reinitialize the DataTable instance
  // first time initialization
  if (!CONFIG.table) {
    CONFIG.table = tableElement.DataTable({
      data           : data,
      // include the id in the data, but not searchable, nor displayed
      // columnDefs     : [{targets:[0], visible: false, searchable: false}],
      columns        : colnames,
      autoWidth      : true,
      scrollY        : "1px", // initial value only, will be resized by calling resizeTable;
      scrollX        : true,
      lengthMenu     : [50, 100, 500],
      iDisplayLength : 500, // 100 has a noticable lag to it when displaying and filtering; 10 is fastest
      dom            : 'litp',
      initComplete   : function() {
        let attrs = Object.keys(CONFIG.attributes);
        attrs.forEach(function(a) {
          if (! CONFIG.attributes[a].hasOwnProperty('tooltip')) return;
          let classname = CONFIG.attributes[a].classname;
          let tooltip = CONFIG.attributes[a]['tooltip'];
          let th = $(`#table-content table th.${classname}`);
          $('<span>', {
            'class': 'info',
            'data-tippy-content': tooltip,
          }).appendTo(th);
        })
      }
    });

  // every subsequent redraw with new data: we don't need to reinitialize, just clear and update rows
  } else {
    CONFIG.table.clear();
    CONFIG.table.rows.add(data);
    CONFIG.table.search('').draw();
  }

  // add tippy content to col names where indicated in CONFIG.attributes
  Object.keys(CONFIG.attributes).forEach(function(d) {
    if (! CONFIG.attributes[d].hasOwnProperty('classname')) return; 
    let col = CONFIG.table.column(`${CONFIG.attributes[d].classname}:name`);
    let html = col.header().innerHTML;
    col.header().innerHTML = html += '<span data-tippy-content="something"></span>';
  });

  // finally, set the table title
  var text = typeof name == 'undefined' ? 'All records' : 'Records for ' + name;
  $('#table h2 span').text(text);
}

function searchMapForText(e) {
  e.preventDefault();
  // get the keywords to search
  var keywords = $('form.free-search input').val();
  // find data matching the keyword
  DATA.filtered = CONFIG.searchengine.search(keywords);
  // add to the results to map, table, legend
  drawMap(DATA.filtered);                           // update the map (and legend)
  updateResultsPanel(DATA.filtered, keywords)       // update the results-panel
  drawTable(DATA.filtered, keywords);               // populate the table
  $('form#nav-table-search input').val(keywords);   // sync the table search input with the keywords
  CONFIG.selected_country.layer.clearLayers();      // clear any selected country
  CONFIG.selected_country.name = '';                // ... and reset the name
  $('div#country-results').show();                  // show the results panel, in case hidden
  $('a.clear-search').show();                       // show the clear search links
  $('div.leaflet-control-layers-overlays input').prop('checked','checked'); // select everything in the legend
  updateStateParams();                              // update state params
  return false;
}

function searchTableForText(e) {
  // get the search text, and update the table name with it
  e.preventDefault();            
  // get the keywords to search
  var keywords = $('form#nav-table-search input').val();
  // update the table name, if provided
  if (keywords) $('div#table h3 span').text(keywords);

  // use DataTables built in search function to search the table with the typed value, and refresh
  CONFIG.table.search(keywords).draw();

  // recalc the map data from the resulting table data
  var data = CONFIG.table.rows({ filter : 'applied'} ).data();
  // pull out the ids to an array, and cast to number
  var ids = data.map(function(row) {return +row[0]});

  // update the map from matching ids
  DATA.filtered = [];
  DATA.fossil_data.features.forEach(function(d) {
    // cast this id to number as well, because indexOf faster on integers than string
    if (ids.indexOf(+d.properties.id) > -1) DATA.filtered.push(d);
  });
  drawMap(DATA.filtered);                               // update the map
  $('form.free-search input').val(keywords).submit();   // sync the map search input with the keywords
  CONFIG.selected_country.layer.clearLayers();          // clear any selected country
  updateResultsPanel(DATA.filtered, keywords);          // update the results panel
  $('a.clear-search').show();                           // show the clear search links
  $('div.leaflet-control-layers-overlays input').prop('checked','checked'); // select everything in the legend
  updateStateParams();                                  // update state params
}

// this callback is used when CONFIG.countries is loaded via GeoJSON; see initMap() for details
function massageCountryFeaturesAsTheyLoad(rawdata,feature) {
  // only register hover events for non-touch, non-mobile devices
  // including isMobile() || isIpad() here to include iPad and exclude "other" touch devices here, e.g. my laptop, which is touch, but not mobile
  if (! (isTouch() && ( isMobile() || isIpad() ))) {

    // on mouseover, highlight me; on mouseout quit highlighting
    feature.on('mouseover', function (e) {
      // keep a reference to the hovered featured feature
      // and unhighlight other countries that may already be highlighted
      var name = this.feature.properties['NAME'];
      if (name != CONFIG.hovered) CONFIG.countries.setStyle(CONFIG.country_no_style);
      CONFIG.hovered = name;
      // then highlight this country
      this.setStyle(CONFIG.country_hover_style);
    }).on('mouseout', function (e) {
      // on mouseout, remove the highlight, unless
      // we are entering one of our map features, i.e. a pipeline, or terminal
      // note: this isn't enough to trap everything, see mouseover() above
      if ( e.originalEvent.toElement && e.originalEvent.toElement.classList.contains('fossil-feature') ) return;
      CONFIG.hovered = '';
      this.setStyle(CONFIG.country_no_style);
    });
  }
  // always register a click event: on click, search and zoom to the selected country
  feature.on('click', function() { selectCountry(this.feature) });
}

// define what happens when we click a country
function selectCountry(feature) {
  // clear the search input
  $('form.free-search input').val('');
  // get the name of the clicked country, and keep a reference to it
  var name = feature.properties['NAME'];
  // if we've clicked an alredy-selected country again, clear the selection, reset the search
  if (CONFIG.selected_country.name == name) {
    CONFIG.selected_country.name = '';
    CONFIG.selected_country.layer.clearLayers();
    render();
  } else {
    CONFIG.selected_country.name = name;
    // highlight it on the map, first clearning any existing selection
    CONFIG.selected_country.layer.clearLayers();
    CONFIG.selected_country.layer.addData(feature);
    // call the search function
    let bounds = L.geoJSON(feature).getBounds();
    searchCountryByName(name, bounds);
  }

  // no matter what, clear DATA.filtered
  DATA.filtered = null;

  // update state params
  updateStateParams();
}

// on other applications, this has filtered the data to this country;
// here, we only zoom to the bounds of the country, and continue to show items outside of its boundaries
function searchCountryByName(countryname, bounds) {
  // get the data for this country, *only* for updating the results panel
  // the map and table, continue to show all data
  var data = [];
  DATA.fossil_data.features.forEach(function(feature) {
    // look for matching names in feature.properties.country
    // note that we use the country lookup to match the map name to the name in the data
    // also note the switch for China: use province name, not country name, to match the map data name
    let name_attribute = feature.properties.country == 'China' ? 'province' : 'country';
    if (feature.properties[name_attribute] == countryname) data.push(feature);
  });
  // if we don't have data, then we don't have a matching country name
  if (! data.length) return false;

  // if bounds were provided, zoom the map to the selected country
  // some countries require special/custom bounds calcs, because they straddle the dateline or are otherwise non-standard
  if (bounds) {
    switch (countryname) {
      case 'Russia':
        bounds = L.latLngBounds([38.35400, 24], [78.11962,178]);
        break;
      case 'United States':
        bounds = L.latLngBounds([18.3, -172.6], [71.7,-67.4]);
        break;
      case 'Canada':
        bounds = L.latLngBounds([41.6, -141.0], [81.7,-52.6]);
        break;
      default: break;
    }
    // got bounds, fit the map to it
    setTimeout(function() {
      CONFIG.map.fitBounds(bounds);  
    }, 0);
    
  } // has bounds

  // because we are not filtering the map, but only changing the bounds
  // results on the map can easily get out of sync due to a previous search filter
  // so first we need to explicity render() the map with all data, but not the table or results
  // THEN the table, with all data, but not with this countryname
  // THEN update results panel for *this* country data only
  // also odd about this approach: this is the only "search" which doesn't update the legend for what you've search for (a country)
  // instead, it shows everything in the legend (since everything IS on the map, but not in the results panel)
  $('div.leaflet-control-layers-overlays input').prop('checked','checked'); // select everything in the legend
  render({name: countryname, map: true, results: false, table: false});
  updateResultsPanel(data, countryname);
  drawTable(DATA.fossil_data.features);
  return true; // success
}

// craft a message for the results panel, depending on what's checked and what's not
function getResultsMessage() {
  let statuscount = $('div#status-types input').length;
  let statuschecked = $('div#status-types input:checked').length; 
  let typecount = $('div#process-types input').length;
  let typechecked = $('div#process-types input:checked').length; 

  let message = '';
  if (statuscount == statuschecked && typecount == typechecked) {
    message = CONFIG.default_title;
  } else if (statuscount != statuschecked && typecount != typechecked) {
    message = 'Filtered by process and status';
  } else if (statuscount == statuschecked && typecount != typechecked) {
    message = 'Filtered by process';
  } else if (statuscount != statuschecked && typecount == typechecked) {
    message = 'Filtered by status';
  }  
  return message;
}

// when user clicks on a coal plant point, customize a popup dialog and open it
function openTrackerInfoPanel(feature) {
  // get the features properties, i.e. the data to show on the modal
  var properties = feature.attributes;

  // get the popup object itself and customize
  var popup = $('#tracker-modal');
  
  // go through each property for this one feature, and write out the value to the correct span, according to data-name property
  Object.keys(CONFIG.attributes).forEach(function(name) {
    // if it has a value, lookup the value on properties, and format it 
    let value = properties[name];
    if (value === undefined || value == '' ) {
      value = 'n/a';
    } else {
      value = CONFIG.format[CONFIG.attributes[name].format](value);
      // custom handlers for status and type: get the formatted string
      if (name == 'status')     value = CONFIG.status_types[value].text;
      if (name == 'process')    value = CONFIG.process_types[value].text;
    }

    // write the property name to the dialog
    $('#tracker-modal .modal-content span').filter('[data-name="' + name + '"]').text(value);
  });

  // wiki page needs special handling to format as <a> link
  var wikilink = popup.find('a#wiki-link');
  if (properties['url']) {
    wikilink.attr('href', properties['url']);
    wikilink.show();
  } else {
    wikilink.hide();
  }

  // format the zoom-to button data.zoom attribute. See $('#btn-zoom').click();
  // this lets one zoom to the location of the clicked plant
  var zoomButton = $('#btn-zoom');
  zoomButton.attr('data-zoom', feature.coordinates[0] + "," + feature.coordinates[1]);

  // add the feature to the zoom button as well, for access by the back button
  // the desire is for the back button to open this same info-panel
  // because this is a full-blown Leaflet object with functions and such, use jQuery data() not the low-level HTML data attribute
  zoomButton.data().tracker = feature;

  // all set: open the dialog
  popup.modal();
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////
///// SHIMS AND UTILITIES: Various polyfills to add functionality
///////////////////////////////////////////////////////////////////////////////////////////////////////////
// trim() function
if(!String.prototype.trim) { String.prototype.trim = function () {return this.replace(/^\s+|\s+$/g,'');};}

// string Capitalize
String.prototype.capitalize = function() { return this.charAt(0).toUpperCase() + this.slice(1);}

// check if a div has a horizontal scrollbar
$.fn.hasHorizontalScrollBar = function() {return this.get(0).scrollWidth > this.get(0).clientWidth; }

// get an object's keys
Object.keys||(Object.keys=function(){"use strict";var t=Object.prototype.hasOwnProperty,r=!{toString:null}.propertyIsEnumerable("toString"),e=["toString","toLocaleString","valueOf","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","constructor"],o=e.length;return function(n){if("object"!=typeof n&&("function"!=typeof n||null===n))throw new TypeError("Object.keys called on non-object");var c,l,p=[];for(c in n)t.call(n,c)&&p.push(c);if(r)for(l=0;o>l;l++)t.call(n,e[l])&&p.push(e[l]);return p}}());

// get a string's Troper Case
String.prototype.toTitleCase=function(){var e,r,t,o,n;for(t=this.replace(/([^\W_]+[^\s-]*) */g,function(e){return e.charAt(0).toUpperCase()+e.substr(1).toLowerCase()}),o=["A","An","The","And","But","Or","For","Nor","As","At","By","For","From","In","Into","Near","Of","On","Onto","To","With"],e=0,r=o.length;r>e;e++)t=t.replace(new RegExp("\\s"+o[e]+"\\s","g"),function(e){return e.toLowerCase()});for(n=["Id","Tv"],e=0,r=n.length;r>e;e++)t=t.replace(new RegExp("\\b"+n[e]+"\\b","g"),n[e].toUpperCase());return t};

// function to indicate whether we are likely being viewed on a touch device
function isTouch() { return !!("ontouchstart" in window) || window.navigator.msMaxTouchPoints > 0; }

// function to detect if we are likely being view on iPad
function isIpad() { return (navigator.userAgent.match(/iPad/i)) && (navigator.userAgent.match(/iPad/i)!= null); }

// variable to show if we are are on a mobile or iPad client
var mobileDetect = new MobileDetect(window.navigator.userAgent);
function isMobile() { return mobileDetect.mobile(); }

// reduce arrays to unique items
const uniq = (a) => { return Array.from(new Set(a));}

// wait for a variable to exist. When it does, fire the given callback
function waitForIt(key, callback) {
  if (key) {
    callback();
  } else {
    setTimeout(function() {
      waitForIt(key, callback);
    }, 100);
  }
};
