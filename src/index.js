import { isoCountries } from "./countries.js";
import {
  debounce,
  autocompleteSearch,
  getDetails,
  autocompleteSearchInProd
} from "./autocomplete_search.js";
import { getTargetEnpoint } from "./endpoint_select.js";
import {
  localitiesReverseGeocode
} from "./geocode.js";
import "./bias_controller.js";
import BiasController from "./bias_controller.js";
let myMap;
let markerDetailsResult;
let componentsRestriction = [];
let detailsPublicId;
let biasCircle;
let biasController = new BiasController();
let types_change = document.getElementById("types-select");

let extended = false;

function requestDetails(public_id) {
  detailsPublicId = public_id;
  const fields = [
    ...document.querySelectorAll('input[name="fields"]:checked')
  ].map((e) => e.value);

  getDetails(public_id, fields.join("|")).then((result) => {
    displayResultDetails(result.result);

    let lat = result.result.geometry.location.lat;
    let lng = result.result.geometry.location.lng;
    let markerPosition = {
      lat,
      lng
    };
    if (result.result.geometry.viewport) {
      let northeast = result.result.geometry.viewport.northeast;
      let southwest = result.result.geometry.viewport.southwest;
      const shape = [
        { lat: northeast.lat, lng: northeast.lng },
        { lat: southwest.lat, lng: northeast.lng },
        { lat: southwest.lat, lng: southwest.lng },
        { lat: northeast.lat, lng: southwest.lng },
        { lat: northeast.lat, lng: northeast.lng }
      ];
      const polygon = new woosmap.map.Polygon({
        paths: [shape],
        strokeColor: "#b71c1c",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#b71c1c",
        fillOpacity: 0.5
      });
      polygon.setMap(myMap);
    } else {
      if (result.result.types[0] === "locality") {
        myMap.setZoom(8);
      } else if (result.result.types[0] === "postal code") {
        myMap.setZoom(6);
      } else {
        myMap.setZoom(16);
      }
    }
    myMap.panTo(markerPosition);
    if (markerDetailsResult) {
      markerDetailsResult.setMap(null);
      markerDetailsResult = null;
    }
    markerDetailsResult = new woosmap.map.Marker({
      position: markerPosition,
      icon: {
        url: "https://images.woosmap.com/dot-marker.png",
        scaledSize: {
          height: 64,
          width: 46
        }
      }
    });
    markerDetailsResult.setMap(myMap);
  });
}

function displayResult(inProd) {
  detailsPublicId = null;
  const value = document.getElementById("input").value;

  let components = componentsRestriction.map(({ id }) => `country:${id}`);
  components = components.join("|");
  let types = "";
  types = Array.from(types_change.selectedOptions)
    .map((o) => o.value)
    .join("|");

  autocompleteSearch(
    value,
    components,
    types,
    extended,
    biasController.getLocation(),
    biasController.getRadius()
  ).then((response) => fetchSuggestions(response, false));

  autocompleteSearchInProd(
    value,
    components,
    types,
    extended,
    biasController.getLocation(),
    biasController.getRadius()
  ).then((response) => fetchSuggestions(response, true));
}

function fetchSuggestions(response, isProd) {
  let results;
  if (isProd) {
    results = document.getElementById("autocomplete-results-compare");
  }
  else {
    results = document.getElementById("autocomplete-results");
  }
  const endpoint = getTargetEnpoint();
  results.innerHTML = "";
  results.parentElement.style.display = "none";
  let html = "";
  let items = [];
  if (endpoint == "search" || endpoint == "geocode") { items = response.results } else { items = response.localities }
  for (let item of items) {
    console.log("localities " + endpoint + ":", item);
    let prediction = item;
    let prediction_id = item.public_id
    let predictionClass = "no-viewpoint";
    let predictionTypes = item.types[0];
    let formatted_name = "";
    let formatted_description = "";
    if (endpoint == "search") {
      formatted_name = prediction["title"];
      formatted_description = prediction["description"];
    }
    else if (endpoint == "geocode"){
      formatted_name = prediction["formatted_address"];
    }
    else {
      formatted_name = prediction["description"];
    }
    if (prediction.postal_codes) {
      formatted_name += ` (${prediction.postal_codes.join(", ")})`;
    }
    if (prediction.viewpoint) {
      predictionClass = "has-viewpoint";
    }
    if (prediction.categories) {
      predictionTypes = prediction.categories[0];
    }
    html +=   `<li prediction-id=${prediction_id} class="prediction ${isProd ? "disabled" : ""}">
                <div class="localities-result-title">
                  ${formatted_name}
                  <span class="localities-result-description">${formatted_description}</span>
                  <span class="localities-result-${prediction.categories ? "category" : "type"}">${predictionTypes}</span>
                </div>
              </li>`;
  }

  results.innerHTML = html;
  results.style.display = "block";
  results.parentElement.style.display = "flex";
  
  const data = results.querySelectorAll(".prediction");

  for (let result of data) {

    if (result.classList.contains("disabled")) continue;

    const titleElement = result.querySelector('.localities-result-title');
    if (!titleElement) continue; // sécurité si l'élément est absent

    const name = titleElement.textContent;
    result.addEventListener("click", () => {
      results.style.display = "none";
      results.parentElement.style.display = "none";
      const predictionId = result.getAttribute("prediction-id");
      document.getElementById("input").value = name;
      requestDetails(predictionId);
    });
  }
  
}

function displayResultDetails(result) {
  const detailsHTML = document.querySelector(".addressDetails");
  detailsHTML.innerHTML = "";
  detailsHTML.style.display = "block";
  if (result.public_id) {
    detailsHTML.innerHTML += `<p>Public id: <br /><span class='bold'>${result.public_id}</span></p>`;
  }
  if (result.formatted_address) {
    detailsHTML.innerHTML += `<p>Fromatted Address: <span class='bold'>${result.formatted_address}</span></p>`;
  }
  if (result.title) {
    detailsHTML.innerHTML += `<p>Title: <span class='bold'>${result.title}</span></p>`;
  }
  if (result.name) {
    detailsHTML.innerHTML += `<p>Name: <span class='bold'>${result.name}</span></p>`;
  }
  if (result.description) {
    detailsHTML.innerHTML += `<p>Description: <span class='bold'>${result.description}</span></p>`;
  }
  if (result.types) {
    detailsHTML.innerHTML += `<p>Types: <span class='bold'>${result.types[0].replace(
      "_",
      " "
    )}</span></p>`;
  }
  if (result.categories) {
    detailsHTML.innerHTML += `<p>Categories: <span class='bold'>${result.categories[0].replace(
      "_",
      " "
    )}</span></p>`;
  }
  if (result.geometry) {
    const location_type_string = result.geometry.accuracy;
    if (location_type_string) {
      detailsHTML.innerHTML += `<p>Location type: <span class='bold'>${location_type_string
        .replace("_", " ")
        .toLowerCase()}</span></p>`;
    }
    detailsHTML.innerHTML += `<p>Latitude: <span class='bold'>${result.geometry.location.lat.toString()}</span> <br>Longitude: <span class='bold'>${result.geometry.location.lng.toString()}</span></p>`;
    if (result.address_components) {
      let compoHtml = "";
      for (let compo of result.address_components) {
        compoHtml += `${compo.types[0]}: <span class='bold'>${compo.long_name}</span><br>`;
      }
      detailsHTML.innerHTML += `<b>Address components:</b><p>${compoHtml}</p>`;
    }
  }
}

function toggleCountry(country) {
  country.classList.toggle("active");
  componentsRestriction = [];
  document.querySelectorAll(".country.active").forEach(({ dataset }) => {
    componentsRestriction.push({
      id: dataset.countrycode,
      text: dataset.countrytext
    });
  });
  let activeCountryList = componentsRestriction.map(
    ({ id, text }) =>
      `<div class="country"><span class="flag-icon flag-icon-${id.toLowerCase()}"></span><span class="flag-text">${text}</span></div>`
  );
  document.querySelector("#active-restrictions").innerHTML =
    activeCountryList.length > 0
      ? activeCountryList.join("")
      : "No active restrictions...";
}

function enableBias(location) {
  console.log("enableBias", location);
  if (location) {
    biasController.setBias(
      location,
      document.getElementById("bias-radius-input").value
    );
  } else {
    biasController.enable();
  }
  biasCircle.setMap(myMap);
  document.getElementById("bias-location-input").value =
    biasController.location;
  document.getElementById("bias-params").style.display = "block";
}
function disableBias() {
  biasController.disable();
  document.getElementById("bias-params").style.display = "none";
  if (biasCircle) {
    biasCircle.setMap(null);
  }
}
function initUI() {
  const multiSelect = document.querySelector(".multiselect");
  const countries = document.getElementById("countries");
  const overlayCb = document.getElementById("bgOverlay");
  const results = document.querySelector(".suggestions-list");
  const resultsCompare = document.querySelector(".suggestions-list-compare");
  const input = document.querySelector(".autocomplete-input > input");
  const extendedCheckbox = document.getElementById("extended-checkbox");
  const biasCheckbox = document.getElementById("bias-checkbox");
  const biasMapCenterCheckbox = document.getElementById("bias-map-center-checkbox");

  var types_select = $(document.getElementById("types-select")).selectize({
    create: true,
    maxItems: null,
    plugins: ["remove_button"],
    sortField: {
      field: "text",
      direction: "asc"
    },
    dropdownParent: "body"
  });

  let componentExpanded = false;
  input.addEventListener(
    "input",
    debounce(function () {
      let value = this.value;
      value.replace('"', '\\"').replace(/^\s+|\s+$/g, "");
      if (value !== "") {
        displayResult(value);
      } else {
        results.innerHTML = "";
      }
    }, 0)
  );
  function showCountriesList() {
    countries.style.display = "flex";
    overlayCb.style.display = "block";
    componentExpanded = true;
  }
  function hideCountriesList() {
    countries.style.display = "none";
    overlayCb.style.display = "none";
    componentExpanded = false;
  }
  multiSelect.addEventListener(
    "click",
    (e) => {
      if (!componentExpanded) {
        showCountriesList();
      } else {
        hideCountriesList();
      }
      e.stopPropagation();
    },
    true
  );

  extendedCheckbox.addEventListener(
    "change",
    (e) => {
      if (extendedCheckbox.checked) {
        extended = true;
      } else {
        extended = false;
      }
      displayResult();
    },
    true
  );

  biasCheckbox.addEventListener(
    "change",
    (e) => {
      if (biasCheckbox.checked) {
        enableBias();
      } else {
        disableBias();
      }
    },
    true
  );

  biasMapCenterCheckbox.addEventListener(
    "change",
    (e) => {
      if (biasMapCenterCheckbox.checked) {
        enableBias(myMap.getCenter());
      } else {
        disableBias();
      }
    },
    true
  );

  disableBias();
  document.getElementById("bias-radius-input").value = biasController.radius;
  document
    .getElementById("bias-radius-input")
    .addEventListener("change", (e) => {
      if (biasController.enabled) {
        biasController.radius = document.getElementById(
          "bias-radius-input"
        ).value;
        updateBiasCircle();
      }
    });
  overlayCb.addEventListener(
    "click",
    (e) => {
      if (componentExpanded) {
        hideCountriesList();
        displayResult();
      }
    },
    false
  );

  const countryList = isoCountries.map(
    ({ id, text }) =>
      `<div class="country" data-countrycode="${id}" data-countrytext="${text}"><span class="flag-icon flag-icon-${id.toLowerCase()}"></span><span class="flag-text">${text}</span><div class='active-icon-wrapper'></div></div>`
  );
  countries.innerHTML = countryList.join("");
  countries.insertAdjacentHTML(
    "beforeEnd",
    "<button id='btnRestrict'>Apply restrictions</button>"
  );
  document.querySelector("#btnRestrict").addEventListener("click", (e) => {
    hideCountriesList();
    displayResult();
  });
  document.querySelectorAll(".country").forEach((country) => {
    country.addEventListener("click", (e) => {
      toggleCountry(country);
    });
  });
}

const script = document.createElement("script");
script.src =
  "https://sdk.woosmap.com/map/map.js?key=woos-afefb9b4-238c-3c6a-a036-9b630b6ca775&callback=initMap";
script.defer = true;

window.initMap = function () {
  myMap = new woosmap.map.Map(document.getElementById("map"), {
    center: { lat: 48.8534, lng: 2.3488 },
    zoom: 5,
    gestureHandling: "greedy",
    disableDefaultUI: true,
    styles: [
      {
        featureType: "poi",
        elementType: "all",
        stylers: [
          {
            visibility: "on"
          }
        ]
      }
    ]
  });

  myMap.addListener("rightclick", (event) => {
    updateBiasCircle(event.latlng);
  });
  myMap.addListener("click", (event) => {
    geocode(event.latlng);
  });
};

function geocode(latlng) {

  let components = componentsRestriction.map(({ id }) => `country:${id}`);
  components = components.join("|");
  let types = "";
  types = Array.from(types_change.selectedOptions)
    .map((o) => o.value)
    .join("|");

  localitiesReverseGeocode(latlng, components, types).then((response) => {
    console.log(response.results[0].formatted_address);
    displayResultDetails(response.results[0]);
  });

}

function updateBiasCircle(latlng) {
  if (biasCircle == null) {
    biasCircle = new window.woosmap.map.Circle({
      strokeColor: "#b71c1c",
      strokeOpacity: 0.5,
      strokeWeight: 1,
      fillColor: "#b71c1c",
      fillOpacity: 0.3,
      myMap,
      center: latlng,
      radius: biasController.getRadius()
    });
    biasCircle.setMap(myMap);
  } else {
    if (latlng) {
      biasCircle.setCenter(latlng);
    }
    biasCircle.setRadius(biasController.getRadius());
  }
  if (!document.getElementById("bias-checkbox").checked) {
    document.getElementById("bias-checkbox").checked = true;
  }
  const location = latlng ? `${latlng.lat},${latlng.lng}` : null;
  enableBias(location);
}
document.head.appendChild(script);

initUI();
