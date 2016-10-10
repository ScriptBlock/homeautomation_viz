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

    //attempting data load with deferred objects
    var spaceDataDeferred = $.Deferred();
    var deviceDataDeferred = $.Deferred();


    var service = mvc.createService({ owner: "nobody"});
    var layerGroup;
    var spaceData = undefined;
    var deviceData = undefined;
    var map;
    var hasGoodDom = false;
    var props = {};
    var extendedClass;

    // Extend from SplunkVisualizationBase
    return SplunkVisualizationBase.extend({
        

        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            this.$el = $(this.el);
            $(this.el).addClass("leaflet_map");
            hasGoodDom = false;
            extendedClass = this;
            console.log("homeautomation_viz initialize running");
            console.log("building space and device data in initialize");

            //these are built during init assuming that they already exist and are static when in use by the general viz.
            //the data update method will look for the CRUD marker.  if the CRUD marker is found, these variables
            //will be rebuilt during every data refresh instead of being static like is done here.
            service.get("/servicesNS/nobody/homeautomation_viz/storage/collections/data/spaces/",null,this.storeSpaces);
            service.get("/servicesNS/nobody/homeautomation_viz/storage/collections/data/devices/",null,this.storeDevices);


        },

        _getEscapedProperty: function(name, config) {
            var propertyValue = config[this.getPropertyNamespaceInfo().propertyNamespace + name];
            return vizUtils.escapeHtml(propertyValue);
        },


        _getConfigParams: function(config) {
            console.log("updating config parameters");
            props["showTemps"] = eval(this._getEscapedProperty('showTemps', config));
            props["showDoors"] = eval(this._getEscapedProperty('showDoors', config));
            props["showLights"] = eval(this._getEscapedProperty('showLights', config));
            props["showMotion"] = eval(this._getEscapedProperty('showMotion', config));
            props["coldTemp"] = this._getEscapedProperty('coldTemp', config);
            props["normalTemp"] = this._getEscapedProperty('normalTemp', config);
            props["warmTemp"] = this._getEscapedProperty('warmTemp', config);
            props["coldColor"] = this._getEscapedProperty('coldColor', config);
            props["normalColor"] = this._getEscapedProperty('normalColor', config);
            props["warmColor"] = this._getEscapedProperty('warmColor', config);
            props["hotColor"] = this._getEscapedProperty('hotColor', config);
            props["doorOpenColor"] = this._getEscapedProperty('doorOpenColor', config);
            props["doorClosedColor"] = this._getEscapedProperty('doorClosedColor', config);
            props["lightOnColor"] = this._getEscapedProperty('lightOnColor', config);
            props["lightOffColor"] = this._getEscapedProperty('lightOffColor', config);
            props["motionColor"] = this._getEscapedProperty('motionColor', config);
            props["noMotionColor"] = this._getEscapedProperty('noMotionColor', config);
        },

        // Optionally implement to format data returned from search. 
        // The returned object will be passed to updateView as 'data'
        formatData: function(data, config) {

            // Format data 

            return data;
        },

        storeSpaces: function(err, response) {
            console.log("storespace is being called.  setting the spaceDataDeferred object to resolved");
            spaceData = response.data;
            spaceDataDeferred.resolve(spaceData);
        },

        storeDevices: function(err, response) {
            console.log("storeDevices is being called.  setting the deviceDataDeferred object to resolved");
            deviceData = response.data;
            deviceDataDeferred.resolve(deviceData);
        },


        drawSpacesCRUD: function(err, response) {
            var spaceDataCRUD = response.data;
            //spaceData = spaceDataCRUD;
            var spaceFeatureGroup = L.featureGroup();
            _.each(spaceDataCRUD, function(space) {
                var spaceopts = {weight:1, stroke:true, color:"black", opacity:1, fillOpacity:1, fillColor:"#8ff442"};
                var coords = eval(space["coordinates"]);
                var coordSize = _.size(coords);
                var spaceObj;
                if(coordSize == 2) {
                    spaceObj = L.rectangle(coords, spaceopts).addTo(spaceFeatureGroup);
                } else {
                    spaceObj = L.polygon(coords, spaceopts).addTo(spaceFeatureGroup);
                }             
                spaceObj.bringToFront();

                spaceObj.addTo(spaceFeatureGroup);
            });
            layerGroup.addLayer(spaceFeatureGroup);
            map.invalidateSize();
            

            //layerGroup.addTo(map);
        },

        drawSpacesProd: function() {
            var spaceFeatureGroup = L.featureGroup();
            _.each(spaceData, function(space) {
                var spaceopts = {weight:1, stroke:true, color:"black", opacity:1, fillOpacity:1, fillColor:"#8ff442"};
                var coords = eval(space["coordinates"]);
                var coordSize = _.size(coords);
                var spaceObj;

                if(props["showTemps"]) {

                    if(space["temperature"] == undefined || space["temperature"] == "undefined") {
                        spaceopts["fillColor"] = "#ffffff";
                    } else {
                        var roomColor = props["hotColor"];
                        var temperature = space["temperature"];
                        if(temperature <= props["warmTemp"]) { roomColor = props["warmColor"]; }
                        if(temperature <= props["normalTemp"]) { roomColor = props["normalColor"]; }
                        if(temperature <= props["coldTemp"]) { roomColor = props["coldColor"]; }
                        spaceopts["fillColor"] = roomColor;
                    }
                }


                
                if(coordSize == 2) {
                    spaceObj = L.rectangle(coords, spaceopts).addTo(spaceFeatureGroup);
                } else {
                    spaceObj = L.polygon(coords, spaceopts).addTo(spaceFeatureGroup);
                }             
                spaceObj.bringToFront();
                spaceObj.bindTooltip("<div style='width:250px; background-color: #ffffff; border-style:solid; border-width:2px; border-color:#000000'><b>" + space["spaceName"] + "</b><br/>Temperature: " + space["temperature"] + "</div>", {opacity:1});
                spaceObj.addTo(spaceFeatureGroup);
            });
            layerGroup.addLayer(spaceFeatureGroup);
            

            //layerGroup.addTo(map);
        },

        
        drawDevicesCRUD: function(err, response) {
            var deviceDataCRUD = response.data;
            //deviceData = deviceDataCRUD;
            var deviceFeatureGroup = L.featureGroup();

            _.each(deviceDataCRUD, function(device) {

                var deviceName = device["deviceName"];
                var spaceAssignment = device["spaceAssignment"];
                var coordinates = eval(device["coordinates"]);
                var deviceType = device["deviceType"];

                var deviceOpts = {weight:1, stroke:true, color:"black", opacity:1, fillOpacity:1, fillColor:"#424ef4"};
                var deviceObj = undefined;
                switch(deviceType) {
                    case "Light":
                        deviceOpts["fillColor"] = "#ededed";
                        break;
                    case "Contact":
                        deviceOpts["fillColor"] = "#b1bcbc";
                        break;
                    case "Motion":
                        deviceOpts["fillColor"] = "#0d0d0d";
                        break;
                    default:
                        console.log("There was no deviceType");
                        break;
                }

                if(_.size(coordinates) == 1) {
                    coordinates=coordinates[0];
                    deviceOpts["radius"] = 0.25;
                    deviceObj = L.circle(coordinates, deviceOpts);
                } else if(_.size(coordinates) == 2) {
                    deviceObj = L.rectangle(coordinates, deviceOpts);
                } else {
                    deviceObj = L.polygon(coordinates, deviceOpts);
                }
                
                if(deviceObj != undefined) { 
                    deviceObj.addTo(deviceFeatureGroup); 
                } else {
                    console.log("no device type to add");
                }
            });
            layerGroup.addLayer(deviceFeatureGroup);
            map.invalidateSize();

            

        },


        drawDevicesProd: function() {
            var deviceFeatureGroup = L.featureGroup();

            _.each(deviceData, function(device) {

                var deviceName = device["deviceName"];
                var spaceAssignment = device["spaceAssignment"];
                var coordinates = eval(device["coordinates"]);
                var deviceType = device["deviceType"];

                var deviceOpts = {weight:1, stroke:true, color:"black", opacity:1, fillOpacity:1, fillColor:"#424ef4"};
                var deviceObj = undefined;
                var markerColor = "#000000";
                var showDevice = false;
                //showDoors (contact), showLights (Light), showMotion (Motion)
                switch(deviceType) {
                    case "Contact":
                        if(eval(props["showDoors"])) {
                            showDevice = true;
                            if(device["contact"] == "closed") { deviceOpts["fillColor"] = props["doorClosedColor"]; }
                            if(device["contact"] == "open") { deviceOpts["fillColor"] = props["doorOpenColor"]; }
                        } else {
                            //console.log("showDoors is false");
                        }
                        break;

                    case "Light":
                        if(eval(props["showLights"])) {
                            showDevice = true;
                            if(device["switchState"] == "on" || device["switchState"] == "turningOn") { deviceOpts["fillColor"] = props["lightOnColor"]; }
                            if(device["switchState"] == "off" || device["switchState"] == "turningOff") { deviceOpts["fillColor"] = props["lightOffColor"]; }
                        }
                        break;

                    case "Motion":
                        if(eval(props["showMotion"])) {
                            showDevice = true;
                            if(device["motion"] == "active") { deviceOpts["fillColor"] = props["motionColor"] }
                            if(device["motion"] == "inactive") { deviceOpts["fillColor"] = props["noMotionColor"]; }
                        }
                        break;

                    default:
                        console.log("No valid device type found");

                }

                if(showDevice) {
                    var toolTipText = "<div style='width:250px; background-color: #ffffff; border-width:2px; border-style:solid; border-color:#000000'><b>Device Name: " + device["deviceName"] + "<br/>";
                    _.each(device, function(val,name) {
                        if(val != undefined && name != "deviceName" && name != "_key" && name != "coordinates" && name != "_user") {
                            toolTipText += name + ": " + val + "<br/>";
                        }
                    });
                    toolTipText += "</div>";

                    if(_.size(coordinates) == 1) {
                        coordinates=coordinates[0];
                        deviceOpts["radius"] = 0.25;
                        deviceObj = L.circle(coordinates, deviceOpts);
                    } else if(_.size(coordinates) == 2) {
                        deviceObj = L.rectangle(coordinates, deviceOpts);
                    } else {
                        deviceObj = L.polygon(coordinates, deviceOpts);
                    }
                    
                    if(deviceObj != undefined) { 
                        deviceObj.bindTooltip(toolTipText, {opacity:1});
                        deviceObj.addTo(deviceFeatureGroup); 
                    } else {
                        console.log("no device type to add");
                    }
                }
            });
            layerGroup.addLayer(deviceFeatureGroup);
            //map.invalidateSize();

            

        },

        // Implement updateView to render a visualization.
        //  'data' will be the data object returned from formatData or from the search
        //  'config' will be the configuration property object
        updateView: function(data, config) {




            this._getConfigParams(config);
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
                map.fitBounds(MAP_DETAILS.total_bounds);
                //map.fitWorld();

                hasGoodDom = true;
                
                layerGroup = new L.LayerGroup() //.addTo(map);
                map.addLayer(layerGroup);
                //Removing, hopefully map.fitWorld takes care of this
                map.setZoom(4);
            }

            console.log("homeautomation_viz updateView running. ");
            
            if(_.size(dataRows) > 0) {
                //we have some data to work with.  do this to avoid multiple lookups for no reason.

                layerGroup.clearLayers();

                if(_.size(dataRows) == 1 && dataRows[0]["mode"] != null) {
                    var crudMode = dataRows[0]["mode"]
                    if(crudMode == "deviceCRUD") {
                        console.log("found CRUD mode = " + crudMode);
                        service.get("storage/collections/data/spaces/",null,this.drawSpacesCRUD);
                        service.get("storage/collections/data/devices/",null,this.drawDevicesCRUD);
                        //draw rooms and devices    
                    } else {
                        console.log("found CRUD mode = " + crudMode);
                        service.get("storage/collections/data/spaces/",null,this.drawSpacesCRUD);
                    }
                } else {
                    var infoDevices = _.filter(dataRows, function(origData) { return origData["deviceName"] != null });
                    _.each(infoDevices, function(data) {
                        var deviceName = data["deviceName"]; //smartThings field
                        var contact = data["contact"]; //smartThings field
                        var switchState = data["switchstate"]; //smartThings field
                        var temperature = data["temperature"]; //smartThings field
                        var switchLevel = data["switchlevel"]; //smartThings field
                        var motion = data["motion"]; //smartThings field

                        _.each(deviceData, function(j) {
                            if(j["deviceName"] == deviceName) {
                                j["contact"] = contact;
                                j["switchState"] = switchState;
                                j["temperature"] = temperature;
                                j["switchLevel"] = switchLevel;
                                j["motion"] = motion;

                                _.each(spaceData, function(i) {  
                                    if(i["spaceName"] == j["spaceAssignment"]) { 
                                        if(temperature != undefined) {
                                            i["temperature"] = temperature; 
                                        } else {
                                            i["temperature"] = "undefined";
                                        }
                                    }  
                                }, this);
                            }
                        }, this);
                    }, this);
                    $.when(spaceDataDeferred, deviceDataDeferred).done(function draw() {
                        console.log("Deferred when method has been called - presumably because spacedata and devicedata are populated");
                        extendedClass.drawSpacesProd();
                        extendedClass.drawDevicesProd();
                    });
                }
            }
            map.invalidateSize();
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
