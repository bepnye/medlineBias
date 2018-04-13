// Data and color scale
var data = d3.map();

var countries;
var neighbors;
d3.json("https://albertcheu.github.io/scratch/bostock_topo.json",function(err,world){
  countries = topojson.feature(world, world.objects.countries).features,
  neighbors = topojson.neighbors(world.objects.countries.geometries);
});
 
function drawCountryData() {

    bottomSvg.selectAll('*').remove();
	
	var height = 600 - margin.top - margin.bottom;
	var width = document.getElementById("right_div").clientWidth*0.95;
	bottomSvg.attr('width', width);
	bottomSvg.attr('height', height);
	
    // Map and projection
    var path = d3.geoPath();
    var projection = d3.geoNaturalEarth()
        .scale(width / 2 / Math.PI)
        .translate([width / 2, height / 2])
    var path = d3.geoPath()
        .projection(projection);

    var g = bottomSvg.append("g")
        .attr("class", "legendThreshold")
        .attr("transform", "translate(20,20)");
    g.append("text")
        .attr("class", "caption")
        .attr("x", 0)
        .attr("y", -6)
        .text("Gender Bias");
    var labels = ['< -0.3', '-0.3 ~ -0.2', '-0.2 ~ -0.1','-0.1 ~ 0.1', '0.1 ~ 0.2','0.2 ~ 0.3', '> 0.3'];
    var legend = d3.legendColor()
        .labels(function (d) { return labels[d.i]; })
        .shapePadding(4)
        .scale(colorMap);
    bottomSvg.select(".legendThreshold")
        .call(legend);
        
    var projection = d3.geoKavrayskiy7()
    .scale(width / 5)
    .translate([width / 2, height / 2])
    .precision(.1);

    var path = d3.geoPath()
    .projection(projection);
     

    // Draw the map
      
      
    	bottomSvg.selectAll(".country")
      // the data(countries) bind the map data "countries" to the selected oject that have class".country" 
      .data(countries)
      // currently the slection is empty while the data isn't ,thus there is a mismatch,
      // thus when you have more data than elements in your selection, then the functuion enter() will be called which is a placeholder, here the actual function that will called is insert()
      //it insert the path element of html, which is what you see in the brower
    .enter().insert("path", ".graticule")
    // the class country is the one showing up in the css part's which declaring the stype, 
      .attr("class", "country")
      // 
      .attr("d", path)
      //this part is for generating the colors for each countries accordingly and I don't undertand this part and thus I don't know how to generated colors for different countries accordingly based on the values I am going to input
      
   .style("fill", function(d, i) { 
     if (countryData.has(d.id)) {
       return colorMap(countryData.get(d.id).bias);
     } else {
       return 'grey';
     }
   })
   .on('mouseenter', function(d) {
     if (countryData.has(d.id)) {
        showCountryTooltip(d.id, d3.event.pageX+15, d3.event.pageY-25);
     }
   })
   .on('mouseout', function(d) { hideCountryTooltip(); }) 
   .on('dblclick', function(d) {
     if (countryData.has(d.id)) {
        selectedCountry = d.id;
        updateSelectedArticles(countryData.get(d.id).pmids);
     }
     });
}
