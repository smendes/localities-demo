var targetPR = "";
const environments = {
  prod: {
    woosmap_key: "woos-48c80350-88aa-333e-835a-07f4b658a9a4",
    url: "https://api.woosmap.com/localities/"
  },
  dev: {
    woosmap_key: "woos-fd3ad9c8-d9ef-3abc-94e0-f0b6e5c8d39c",
    url: `https://develop-api.woosmap.com/localities/`
  },
  pr: {
    woosmap_key: "woos-fd3ad9c8-d9ef-3abc-94e0-f0b6e5c8d39c",
    url: ""
  }
};

function getTargetEnvironment() {
  var selectedEnvironment = document.getElementById("env-select").value;
  console.log(
    `** ${selectedEnvironment.toUpperCase()} ** ${
      environments[selectedEnvironment].url
    }`
  );
  return environments[selectedEnvironment];
}

document.getElementById("env-select").addEventListener("change", (e) => {
  if (document.getElementById("env-select").value === "pr") {
    targetPR = prompt("Which PR should we target today?");

    if (targetPR) {
      const prNumber = /\d+/.exec(targetPR);
      environments.pr.url = `https://develop-api.woosmap.com/${targetPR}/localities/`;
      document.getElementById("pr-deploy").innerText = `PR ${prNumber}`;
    }
  }
});
