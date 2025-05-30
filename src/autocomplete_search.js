import { getTargetEnvironment, getProdEnvironment } from "./environment_select.js";
import { getTargetEnpoint } from "./endpoint_select.js";
const lang = "fr";

const queryParams = new URLSearchParams(window.location.search);

if (queryParams.get("language") != null) {
  lang = queryParams.get("language");
}


export function autocompleteSearch(
  input,
  components,
  types,
  extended,
  location,
  radius
) {
  const env = getTargetEnvironment();
  const endpoint = getTargetEnpoint();
  const args = {
    key: env.woosmap_key,
    input,
    data: "advanced",
    language: lang
  };

  if (extended) {
    args.extended = "postal_code";
  }
  if (endpoint == "search") {
    args.location = "0,0";
  } else if (endpoint == "geocode") {
    args.address = input;
  }
  if (location) {
    args.location = location.lat() + "," + location.lng();
  }
  if (radius) {
    args.radius = radius;
  }

  if (components !== "") {
    args.components = components;
  }
  if (types !== "") {
    args.types = types;
  }

  console.log("autocompleteSearch - args", args)

  return fetch(`${env.url}${endpoint}/?${buildQueryString(args)}`).then(
    (response) => response.json()
  );
}

export function autocompleteSearchInProd(
  input,
  components,
  types,
  extended,
  location,
  radius
) {
  const env = getProdEnvironment();
  const endpoint = getTargetEnpoint();
  const args = {
    key: env.woosmap_key,
    input,
    language: lang,
    data: "advanced",
  };

  if (extended) {
    args.extended = "postal_code";
  }
  if (endpoint == "search") {
    args.location = "0,0";
  } else if (endpoint == "geocode") {
    args.address = input;
  }
  if (location) {
    args.location = location.lat() + "," + location.lng();
  }
  if (radius) {
    args.radius = radius;
  }

  if (components !== "") {
    args.components = components;
  }
  if (types !== "") {
    args.types = types;
  }

  return fetch(`${env.url}${endpoint}/?${buildQueryString(args)}`)
  .then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      const details = data?.details;
      const message = details
        ? `<pre>${JSON.stringify(details, null, 2)}</pre>`
        : "Erreur API inconnue.";
      showErrorModal(message);
    }

    return data;
  })
  .catch((err) => {
    // Cas erreur réseau ou JSON cassé
    showErrorModal(err.message || "Une erreur réseau est survenue.");
  });
}


export function getDetails(publicId, fields) {
  const env = getTargetEnvironment();
  const args = {
    key: env.woosmap_key,
    language: lang,
    public_id: publicId,
    //fields: "geometry"
  };

  if (fields) {
    args.fields = fields;
  }

  return fetch(`${env.url}details/?${buildQueryString(args)}`)
  .then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      const details = data?.details;
      const message = details
        ? `<pre>${JSON.stringify(details, null, 2)}</pre>`
        : "Erreur API inconnue.";
      showErrorModal(message);
    }

    return data;
  })
  .catch((err) => {
    // Cas erreur réseau ou JSON cassé
    showErrorModal(err.message || "Une erreur réseau est survenue.");
  });
}

function showErrorModal(messageHtml) {
  const modal = document.getElementById("error-modal");
  const msg = document.getElementById("error-message");
  msg.innerHTML = messageHtml; // pas textContent ici
  modal.classList.remove("hidden");
}

export function getDetailsInProd(publicId, fields) {
  const env = getProdEnvironment();
  const args = {
    key: env.woosmap_key,
    language: lang,
    public_id: publicId,
    //fields: "geometry"
  };

  if (fields) {
    args.fields = fields;
  }

  return fetch(`${env.url}details/?${buildQueryString(args)}`).then(
    (response) => response.json()
  );
}

export function buildQueryString(params) {
  const queryStringParts = [];

  for (let key in params) {
    if (params.hasOwnProperty(key)) {
      let value = params[key];
      queryStringParts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      );
    }
  }
  return queryStringParts.join("&");
}

export function debounce(func, wait, immediate) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}
