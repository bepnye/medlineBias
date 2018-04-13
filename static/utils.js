var margin = {top: 20, right: 20, bottom: 20, left: 20},
    width = 900 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;
	
var colorMap = d3.scaleSequential(d3.interpolateRdBu)
    .domain([-1, 1]);

var topSvg = d3.select("#left_div").append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("transform", "translate("
					+ margin.left + "," + margin.top + ")");

var bottomSvg = d3.select("#right_div").append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("transform", "translate("
					+ margin.left + "," + margin.top + ")");

var topTooltip = d3.select("body")
    .append("div")
    .attr("id", "tooltip1")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "white")
    .text("a simple tooltip");

var bottomTooltip = d3.select("body")
    .append("div")
    .attr("id", "tooltip2")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "white")
    .text("a simple tooltip");

var countryDict = {
	'ARGENTINA': 32,
	'AUSTRALIA': 36,
	'AUSTRIA': 40,
	'Argentina': 32,
	'Australia': 36,
	'Austria': 40,
	'BANGLADESH': 50,
	'BELGIUM': 56,
	'BOSNIA-HERZEGOVINA': 70,
	'BRAZIL': 76,
	'BULGARIA': 100,
	'Bangladesh': 50,
	'Belgium': 56,
	'Bosnia and Hercegovina': 70,
	'Brazil': 76,
	'Bulgaria': 100,
	'CANADA': 124,
	'CHILE': 152,
	'CHINA': 156,
	'CHINA (REPUBLIC : 1949- )': 156,
	'CHINA (REPUBLIC : 1949-)': 156,
	'CHINA (REPUBLIC: 1949- )': 156,
	'CROATIA': 191,
	'CUBA': 192,
	'CZECH REPUBLIC': 203,
	'CZECHOSLOVAKIA': 203,
	'Canada': 124,
	'Chile': 152,
	'China': 156,
	'China (Republic : 1949- )': 156,
	'China (Republic : 1949-)': 156,
	'China (Republic: 1949- )': 156,
	'Colombia': 170,
	'Croatia': 191,
	'Cuba': 192,
	'Czech Republic': 203,
	'DENMARK': 208,
	'Denmark': 208,
	'EGYPT': 818,
	'ENGLAND': 826,
	'ETHIOPIA': 231,
	'Egypt': 818,
	'England': 826,
	'Ethiopia': 231,
	'FINLAND': 246,
	'FRANCE': 250,
	'Finland': 246,
	'France': 250,
	'GERMANY': 276,
	'GERMANY, EAST': 276,
	'GERMANY, WEST': 276,
	'GREECE': 300,
	'Georgia (Republic)': 268,
	'Germany': 276,
	'Greece': 300,
	'HONG KONG': 344,
	'HUNGARY': 348,
	'Hungary': 348,
	'INDIA': 356,
	'INDONESIA': 360,
	'IRELAND': 372,
	'ISRAEL': 376,
	'ITAIY': 380,
	'ITALY': 380,
	'Iceland': 352,
	'India': 356,
	'Indonesia': 360,
	'International': 840,
	'Iran': 364,
	'Ireland': 372,
	'Israel': 376,
	'Italy': 380,
	'JAMAICA': 388,
	'JAPAN': 392,
	'Jamaica': 388,
	'Japan': 392,
	'KENYA': 404,
	'KOREA': 410,
	'KOREA (SOUTH)': 410,
	'Kenya': 404,
	'Korea (South)': 410,
	'Kuwait': 414,
	'LEBANON': 422,
	'Lebanon': 422,
	'Lithuania': 440,
	'MALAYSIA': 458,
	'MEXICO': 484,
	'Macedonia': 807,
	'Malawi': 454,
	'Malaysia': 458,
	'Mali': 466,
	'Mexico': 484,
	'NETHERLANDS': 528,
	'NEW ZEALAND': 554,
	'NIGERIA': 566,
	'NORTHERN IRELAND': 826,
	'NORWAY': 578,
	'Nepal': 524,
	'Netherlands': 528,
	'New Zealand': 554,
	'Nigeria': 566,
	'Northern Ireland': 826,
	'Norway': 578,
	'PAKISTAN': 586,
	'PANAMA': 591,
	'PAPUA NEW GUINEA': 598,
	'PERU': 604,
	'PHILIPPINES': 608,
	'POLAND': 616,
	'PORTUGAL': 620,
	'PUERTO RICO': 630,
	'Pakistan': 586,
	'Panama': 591,
	'Papua New Guinea': 598,
	'Peru': 604,
	'Poland': 616,
	'Portugal': 620,
	'Puerto Rico': 630,
	'ROMANIA': 642,
	'RUSSIA': 643,
	'Romania': 642,
	'Russia': 643,
	'Russia (Federation)': 643,
	'SCOTLAND': 826,
	'SENEGAL': 686,
	'SINGAPORE': 702,
	'SLOVAKIA': 703,
	'SOUTH AFRICA': 710,
	'SPAIN': 724,
	'SRI LANKA': 144,
	'SWEDEN': 752,
	'SWITZERLAND': 756,
	'Saudi Arabia': 682,
	'Scotland': 826,
	'Senegal': 686,
	'Serbia': 688,
	'Serbia and Montenegro': 688,
	'Singapore': 702,
	'Slovakia': 703,
	'Slovenia': 705,
	'South Africa': 710,
	'Spain': 724,
	'Sri Lanka': 144,
	'Sweden': 752,
	'Switzerland': 756,
	'TAIWAN': 158,
	'THAILAND': 764,
	'TUNISIA': 788,
	'TURKEY': 792,
	'Tanzania': 834,
	'Thailand': 764,
	'Tunisia': 788,
	'Turkey': 792,
	'UKRAINE': 804,
	'UNITED STATES': 840,
	'URUGUAY': 858,
	'USSR': 643,
	'Uganda': 800,
	'Ukraine': 804,
	'United Arab Emirates': 784,
	'United Kingdom': 826,
	'United States': 840,
	'Unknown': 840,
	'VENEZUELA': 862,
	'Venezuela': 862,
	'Wales': 826,
	'YUGOSLAVIA': 688,
	'Yugoslavia': 688,
	'ZAMBIA': 894,
	'ZIMBABWE': 716,
	'Zimbabwe': 716,
}
