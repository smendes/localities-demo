// endpoint_select.js

export function getTargetEnpoint() {
  var selectedEnpoint = document.getElementById("endpoint-select").value;
  console.log(
    `**endpoint: ${selectedEnpoint.toUpperCase()} **`
  );
  return selectedEnpoint;
}

document.getElementById("endpoint-select").addEventListener("change", (e) => {
  // nothing
});
