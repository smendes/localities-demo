import { getTargetEnvironment } from "./environment_select.js";
import { getTargetEnpoint } from "./endpoint_select.js";
const lang = "fr";

const queryParams = new URLSearchParams(window.location.search);

  if (queryParams.get("language") != null) {
    lang = queryParams.get("language");
  }


export function autocompleteAddress(
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
    //language: lang,
    //cc_format: "alpha2",
    //no_deprecated_fields: "true"
    //extended: "postal_code",
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
    args.location = location;
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
  //args.types = "address|locality|postal_code";
  //args.types = "locality";
  //args.types = "locality|postal_code";
  // args.types = "address";
  //args.types = "poi|airport|hospital";
  //args.types = "hospital";
  //args.types = "country|admin_level";
  
  return fetch(`${env.url}${endpoint}/?${buildQueryString(args)}`).then(
    (response) => response.json()
  );
}

export function getDetailsAddress(publicId, fields) {
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
