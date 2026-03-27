//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    // 1. Set dimensions
    var width = 960,
        height = 500;

    // 2. Create the SVG container
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // 3. Create the Projection (Optimized for USA)
    var projection = d3.geoAlbersUsa()
        .scale(1100) 
        .translate([width / 2, height / 2]);

    // 4. Create the Path Generator
    var path = d3.geoPath()
        .projection(projection);

    // Use Promise.all to parallelize asynchronous data loading
    var promises = [
        d3.csv("data/us_climate_data.csv"),                    
        d3.json("data/output.topojson")                                            
    ];    
    Promise.all(promises).then(callback);

    function callback(data){
        var csvData = data[0];
        var US_geom = data[1];

        // Translate TopoJSON to GeoJSON array of features
        var states = topojson.feature(US_geom, US_geom.objects.ne_10m_admin_1_states_provinces).features;

        // 5. Add US states to map
        var regions = map.selectAll(".regions")
            .data(states)
            .enter()
            .append("path")
            .attr("class", function(d){
                // This gives every path the 'regions' class and a unique name based on the state
                return "regions " + d.properties.name;
            })
            .attr("d", path); // This uses the path generator to draw the lines

        console.log("CSV Data loaded:", csvData);
        console.log("GeoJSON features ready:", states);
    };
};
