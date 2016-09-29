/*
 * Visualization source
 */
define([
            'splunkjs/mvc',
            'splunkjs/mvc/utils',
            'splunkjs/mvc/tokenutils',
            'jquery',
            'underscore',
            'vizapi/SplunkVisualizationBase',
            'vizapi/SplunkVisualizationUtils',
            'leaflet'
        ],
        function(
            mvc,
            utils,
            TokenUtils,
            $,
            _,
            SplunkVisualizationBase,
            vizUtils,
            L
        ) {
  


    //TODO this can be deprecated
    //maybe add some CRUD overlay in the future
    var MAP_DETAILS = {
        url: '/en-US/static/@f2c836328108:0/app/homeautomation_viz/images/',
        basement_image: 'house-basement.png',
        basement_bounds: [[0,20],[20,40]],
        first_floor_bounds: [[0,0],[20,20]],
        first_floor_image: 'house-first-floor.png',
        total_bounds: [[0,0],[20,40]]
    }


    var service = mvc.createService({ owner: "nobody"});
    var layerGroup;
    var spaceData;
    var deviceData;
    var map;
    var hasGoodDom = false;

    // Extend from SplunkVisualizationBase
    return SplunkVisualizationBase.extend({
  
        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            this.$el = $(this.el);
            $(this.el).addClass("leaflet_map");
            hasGoodDom = false;

            console.log("homeautomation_viz initialize running");
            console.log("building space and device data in initialize");

            //these are built during init assuming that they already exist and are static when in use by the general viz.
            //the data update method will look for the CRUD marker.  if the CRUD marker is found, these variables
            //will be rebuilt during every data refresh instead of being static like is done here.
            service.get("storage/collections/data/spaces/",null,this.storeSpaces);
            service.get("storage/collections/data/devices/",null,this.storeDevices);

        },

        _getEscapedProperty: function(name, config) {
            var propertyValue = config[this.getPropertyNamespaceInfo().propertyNamespace + name];
            return vizUtils.escapeHtml(propertyValue);
        },


        _getConfigParams: function(config) {
            this.showTemps = +this._getEscapedProperty('showTemps', config) || true;
            this.showDoors = +this._getEscapedProperty('showDoors', config) || true;
            this.showLights = +this._getEscapedProperty('showLights', config) || true;
            this.showMotion = +this._getEscapedProperty('showMotion', config) || true;

            this.coldTemp = +this._getEscapedProperty('coldTemp', config) || 65;
            this.normalTemp = +this._getEscapedProperty('normalTemp', config) || 75;
            this.warmTemp = +this._getEscapedProperty('warmTemp', config) || 85;

            this.coldColor = +this._getEscapedProperty('colorColor', config) || '#00CCFF';
            this.normalColor = +this._getEscapedProperty('normalColor', config) || '#FFFFFF';
            this.warmColor = +this._getEscapedProperty('warmColor', config) || '#CCFF00';
            this.hotColor = +this._getEscapedProperty('hotColor', config) || '#FF0000';

            this.doorOpenColor = +this._getEscapedProperty('doorOpenColor', config) || '#ff6600';
            this.doorClosedColor = +this._getEscapedProperty('doorClosedColor', config) || '#00FF00';

            this.lightOnColor = +this._getEscapedProperty('lightOnColor', config) || '#ffff00';
            this.lightOffColor = +this._getEscapedProperty('lightOffColor', config) || '#000000';

            this.motionColor = +this._getEscapedProperty('motionColor', config) || '#ffff00';
            this.noMotionColor = +this._getEscapedProperty('noMotionColor', config) || '#000000';


        },

        // Optionally implement to format data returned from search. 
        // The returned object will be passed to updateView as 'data'
        formatData: function(data, config) {

            // Format data 

            return data;
        },

        storeSpaces: function(err, response) {
            spaceData = response.data;
        },

        storeDevices: function(err, response) {
            deviceData = response.data;
        },


        drawSpacesCRUD: function(err, response) {
            var spaceDataCRUD = response.data;
            spaceData = spaceDataCRUD;
            var spaceFeatureGroup = L.featureGroup();

            console.log("drawing spaces");
            console.log(spacesData);
            _.each(spacesData, function(space) {

                var spaceopts = {weight:1, stroke:true, color:"black", opacity:1, fillOpacity:1, fillColor:"#f0f0f0"};
                var coords = eval(space["coordinates"]);
                var coordSize = _.size(coords);
                var spaceObj;
                if(coordSize == 2) {
                    spaceObj = L.rectangle(coords, spaceopts);
                } else {
                    spaceObj = L.polygon(coords, spaceopts);
                }                
                spaceObj.addTo(spaceFeatureGroup);
            });
            layerGroup.addLayer(spaceFeatureGroup);

        },
        
  
        // Implement updateView to render a visualization.
        //  'data' will be the data object returned from formatData or from the search
        //  'config' will be the configuration property object
        updateView: function(data, config) {
            //var dataRows = data.rows; //this is used for ROW_MAJOR_OUTPUT_MODE
            var dataRows = data.results; //this is used for RAW_OUTPUT_MODE
            
            var that = this;
            var noRoom = eval("[[0,0],[0,0]]");

            if(!hasGoodDom) {
                console.log("Running new DOM creation");
                map = L.map(this.el, {crs: L.CRS.Simple, scrollWheelZoom: true});

                //TODO these can be deprecated in lieu of a big square grid maybe.
                L.imageOverlay(MAP_DETAILS.url+MAP_DETAILS.first_floor_image, MAP_DETAILS.first_floor_bounds).addTo(map);
                L.imageOverlay(MAP_DETAILS.url+MAP_DETAILS.basement_image, MAP_DETAILS.basement_bounds).addTo(map);
               
                //Changing to fitWorld
                //map.fitBounds(MAP_DETAILS.total_bounds);
                map.fitWorld();

                hasGoodDom = true;
                
                layerGroup = new L.LayerGroup().addTo(map);
                
                //Removing, hopefully map.fitWorld takes care of this
                //map.setZoom(4);
            }

            console.log("homeautomation_viz updateView running. ");
            
            


            layerGroup.clearLayers();


            var crudMode = _.find(dataRows, function(data) {
                return data["mode"];
            });
            if(crudMode == "deviceCRUD") {
                console.log("found CRUD mode = " + crudMode);
                service.get("storage/collections/data/spaces/",null,this.drawSpacesCRUD);
                service.get("storage/collections/data/devices/",null,this.drawDevicesCRUD);
                //draw rooms and devices
            } else if(crudMode = "spaceCRUD") {
                console.log("found CRUD mode = " + crudMode);
                service.get("storage/collections/data/spaces/",null,this.drawSpacesCRUD);
                //draw just rooms
            }



            //TODO  - include/exclude room/device drawings based on CRUD process.  Maybe don't want to see rooms if devices are being edited and vice versa
            

            //TODO  - see above. same shit.  CRUD for the drawing of devices will be room/position/maybe capability & type.  
            //will be useful to save the devices & rooms to a persistent variable so that we can reference during real search/data enum below
            //service.get("storage/collections/data/devices/", null, this.drawDevices);

            //TODO  - data enumeration will really just have the device name and the latest stats.  structures from above will dictate position, etc
            var infoDevices = _.filter(dataRows, function(origData) { return origData["deviceName"] != null });
            _.each(infoDevices, function(data) {
                //nadda
            }, this);

/*

            var infoDevices = _.filter(dataRows, function(origData) { return origData["deviceName"] != null });
            _.each(infoDevices, function(data) {
                var fg = L.featureGroup();
                var fgPopupText = "";

                var deviceName = data["deviceName"]; //smartThings field
                var contact = data["contact"]; //smartThings field
                var switchState = data["switch"]; //smartThings field
                var temperature = data["temperature"]; //smartThings field
                var switchLevel = data["switchlevel"]; //smartThings field
                var motion = data["motion"]; //smartThings field

                var roomshape = data["roomshape"]; //lookup field
                var roomcoords = eval(data["roomcoords"]);  //lookup field                             
                var devicecoords = eval(data["coords"]); //lookup field                                    
                var deviceshape = data["shape"]; //lookup field
                var deviceRoom = data["deviceroom"]; //lookup field
                var deviceType = data["type"]; //lookup field 


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
*/
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
