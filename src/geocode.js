import { getTargetEnvironment } from "./environment_select.js";
const lang = "fr";
export function localitiesReverseGeocode(
  latlng,
  components,
  types
) {
  const env = getTargetEnvironment();
  const args = {
    key: env.woosmap_key,
    latlng: latlng.lat + "," +latlng.lng,
  };
  if (components !== "") {
    args.components = components;
  }
  if (types !== "") {
    args.types = types;
  }

  return fetch(`${env.url}geocode/?${buildQueryString(args)}`).then(
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
