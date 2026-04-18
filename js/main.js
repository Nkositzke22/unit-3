(function(){ // Entire script in one function, makes it modular

// Block 1- Global Variables
var attrArray = ["Avg_Temp_C", "Total_Precip_mm", "Veg_Index", "Burned_Area_m2", "Total_Pop"]; 
var expressed = attrArray[0]; // Sets the initial variable to be displayed when the page first loads


var displayNames = { //Maps CSV headers (incorrect, but the file was too big to change them to the variables that will show in the map)
    "Avg_Temp_C": "Avg Temp (F)",
    "Total_Precip_mm": "Daily Precip (in)",
    "Veg_Index": "NDVI (Veg Index)",
    "Burned_Area_m2": "Burned Area (%)",
    "Total_Pop": "Pop Density (sq mi)"
};

// Block 2- Initialization
window.onload = setMap; // Run the setMap function only after the HTML is fully loaded

function setMap(){ // Function to set everything up for the visualization
    var width = window.innerWidth * 0.5, // Sets the map width to exactly half of the user's browser window
        height = 500; // Sets a fixed height of 500 pixels for the map area


    createDropdown(); // Create the dropdown at the top of the map


    var container = d3.select("body") //Creates a container to hold the chart and map size by side (otherwise the labels appeared between them)
        .append("div")
        .attr("class", "vis-container")
        .style("display", "flex")
        .style("width", "100%")
        .style("align-items", "flex-start");

    var map = container.append("svg") // Creates the "map" variable and sets everything up for the data
        .attr("class", "map") // Assigns a class name to the SVG for styling
        .attr("width", width) // Sets SVG width
        .attr("height", height); // Sets SVG height

    var projection = d3.geoAlbersUsa() // Sets map projection
        .scale(width * 0.9) // Sets zoom (relative to screen width)
        .translate([width / 2, height / 2.0]); // Places the map within the SVG element

    var path = d3.geoPath() // Creates a tool that converts geographic coordinates into screen pixels
        .projection(projection); // Tells that tool which projection math to use for the conversion

    var promises = [ // Creates a list of "tasks" for the computer to perform
        d3.csv("data/us_climate_data.csv"), // Fetch the spreadsheet data
        d3.json("data/output.topojson") // Fetch the map geometry data
    ];    
    Promise.all(promises).then(callback); // Waits for both files to download completely before starting the callback

    function callback(data){ // Callback function runs once data is ready
        var csvData = data[0]; // Grabs the spreadsheet data from the first promise result
        var US_geom = data[1]; // Grabs the map geometry from the second promise result

        updateDropdown(csvData); //Update the dropdown with the processed data

        var states = topojson.feature(US_geom, US_geom.objects.ne_50m_admin_1_states_provinces_lakes).features; // Extracts the actual state shapes from the topojson file

        states = joinData(states, csvData); // Runs the function that joins spreadsheet data to the shapes
        var colorScale = makeColorScale(csvData); // Creates the color logic based on the data
        setEnumerationUnits(states, map, path, colorScale); // Physically draws the states on the map
        setChart(csvData, colorScale, container); // Physically draws the radar chart inside the flex container
    };
};

// Block 3- Data Processing
function joinData(states, csvData){ // Matches each row of the spreadsheet to its corresponding drawn statee shape
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

function makeColorScale(data){ // Calculates how to divide the data into 5 different color groups
    var colorClasses = ["#D4B9DA", "#C994C7", "#DF65B0", "#DD1C77", "#980043"]; 
    var colorScale = d3.scaleQuantile().range(colorClasses); 

    var domainArray = []; 
    for (var i=0; i<data.length; i++){ 
        var val = parseFloat(data[i][expressed]); 
        if(!isNaN(val)) domainArray.push(val); 
    };

    colorScale.domain(domainArray); 
    return colorScale; 
};

function getScaleValues(csvData) { // Finds the maximum value for every attribute to normalize the chart
    var maxValues = {}; 
    attrArray.forEach(function(attr) { 
        maxValues[attr] = d3.max(csvData, function(d) { return parseFloat(d[attr]) || 0.001; }); 
    });
    return maxValues; 
};

// Block 4- Rendering Visuals
function setEnumerationUnits(states, map, path, colorScale){ // Physically draws the state shapes on the screen
    var regions = map.selectAll(".regions") 
        .data(states.filter(function(d){ 
            return d.properties[expressed] !== undefined; 
        }))
        .enter() 
        .append("path") 
        .attr("class", function(d){ 
            return "regions " + d.properties.name.replace(/ /g, "_"); 
        })
        .attr("d", path) 
        .style("fill", function(d){ 
            var value = d.properties[expressed]; 
            return value ? colorScale(value) : "#ccc"; 
        })
        .on("mouseover", function(event, d){ highlight(d.properties); }) // Trigger highlight on hover
        .on("mouseout", function(event, d){ dehighlight(d.properties); }) // Trigger reset on mouse leave/unhover
        .on("mousemove", moveLabel); // Follow mouse with tooltip
};

function setChart(csvData, colorScale, container){ // Physically draws the radar chart on the right side
    var chartWidth = window.innerWidth * 0.425, 
        chartHeight = 500, 
        margin = {top: 70, right: 70, bottom: 70, left: 70}, 
        radius = Math.min(chartWidth, chartHeight) / 2 - margin.top; 

    var chart = container.append("svg") // Appends radar chart to the flex container (specifically, the right-hand SVG)
        .attr("width", chartWidth) 
        .attr("height", chartHeight) 
        .attr("class", "chart"); 

    chart.append("text") 
        .attr("x", chartWidth / 2) 
        .attr("y", 35) 
        .attr("class", "chartTitle") 
        .attr("text-anchor", "middle") 
        .text("Comparative Analysis of Environmental Variables by State"); //Title for the radar chart

    var g = chart.append("g") 
        .attr("transform", "translate(" + chartWidth / 2 + "," + (chartHeight / 2 + 40) + ")"); //Lost my comment notes for this middle section

    var angleSlice = Math.PI * 2 / attrArray.length; 

    var rScale = d3.scaleLinear() 
        .range([0, radius]) 
        .domain([0, 100]); 

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
        .attr("class", "axisLabel") 
        .style("font-size", "10px") 
        .attr("text-anchor", "middle") 
        .attr("x", (d, i) => rScale(125) * Math.cos(angleSlice * i - Math.PI / 2)) 
        .attr("y", (d, i) => rScale(125) * Math.sin(angleSlice * i - Math.PI / 2)) 
        .text(d => displayNames[d]);

    var maxValues = getScaleValues(csvData); 
    var radarLine = d3.lineRadial() 
        .radius(function(d) { return rScale((d.value / maxValues[d.axis]) * 100); }) 
        .angle(function(d, i) { return i * angleSlice; }); 

    g.selectAll(".stateLine") 
        .data(csvData).enter().append("path") 
        .attr("class", function(d){ return "stateLine " + d.State.replace(/ /g, "_"); }) 
        .attr("d", function(d) { 
            var lineData = attrArray.map(function(attr) { return { axis: attr, value: parseFloat(d[attr]) || 0 }; });
            return radarLine(lineData) + "z"; 
        })
        .style("fill", "none").style("stroke", "#980043").style("stroke-width", "0.5px").style("opacity", 0.2); 
};

// Block 5- Interaction
function createDropdown(){ // Creates the initial dropdown element
    d3.select("body") 
        .append("select") 
        .attr("class", "dropdown")
        .style("display", "block") 
        .style("margin", "10px auto"); 
};

function updateDropdown(csvData){ // Populates dropdown once data is ready
    var dropdown = d3.select(".dropdown")
        .on("change", function(){ changeAttribute(this.value, csvData); }); 

    dropdown.selectAll("options") 
        .data(attrArray).enter().append("option") 
        .attr("value", function(d){ return d; })
        .text(function(d){ return displayNames[d]; }); 
};

function changeAttribute(attribute, csvData){ // Updates map when the menu changes
    expressed = attribute; 
    var colorScale = makeColorScale(csvData); 
    d3.selectAll(".regions").transition().duration(1000) 
        .style("fill", function(d){ 
            var value = d.properties[expressed];
            return value ? colorScale(value) : "#ccc"; 
        });
};

function highlight(props){ // GEMINI: Visual feedback for hover
    var name = props.name.replace(/ /g, "_"); // GEMINI: Clean name for CSS selection
    d3.selectAll("." + name).style("stroke", "blue").style("stroke-width", "2"); // GEMINI: Highlight map border
    d3.selectAll(".stateLine." + name).style("opacity", 1).style("stroke-width", "3px"); // GEMINI: Make radar line pop
    setLabel(props); // GEMINI: Show data tooltip
};

function dehighlight(props){ // GEMINI: Reset visuals after hover
    var name = props.name.replace(/ /g, "_"); // GEMINI: Clean name for selection
    d3.selectAll("." + name).style("stroke", "#636363").style("stroke-width", "0.5"); // GEMINI: Reset map border
    d3.selectAll(".stateLine." + name).style("opacity", 0.2).style("stroke-width", "0.5px"); // GEMINI: Reset radar line
    d3.select(".infolabel").remove(); // GEMINI: Remove tooltip
};

function setLabel(props){ // GEMINI: Tooltip creation
    var val = parseFloat(props[expressed]).toFixed(2); // GEMINI: Format data
    var labelAttribute = "<h1>" + val + "</h1><b>" + displayNames[expressed] + "</b>"; // GEMINI: Uses display name
    var infolabel = d3.select("body").append("div").attr("class", "infolabel").html(labelAttribute); // GEMINI: Add label div
    infolabel.append("div").attr("class", "labelname").html(props.name); // GEMINI: Add state name to label
};

function moveLabel(){ // GEMINI: Tooltip positioning
    d3.select(".infolabel").style("left", (event.clientX + 10) + "px").style("top", (event.clientY - 75) + "px"); 
};

})(); // Entire script in one function, makes it modular