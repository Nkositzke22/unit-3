// execute script when window is loaded
window.onload = function(){ //Run the script after the page has loaded the HTML
    var w = 900, h = 500;   //Define my global variables here, so that I can change them easily later

    var container = d3.select("body")   //Create the SVG element inside the <body> tag
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "container")
        .style("background-color", "rgba(0,0,0,0.2)");

    var innerRect = container.append("rect")    //Append a rectangle to the SVG
        .datum(400) //Bind the datum (400) to the rectangle
        .attr("width", function(d){ 
            return d * 2; //Returns 800
        })
        .attr("height", function(d){ 
            return d;     //Returns 400
        })
        .attr("class", "innerRect") //Set attributes for the rectangle
        .attr("x", 50) 
        .attr("y", 50) 
        .style("fill", "#FFFFFF");

    var cityPop = [ //Week 2 city pop data array (grabbed from 2.7)
        { 
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];

    var x = d3.scaleLinear()    //X scale for horizontal placement
        .range([90, 750])   //Adjusted max range to keep Superior's label in frame
        .domain([0, 3]);

    var y = d3.scaleLinear()        //Y scale for vertical placement (Example 3.11)
        .range([450, 50])
        .domain([0, 700000]);

    var circles = container.selectAll(".circles")   //Use the cityPop array to create circles
        .data(cityPop)
        .enter()
        .append("circle")
        .attr("class", "circles")
        .attr("id", function(d){
            return d.city;
        })
        .attr("r", function(d){ //Calculate the radius based on population value as circle area
            var area = d.population * 0.01; 
            return Math.sqrt(area/Math.PI);
        })
        .attr("cx", function(d, i){ //Use the x scale to place each circle horizontally
            return x(i);
        })
        .attr("cy", function(d){    //Use the y scale to position circles
            return y(d.population);
        })
        .style("fill", "steelblue") //Style for visibility
        .style("stroke", "#000");

    var yAxis = d3.axisLeft(y); //Create y axis generator

    var axis = container.append("g")    //Create axis g element and add axis
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);

    var title = container.append("text")    //Create a text element and add the title (Example 3.12)
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("City Populations");

    var labels = container.selectAll(".labels") //Create circle labels
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){
            return y(d.population);
        });

    var nameLine = labels.append("tspan")   //First line of label: City Name
        .attr("class", "nameLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .text(function(d){
            return d.city;
        });

    var format = d3.format(",");    //Create format generator for population numbers

    var popLine = labels.append("tspan")    //Second line of label: Population
        .attr("class", "popLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15")   //Vertical offset for second line
        .text(function(d){
            return "Pop. " + format(d.population);  //Use format generator
        });
};