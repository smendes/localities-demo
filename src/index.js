import { isoCountries } from "./countries.js";
import {
  debounce,
  autocompleteAddress,
  getDetailsAddress
} from "./autocomplete.js";
import getTargetEnpoint from "./endpoint_select.js";
import {
  localitiesReverseGeocode
} from "./geocode.js";
import "./bias_controller.js";
import BiasController from "./bias_controller.js";
let myMap;
let markerAddress;
let viewpointAddress;
let componentsRestriction = [];
let detailsPublicId;
let location;
let biasCircle;
let biasController = new BiasController();
let types_change = document.getElementById("types-select");

let extended = false;

let endpoint = getTargetEnpoint();

function requestDetailsAddress(public_id) {
  detailsPublicId = public_id;
  const fields = [
    ...document.querySelectorAll('input[name="fields"]:checked')
  ].map((e) => e.value);

  getDetailsAddress(public_id, fields.join("|")).then((addressDetails) => {
    displayAddressDetails(addressDetails.result);

    let lat = addressDetails.result.geometry.location.lat;
    let lng = addressDetails.result.geometry.location.lng;
    let markerPosition = {
      lat,
      lng
    };
    if (addressDetails.result.geometry.viewport) {
      let northeast = addressDetails.result.geometry.viewport.northeast;
      let southwest = addressDetails.result.geometry.viewport.southwest;
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
      if (addressDetails.result.types[0] === "locality") {
        myMap.setZoom(8);
      } else if (addressDetails.result.types[0] === "postal code") {
        myMap.setZoom(6);
      } else {
        myMap.setZoom(16);
      }
    }
    myMap.panTo(markerPosition);
    if (markerAddress) {
      markerAddress.setMap(null);
      markerAddress = null;
    }
    markerAddress = new woosmap.map.Marker({
      position: markerPosition,
      icon: {
        url: "https://images.woosmap.com/dot-marker.png",
        scaledSize: {
          height: 64,
          width: 46
        }
      }
    });
    markerAddress.setMap(myMap);
  });
}

function displayAddress() {
  detailsPublicId = null;
  const value = document.getElementById("input").value;
  const results = document.querySelector(".autocomplete-results");

  let components = componentsRestriction.map(({ id }) => `country:${id}`);
  components = components.join("|");
  let types = "";
  types = Array.from(types_change.selectedOptions)
    .map((o) => o.value)
    .join("|");

  autocompleteAddress(
    value,
    components,
    types,
    extended,
    biasController.getLocation(),
    biasController.getRadius()
  ).then((response) => {
    results.innerHTML = "";
    results.parentElement.style.display = "none";
    let html = "";
    let items = [];
    if (endpoint == "search") {items = response.results} else {items = response.localities}
    console.log("localities results:",items);
    for (let item in localities) {
      let prediction = item;
      let prediction_id = item.public_id
      let predictionClass = "no-viewpoint";
      let predictionTypes = prediction.types[0];

      let matched_substrings = prediction.matched_substrings;
      let formatted_name = "";
      if (prediction.matched_substrings) {
        formatted_name = bold_matched_substring(
          prediction["description"],
          matched_substrings.description
        );
      } else {
        formatted_name = prediction["description"];
      }
      if (prediction.postal_codes) {
        formatted_name += ` (${prediction.postal_codes.join(", ")})`;
      }
      if (prediction.viewpoint) {
        predictionClass = "has-viewpoint";
      }
      if (prediction.subtypes) {
        for (let subtype of prediction.subtypes) {
          predictionTypes += "," + subtype;
        }
      }
      html += `<div class="prediction ${predictionClass}" prediction-id=${prediction_id}>${formatted_name} (${predictionTypes})</div>`;
    }

    results.innerHTML = html;
    results.style.display = "block";
    results.parentElement.style.display = "flex";

    const data = results.querySelectorAll(".prediction");

    for (let result of data) {
      result.addEventListener("click", () => {
        results.style.display = "none";
        results.parentElement.style.display = "none";
        const predictionId = parseInt(result.getAttribute("prediction-id"), 10);
        const prediction = localities[predictionId];
        document.getElementById("input").value = prediction.description;
        requestDetailsAddress(prediction.public_id);
      });
    }
  });
}

function bold_matched_substring(string, matched_substrings) {
  if (matched_substrings) {
    matched_substrings = matched_substrings.reverse();
    for (let substring of matched_substrings) {
      let char = string.substring(
        substring["offset"],
        substring["offset"] + substring["length"]
      );
      string = `${string.substring(
        0,
        substring["offset"]
      )}<span class='bold'>${char}</span>${string.substring(
        substring["offset"] + substring["length"]
      )}`;
    }
  }
  return string;
}

function displayAddressDetails(addressDetails) {
  const detailsHTML = document.querySelector(".addressDetails");
  detailsHTML.innerHTML = "";
  detailsHTML.style.display = "block";
  if (addressDetails.public_id) {
    detailsHTML.innerHTML += `<p>Public id : <br /><span class='bold'>${addressDetails.public_id}</span></p>`;
  }
  if (addressDetails.formatted_address) {
    detailsHTML.innerHTML += `<p>Description : <span class='bold'>${addressDetails.formatted_address}</span></p>`;
  }
  if (addressDetails.types[0]) {
    detailsHTML.innerHTML += `<p>Type : <span class='bold'>${addressDetails.types[0].replace(
      "_",
      " "
    )}</span></p>`;
  }
  if (addressDetails.geometry) {
    const location_type_string = addressDetails.geometry.accuracy;
    if (location_type_string) {
      detailsHTML.innerHTML += `<p>Location type : <span class='bold'>${location_type_string
        .replace("_", " ")
        .toLowerCase()}</span></p>`;
    }
    detailsHTML.innerHTML += `<p>Latitude : <span class='bold'>${addressDetails.geometry.location.lat.toString()}</span> <br>Longitude : <span class='bold'>${addressDetails.geometry.location.lng.toString()}</span></p>`;
    if (addressDetails.address_components) {
      let compoHtml = "";
      for (let compo of addressDetails.address_components) {
        compoHtml += `${compo.types[0]}: <span class='bold'>${compo.long_name}</span><br>`;
      }
      detailsHTML.innerHTML += `<b>Address components:</b><p>${compoHtml}</p>`;
    }
  }
  //detailsHTML.style.display = "block";
  //detailsHTML.innerHTML = "<p>" + JSON.stringify(JSON.parse(addressDetails),null,2) + "</p>";
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
  const results = document.querySelector(".autocomplete-results");
  const input = document.querySelector(".autocomplete-input > input");
  const geometry = document.querySelector("input[name='fields']");
  const extendedCheckbox = document.getElementById("extended-checkbox");
  const biasCheckbox = document.getElementById("bias-checkbox");
  let biasParamDiv = document.getElementById("bias-params");

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
        displayAddress(value);
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
        extended=true;
      } else {
        extended=false;
      }
      displayAddress();
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
        displayAddress();
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
    displayAddress();
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
  
  localitiesReverseGeocode(latlng,components,types).then((response) => {
            console.log(response.results[0].formatted_address);
            displayAddressDetails(response.results[0]);
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
