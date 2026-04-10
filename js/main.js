(function(){    // Self-executing anonymous wrapper function

// Create pseudo-global variables
var attrArray = ["Avg_Temp_C", "Burned_Area_m2", "Total_Pop", "Total_Precip_mm", "Veg_Index"];
var expressed = attrArray[0];

// Begin script when window loads
window.onload = setMap;

// Set up choropleth map
function setMap(){
    // Adjust map width to be responsive (50% of window)
    var width = window.innerWidth * 0.5,
        height = 500;

    // Create the SVG container
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // Create the Projection (Optimized for USA)
    var projection = d3.geoAlbersUsa()
        .scale(width * 1.1) // Adjust scale based on responsive width parameters
        .translate([width / 2, height / 2]);

    // Create the Path Generator
    var path = d3.geoPath()
        .projection(projection);

    // Use promise to parallelize asynchronous data loading
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

        // Join csv data to GeoJSON enumeration units
        states = joinData(states, csvData);

        // Create color scale based on the CSV attributes
        var colorScale = makeColorScale(csvData);

        // Add enumeration units to the map
        setEnumerationUnits(states, map, path, colorScale);

        // Add the radar chart to the dashboard
        setChart(csvData, colorScale);
    };
};

// Transfer attributes from CSV to GeoJSON
function joinData(states, csvData){
    for (var i = 0; i < csvData.length; i++) {
        var csvRegion = csvData[i]; 
        var csvKey = csvRegion.State; 

        for (var a = 0; a < states.length; a++) {
            var geojsonProps = states[a].properties; 
            var geojsonKey = geojsonProps.name; 

            if (geojsonKey === csvKey) {
                attrArray.forEach(function(attr) {
                    var val = parseFloat(csvRegion[attr]); 
                    geojsonProps[attr] = val; 
                });
            }
        }
    }
    return states;
};

// Create color scale generator (QUANTILE)
function makeColorScale(data){
    var colorClasses = ["#D4B9DA", "#C994C7", "#DF65B0", "#DD1C77", "#980043"];
    var colorScale = d3.scaleQuantile().range(colorClasses);

    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    colorScale.domain(domainArray);
    return colorScale;
};

// Add enumeration units to the map and color them
function setEnumerationUnits(states, map, path, colorScale){
    var regions = map.selectAll(".regions")
        .data(states)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.name;
        })
        .attr("d", path)
        .style("fill", function(d){            
            var value = d.properties[expressed];            
            if(value) {                
                return colorScale(value);            
            } else {                
                return "#ccc";            
            }    
        });
};

// Create a radar chart to visualize data
function setChart(csvData, colorScale){
    // Set responsive dimensions for the chart (42.5% of window)
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 500,
        margin = {top: 50, right: 50, bottom: 50, left: 50},
        radius = Math.min(chartWidth, chartHeight) / 2 - margin.top;

    // Create the SVG container
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    // Append chart title to the SVG
    chart.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", 35) 
        .attr("class", "chartTitle")
        .attr("text-anchor", "middle")
        .text("Comparative Analysis of Environmental Variables by State");

    // Center the radar under the title
    var g = chart.append("g")
        .attr("transform", "translate(" + chartWidth / 2 + "," + (chartHeight / 2 + 40) + ")");

    // Calculate angles for each attribute "spoke" on the chart
    var angleSlice = Math.PI * 2 / attrArray.length;

    // Set scale for the radius (0 to 100%)
    var rScale = d3.scaleLinear()
        .range([0, radius])
        .domain([0, 100]);

    // Create circular grid for the chart
    var gridLevels = 5;
    for (var j=0; j < gridLevels; j++){
        var levelFactor = radius * ((j + 1) / gridLevels);
        g.append("circle")
            .attr("r", levelFactor)
            .attr("class", "gridLine")
            .style("fill", "none")
            .style("stroke", "#999")
            .style("stroke-dasharray", "2,2");
    }

    // Draw the axis spokes and labels
    var axis = g.selectAll(".axis")
        .data(attrArray)
        .enter()
        .append("g")
        .attr("class", "axis");

    axis.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", (d, i) => rScale(100) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y2", (d, i) => rScale(100) * Math.sin(angleSlice * i - Math.PI / 2))
        .style("stroke", "#999")
        .style("stroke-width", "1px");

    axis.append("text")
        // Set a specific class for spoke labels to avoid CSS conflicts with the main title
        .attr("class", "axisLabel")
        .style("font-size", "10px")
        .attr("text-anchor", "middle")
        .attr("x", (d, i) => rScale(115) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y", (d, i) => rScale(115) * Math.sin(angleSlice * i - Math.PI / 2))
        .text(d => d);
} 

})(); // End of function