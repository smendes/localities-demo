var targetPR = "";
const environments = {
  prod: {
    woosmap_key: "woos-afefb9b4-238c-3c6a-a036-9b630b6ca775",
    url: "https://api.woosmap.com/localities/"
  },
  dev: {
    woosmap_key: "woos-f3399eaa-1f01-33cd-a0db-ce1e23b7320d",
    url: `https://develop-api.woosmap.com/localities/`
  },
  pr: {
    woosmap_key: "woos-f3399eaa-1f01-33cd-a0db-ce1e23b7320d",
    url: ""
  }
};

export function getTargetEnvironment() {
  var selectedEnvironment = document.getElementById("env-select").value;
  console.log(
    `** ${selectedEnvironment.toUpperCase()} ** ${
      environments[selectedEnvironment].url
    }`
  );
  return environments[selectedEnvironment];
}

export function getProdEnvironment() {
  return environments['prod'];
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
