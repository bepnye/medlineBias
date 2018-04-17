var meshLookup = new Map();
var articleLookup = new Map();
var meshNameToUid = new Map();

_meshData.forEach(function(m) {
  m.children = m.children.filter(function(c) { return c != ""; });
  m.treeTypes = new Set();
  m.treepos.forEach(function(t) { m.treeTypes.add(t[0]); });
  meshLookup.set(m.uid, m);
  meshNameToUid.set(m.name, m.uid);
});
_articleData.forEach(function(a) {
  a.mesh = a.mesh.filter(function (m) { return m != ""; });
	articleLookup.set(a.pmid, a);
});
_meshToArticles.forEach(function(d) {
  meshLookup.get(d.uid).pmids = d.pmids.filter(function (p) { return p != ""; });
  //meshLookup.get(d.uid).selectedPmids = meshLookup.get(d.uid).pmids;
  //meshLookup.get(d.uid).bias = 0.0;
});

console.log(meshLookup);
console.log(articleLookup);

var allMesh = Array.from(meshLookup.keys()).filter(function(m) { return meshLookup.get(m).treeTypes.has('C'); });
var allArticles = Array.from(articleLookup.keys());

var rootMesh = null;
var selectedMesh = allMesh.slice();
var selectedArticles = allArticles.slice();
var selectedCountry = null;

var topPlot;
var bottomPlot;
// Unique ids for checking which plot is active
var TREE_PLOT = 0;
var LIST_PLOT = 1;
var TIME_PLOT = 2;
var MAP_PLOT = 4;

var treeData;
var meshData;
var yearData;
var countryData;

var filters = [];

function getSubtreeMesh(root) {
  var queue = [root];
  // Get ids for all the subtree mesh terms
  var subMesh = new Set();
  while (queue.length > 0) {
    var m = queue.shift();
    subMesh.add(m);
    meshLookup.get(m).children.forEach(function(c) {
      if (meshLookup.has(c)) {
        queue.push(meshLookup.get(c).uid);
      }
    });
  }
  return Array.from(subMesh);
}

_meshData.forEach(function(m) {
  mesh = meshLookup.get(m.uid);
  mesh.subs = getSubtreeMesh(m.uid);
  mesh.subPmids = mesh.pmids.slice();
  mesh.subs.forEach(function(d) {
    meshLookup.get(d).pmids.forEach(function(p) {
      mesh.subPmids.push(p);
    });
  });
  mesh.subPmids = Array.from(new Set(mesh.subPmids));
});

function getBiasFromLabels(labels) {
  if (labels.length == 0) { return 0.0; }
	var nF = 0.0;
	var nM = 0.0;
	labels.forEach(function(l) {
    switch (l) {
      case 'M': nM += 1.0; break;
      case 'F': nF += 1.0; break;
      case 'X': nM += 0.5;
                nF += 0.5; break;
      default: ; break;
    }
	});
  if (nF == 0.0) { return (-2.3); }
  if (nM == 0.0) { return (2.3); }
  return Math.log(nM/nF);
}

function getBiasFromPmids(pmids) {
  var labels = [];
  pmids.forEach(function(pmid) {
    try {
      labels.push(articleLookup.get(pmid).label);
    } catch (err) {
      console.log('no data for', pmid);
    }
  });
  return getBiasFromLabels(labels);
}

function updateMeshBias() {
  console.log('Updating mesh bias...');
  var curArticles = new Set(selectedArticles);
  meshLookup.forEach(function(m, ui, map) {
    var pmids = m.subPmids.filter(function(pmid) { return curArticles.has(pmid); });
    m.selectedPmids = pmids;
    m.bias = getBiasFromPmids(pmids);
  });
  console.log('done!');
};

function computeYearData() {
  console.log('Computing year data...');
  var yearData = new Map();
  selectedArticles.forEach(function(a) {
    var article = articleLookup.get(a);
    var y = article.date;
    if (!yearData.has(y)) {
      yearData.set(y, { 'pmids': [], 'year': y });
    }
    yearData.get(y).pmids.push(article.pmid);
  });
  var years = Array.from(yearData.keys());
  years.forEach(function(y) {
    yearData.get(y).bias = getBiasFromPmids(yearData.get(y).pmids);
  });
  var yi = d3.min(years);
  var yf = d3.max(years);
  console.log('done!');
  return Array.from(yearData.values());
}

function computeCountryData() {
  console.log('Computing country data...');
	var countryData = new Map();
  selectedArticles.forEach(function(a) {
    var article = articleLookup.get(a);
    var c = countryDict[article.country];
    if (!countryData.has(c)) {
      countryData.set(c, { 'pmids': [], 'names': new Set() });
    }
    countryData.get(c).pmids.push(article.pmid);
    countryData.get(c).names.add(article.country);
  });
  Array.from(countryData.keys()).forEach(function(c) {
    countryData.get(c).bias = getBiasFromPmids(countryData.get(c).pmids);
  });
  console.log('done!');
  return countryData;
}

function computeMeshData() {
  console.log('Computing mesh data...');
  var meshData = [];
  selectedMesh.forEach(function(m) {
    meshData.push(meshLookup.get(m));
  });
  console.log('done!');
  return meshData;
}

function computeAllData() {
  updateMeshBias();
  treeData = computeTreeData();
  console.log(treeData);
  meshData = computeMeshData();
  console.log(meshData);
  yearData = computeYearData();
  console.log(yearData);
  countryData = computeCountryData();
  console.log(countryData);
}

function updateSelectedMesh(newSelectedMesh) {
  selectedMesh = newSelectedMesh;
  // Update the articles to include only the ones with relevant mesh terms
  newSelectedArticles = new Set();
  selectedMesh.forEach(function(m) {
    meshLookup.get(m).pmids.forEach(function(p) {
      if (p != "") {
        if (!selectedCountry || countryDict[articleLookup.get(p).country] == selectedCountry) {
          newSelectedArticles.add(p);
        }
      }
    });
  });
  updateSelectedArticles(Array.from(newSelectedArticles));
}

function updateSelectedArticles(newSelectedArticles) {
  console.log(selectedArticles);
  selectedArticles = newSelectedArticles;
  console.log(selectedArticles);
  computeAllData();
  refreshPlots();
}

function setRootMesh() {
  var meshName = document.getElementById("meshNode").value;
  if (!meshNameToUid.has(meshName)) {
    alert('No matching mesh found ('+meshName+')');
  } else {
    // Look up the id for the new mesh name
    rootMesh = meshNameToUid.get(meshName);
    // Get ids for all the subtree mesh terms
    updateSelectedMesh(getSubtreeMesh(rootMesh));
  }
}

function selectCountries(countryId) {
  filters.push({'name': 'Country = '+countryId, 'fn': function(a) { return true; } });
  selectedCountry = d.id;
  updateSelectedArticles(countryData.get(d.id).pmids);
}

function refreshPlots() {
  if (topPlot == TREE_PLOT) {
    drawTree();
  } else {
    drawList();
  }
  if (bottomPlot == TIME_PLOT) {
    drawTime();
  } else {
    drawMap();
  }
  drawToolbar();
}

function resetData() {
  rootMesh = null;
  selectedCountry = null;
  selectedMesh = allMesh;
  selectedArticles = allArticles;
  document.getElementById("meshNode").value = "";
  computeAllData();
  hideDiseaseTooltip();
  refreshPlots();
}

function resetCountry() {
  selectedCountry = null;
}

function drawTree() {
  topPlot = TREE_PLOT;
  document.getElementById("treeButton").checked = true;
  drawTreeData();
}
function drawList() {
  topPlot = LIST_PLOT;
  document.getElementById("listButton").checked = true;
  drawMeshData();
}
function drawTime() {
  bottomPlot = TIME_PLOT;
  document.getElementById("timeButton").checked = true;
  drawYearData();
}
function drawMap() {
  bottomPlot = MAP_PLOT;
  document.getElementById("mapButton").checked = true;
  drawCountryData();
}

function showDiseaseTooltip(mesh, x, y) {
  if (meshLookup.has(mesh)) {
    var m = meshLookup.get(mesh);
    d3.select("#tooltip1")
      .style("visibility", "visible")
      .html(m.name+'<br>'+
            '# articles: '+m.selectedPmids.length+'<br>'+
            'subtree size: '+m.subs.length)
      .style("left", x + "px")
      .style("top", y + "px");
  }
  else {
    console.log('no tooltip for', mesh);
  }
}

function hideDiseaseTooltip() {
  d3.select("#tooltip1")
    .style("visibility", "hidden");
}

function showCountryTooltip(country, x, y) {
  if (countryData.has(country)) {
    var c = countryData.get(country);
    var name = '';
    c.names.forEach(function(n, n, set) { name += n +', '; });
    d3.select("#tooltip2")
      .style("visibility", "visible")
      .html(name+'<br>'+'# articles: '+c.pmids.length)
      .style("left", x + "px")
      .style("top", y + "px");
  }
  else {
    console.log('no tooltip for', c);
  }
}

function hideCountryTooltip() {
  d3.select("#tooltip2")
    .style("visibility", "hidden");
}

function init() {
  computeAllData();
  drawTree();
  drawTime();
  drawToolbar();
}

//console.log(articleData);
