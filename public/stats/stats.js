const token = "FFCH7nhjGM6ey6VF8wtPkFJQ_Vn65DvozpIStEER";
const websites = [
  {
    zoneId: "3ace6ae0587033b37c79e168cf60c234",
    domain: "yuuk1.tk",
    color: [255, 182, 193],
  },
  {
    zoneId: "068e85c0bc67ef053660c7d2ceca7b89",
    domain: "yuuk1.uk",
    color: [173, 216, 230],
  },
  {
    zoneId: "176677a44c89b3aa8ab0a33f2d7108c3",
    domain: "taikoapp.uk",
    color: [152, 255, 152],
  },
  {
    zoneId: "9d4b398a23e094448b287b84947f58ff",
    domain: "forgejo.win",
    color: [255, 160, 122],
  },
  {
    zoneId: "09990364a38b739e3de9338f908d584f",
    domain: "litey.trade",
    color: [255, 215, 0],
  },
];

async function worker(item) {
  const res = await fetch(`/cloudflare?zone_id=${encodeURIComponent(item.zoneId)}`, {
    headers: {
      "X-Token": token,
    },
  });
  const json = await res.json();
  return {
    domain: item.domain,
    fg: `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})`,
    bg: `rgba(${item.color[0]}, ${item.color[1]}, ${item.color[2]}, 0.2)`,
    json,
  };
}

addEventListener("load", () => {
  Promise.all(websites.map((i) => worker(i)))
    .then((results) => {
      const scale = Math.max(...results.map((r) => r.json["data"]["viewer"]["zones"][0]["httpRequests1dGroups"].length));
      const endedAt = Math.max(...results.map((r) => r.json["data"]["viewer"]["zones"][0]["httpRequests1dGroups"].map((g) => new Date(g["dimensions"]["date"]).getTime())).flat());
      const range = Array.from({ length: scale }, (_, k) => new Date(endedAt - k * 24 * 60 * 60 * 1000));

      const ctxUsers = document.getElementById("users").getContext("2d");

      new Chart(ctxUsers, {
        data: {
          labels: range.map((d) => d.toISOString().slice(0, 10)).reverse(),
          datasets: results.map((r) => {
            return {
              type: "line",
              label: r.domain,
              data: range.map((d) => r.json["data"]["viewer"]["zones"][0]["httpRequests1dGroups"].find((g) => g["dimensions"]["date"] === d.toISOString().slice(0, 10))?.["uniq"]?.["uniques"] ?? null).reverse(),
              borderColor: r.fg,
              borderWidth: 1,
              fill: "origin",
              backgroundColor: r.bg,
              pointStyle: "star",
            };
          }),
        },
        options: {
          plugins: {
            title: {
              display: true,
              text: "過去30日のユーザー数の推移",
            },
            legend: {
              labels: {
                usePointStyle: true,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });

      const ctxBytes = document.getElementById("bytes").getContext("2d");

      new Chart(ctxBytes, {
        data: {
          labels: range.map((d) => d.toISOString().slice(0, 10)).reverse(),
          datasets: results.map((r) => {
            return {
              type: "line",
              label: r.domain,
              data: range.map((d) => r.json["data"]["viewer"]["zones"][0]["httpRequests1dGroups"].find((g) => g["dimensions"]["date"] === d.toISOString().slice(0, 10))?.["sum"]?.["bytes"] / 1000 ** 3 ?? null).reverse(),
              borderColor: r.fg,
              borderWidth: 1,
              fill: "origin",
              backgroundColor: r.bg,
              pointStyle: "star",
            };
          }),
        },
        options: {
          plugins: {
            title: {
              display: true,
              text: "過去30日の送受信データ量(GB)の推移",
            },
            legend: {
              labels: {
                usePointStyle: true,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    });
});
