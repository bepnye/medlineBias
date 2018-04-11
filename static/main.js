var meshLookup = new Map();
var articleLookup = new Map();
var meshNameToUid = new Map();

_meshData.forEach(function(m) {
  meshLookup.set(m.uid, m);
  meshNameToUid.set(m.name, m.uid);
});
_articleData.forEach(function(a) {
	articleLookup.set(a.pmid, a);
});
_meshToArticles.forEach(function(d) {
  meshLookup.get(d.uid).pmids = d.pmids;
  meshLookup.get(d.uid).bias = 0.0;
});

console.log(meshLookup);
console.log(articleLookup);

var allMesh = Array.from(meshLookup.keys());
var allArticles = Array.from(articleLookup.keys());

var rootMesh = 'D012164';
var selectedMesh = allMesh.slice();
var selectedArticles = allArticles.slice();

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

function getSubtreeMesh(root) {
  var queue = [root];
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

function getBiasFromLabels(labels) {
  if (labels.length == 0) { return 0.0; }
	var nF = 0;
	var nM = 0;
	labels.forEach(function(l) {
		if (l == 'F' || l == 'X') { nF++; }
		if (l == 'M' || l == 'X') { nM++; }
	});
  return nM/labels.length - nF/labels.length;
}

function getBiasFromPmids(pmids) {
  var labels = [];
  pmids.forEach(function(pmid) {
    labels.push(articleLookup.get(pmid).label);
  });
  return getBiasFromLabels(labels);
}

function updateMeshBias() {
  console.log('Updating mesh bias...');
  var curArticles = new Set(selectedArticles);
  meshLookup.forEach(function(m, ui, map) {
    var pmids = m.pmids.filter(function(pmid) { return curArticles.has(pmid); });
    console.log(m, pmids);
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
      yearData.set(y, { 'labels': [], 'year': y });
    }
    yearData.get(y).labels.push(article.label);
  });
  var years = Array.from(yearData.keys());
  years.forEach(function(y) {
    yearData.get(y).bias = getBiasFromLabels(yearData.get(y).labels);
  });
  var yi = d3.min(years);
  var yf = d3.max(years);
  for (i = yi; i < yf; i++) {
    if (!yearData.has(i)) {
      yearData.set(i, { 'labels': [], 'year': i, 'bias': 0.0 });
    }
  }
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
      countryData.set(c, { 'labels': [], 'names': new Set() });
    }
    countryData.get(c).labels.push(article.label);
    countryData.get(c).names.add(article.country);
  });
  Array.from(countryData.keys()).forEach(function(c) {
    countryData.get(c).bias = getBiasFromLabels(countryData.get(c).labels);
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
        newSelectedArticles.add(p);
      }
    });
  });
  console.log(selectedMesh);
  console.log(newSelectedArticles);
  updateSelectedArticles(Array.from(newSelectedArticles));
}

function updateSelectedArticles(newSelectedArticles) {
  selectedArticles = newSelectedArticles;
  computeAllData();
  refreshPlots();
}

function setRootMesh() {
  console.log('yay');
  var meshName = document.getElementById("meshNode").value;
  if (!meshNameToUid.has(meshName)) {
    alert('No matching mesh found ('+meshName+')');
  } else {
    rootMesh = meshNameToUid.get(meshName);
    updateSelectedMesh(getSubtreeMesh(rootMesh));
  }
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
}

function drawTree() {
  topPlot = TREE_PLOT;
  drawTreeData();
}
function drawList() {
  topPlot = LIST_PLOT;
  drawMeshData();
}
function drawTime() {
  bottomPlot = TIME_PLOT;
  drawYearData();
}
function drawMap() {
  bottomPlot = MAP_PLOT;
  drawCountryData();
}

computeAllData();

//console.log(articleData);
