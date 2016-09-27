/*
 * Visualization source
 */
define([
            'jquery',
            'underscore',
            'vizapi/SplunkVisualizationBase',
            'vizapi/SplunkVisualizationUtils',
            'leaflet'
            // Add required assets to this list
        ],
        function(
            $,
            _,
            SplunkVisualizationBase,
            vizUtils,
            L
        ) {
  

    var MAP_DETAILS = {
        url: '/en-US/static/@f2c836328108:0/app/homeautomation_viz/images/',
        basement_image: 'house-basement.png',
        basement_bounds: [[0,20],[20,40]],
        first_floor_bounds: [[0,0],[20,20]],
        first_floor_image: 'house-first-floor.png',
        total_bounds: [[0,0],[20,40]]
    }

    // Extend from SplunkVisualizationBase
    return SplunkVisualizationBase.extend({
  
        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            this.$el = $(this.el);
            $(this.el).addClass("leaflet_map");
            this.hasGoodDom = false;
            //console.log("this.el");
            //console.log(this.el);
        },

        _getEscapedProperty: function(name, config) {
            var propertyValue = config[this.getPropertyNamespaceInfo().propertyNamespace + name];
            return vizUtils.escapeHtml(propertyValue);
        },


        _getConfigParams: function(config) {
            this.coldColor = +this._getEscapedProperty('colorColor', config) || '#00CCFF';
            this.coldTemp = +this._getEscapedProperty('coldTemp', config) || 65;
            this.normalColor = +this._getEscapedProperty('normalColor', config) || '#FFFFFF';
            this.normalTemp = +this._getEscapedProperty('normalTemp', config) || 75;
            this.warmColor = +this._getEscapedProperty('warmColor', config) || '#CCFF00';
            this.warmTemp = +this._getEscapedProperty('warmTemp', config) || 85;
            this.hotColor = +this._getEscapedProperty('hotColor', config) || '#FF0000';
            this.showTemps = +this._getEscapedProperty('showTemps', config) || true;
            this.showDoors = +this._getEscapedProperty('showDoors', config) || true;
            this.showLights = +this._getEscapedProperty('showLights', config) || true;
            this.doorOpenColor = +this._getEscapedProperty('doorOpenColor', config) || '#ff6600';
            this.doorClosedColor = +this._getEscapedProperty('doorClosedColor', config) || '#00FF00';
            this.lightOnColor = +this._getEscapedProperty('lightOnColor', config) || '#ffff00';
            this.lightOffColor = +this._getEscapedProperty('lightOffColor', config) || '#000000';

        },

        // Optionally implement to format data returned from search. 
        // The returned object will be passed to updateView as 'data'
        formatData: function(data, config) {

            // Format data 

            return data;
        },
  
        // Implement updateView to render a visualization.
        //  'data' will be the data object returned from formatData or from the search
        //  'config' will be the configuration property object
        updateView: function(data, config) {
            //var dataRows = data.rows; //this is used for ROW_MAJOR_OUTPUT_MODE
            var dataRows = data.results; //this is used for RAW_OUTPUT_MODE
            //        
            var that = this;
            var myMap = this.map;

            if(!this.hasGoodDom) {
                var map = this.map = L.map(this.el, {crs: L.CRS.Simple, scrollWheelZoom: true});
                L.imageOverlay(MAP_DETAILS.url+MAP_DETAILS.first_floor_image, MAP_DETAILS.first_floor_bounds).addTo(map);
                L.imageOverlay(MAP_DETAILS.url+MAP_DETAILS.basement_image, MAP_DETAILS.basement_bounds).addTo(map);
               
                map.fitBounds(MAP_DETAILS.total_bounds);
                this.hasGoodDom = true;
                this.map = map;
                console.log("create this.map variable - nz");
                this.layerGroup = new L.LayerGroup().addTo(map);
                map.setZoom(4);
                console.log("trying a new line here");
            }

            console.log("and another outputloing");

            var layerGroup = this.layerGroup;
            layerGroup.clearLayers();

            console.log("before data filter");

            var infoDevices = _.filter(dataRows, function(origData) { return origData["deviceName"] != null });
            _.each(infoDevices, function(data) {
                var fg = L.featureGroup();
                var fgPopupText = "";

                var deviceName = data["deviceName"]; //smartThings field
                var contact = data["contact"]; //smartThings field
                var switchState = data["switch"]; //smartThings field
                var temperature = data["temperature"]; //smartThings field
                var switchLevel = data["switchlevel"]; //smartThings field

                var roomshape = data["roomshape"]; //lookup field
                var roomcoords = eval(data["roomcoords"]);  //lookup field                             
                var coords = eval(data["coords"]); //lookup field                                    
                var shape = data["shape"]; //lookup field
                var deviceRoom = data["deviceroom"]; //lookup field
                //var deviceType = data["type"]; //lookup field - future use maybe


                console.log("main loop.. working with data");
                console.log("deviceroom: " + deviceRoom);
                roomcoords;
                var test = (roomcoords !== eval("[[0,0],[0,0]]"));
                console.log("test: " + test);

                //draw room
                if(roomcoords !== eval("[[0,0],[0,0]]")) { //
                    console.log("drawing room");
                    var roomColor = "#f5f5dc"; //default to beige in case "showtemps" is off.

                    console.log("show temps = " + this.showTemps);
                    if(this.showTemps || this.showTemps == "true") {
                        console.log("temperature = " + temperature);
                        roomColor = this.hotColor;
                        if(temperature <= this.warmTemp) { roomColor = this.warmColor; }
                        if(temperature <= this.normalTemp) { roomColor = this.normalColor; }
                        if(temperature <= this.coldTemp) { roomColor = this.coldColor; }
                    }


                    var roomopts = {weight:1, stroke:true, color:"black", opacity:1, fillOpacity:1, fillColor:roomColor};
                    var roomObj;
                    if(roomshape == "Rectangle") { roomObj = L.rectangle(roomcoords, roomopts); }
                    if(roomshape == "Polyline") { roomObj = L.polygon(roomcoords, roomopts); }
                    roomObj.addTo(fg);
                    fgPopupText = "<b>" + deviceRoom + "</b><br>Temperature: " + temperature;
                }

                //draw markers
                //doors
                if(this.showDoors || this.showDoors == "true") {
                    if(contact != null && contact != "") {
                        var markerColor = "#000000";
                        if(contact == "closed") { markerColor = this.doorClosedColor; }
                        if(contact == "open") { markerColor = this.doorOpenColor; }

                        var opts = {weight:1,stroke:true,color:"black", opacity:1, fillOpacity:1, fillColor:markerColor};
                        L.rectangle(coords, opts).addTo(fg);
                        fgPopupText = "<b>" + deviceName + "</b><br>State: " + contact;
                    }
                }

                //lights
                if(this.showLights || this.showLights == "true") {
                    if(switchState != null && switchState != "") {
                        var markerColor = "#000000";
                        if(switchState == "on") { markerColor = this.lightOnColor; }
                        if(switchState == "off") { markerColor = this.lightOffColor; }

                        var opts = {weight:1,stroke:true,color:"black", opacity:1, fillOpacity:1, fillColor:markerColor};
                        L.circle(coords, opts).addTo(fg);
                        fgPopupText = "<b>" + deviceName + "</b><br>State: " + switchState + "<br>Level: " + switchLevel;
                    }
                }
                fg.bindPopup(fgPopupText);
                layerGroup.addLayer(fg);
            },this);
        },

        // Search data params
        getInitialDataParams: function() {
            return ({
                //outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
                outputMode: SplunkVisualizationBase.RAW_OUTPUT_MODE,
                count: 10000
            });
        },

        // Override to respond to re-sizing events
        reflow: function() {
                    if (this.map) {
                        this.map.invalidateSize();
                    }
                }
    });
});
