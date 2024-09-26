const fs = require("fs");
const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");
const chalk = require("chalk");
const delay = require("delay");
const url = "https://tonclayton.fun";
const queryFilePath = "auth.txt";
const proxy = "proxy.txt";
const thread = "thread.txt";

function log(msg, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  switch (type) {
    case "success":
      console.log(`[${timestamp}] ➤  ${chalk.green(msg)}`);
      break;
    case "custom":
      console.log(`[${timestamp}] ➤  ${chalk.magenta(msg)}`);
      break;
    case "error":
      console.log(`[${timestamp}] ➤  ${chalk.red(msg)}`);
      break;
    case "warning":
      console.log(`[${timestamp}] ➤  ${chalk.yellow(msg)}`);
      break;
    default:
      console.log(`[${timestamp}] ➤  ${msg}`);
  }
}
function readQueryIdsFromFile() {
  try {
    const queryContent = fs.readFileSync(queryFilePath, "utf-8");
    return queryContent
      .split("\n")
      .map((query) => query.trim())
      .filter((query) => query); // Ensure to remove extra newlines or spaces
  } catch (error) {
    console.error(chalk.red(`Error reading ${queryFilePath}:`), error);
    return [];
  }
}
async function makeRequest(url, body = null, headers = {}, proxy = null) {
  return new Promise((resolve, reject) => {
    // Tentukan opsi untuk fetch
    const options = {
      method: body ? "POST" : "GET",
      headers: {
        Host: "tonclayton.fun",
        Origin: url,
        Referer: `${url}/games/game-512`,
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        ...headers,
      },
      body: body ? body : undefined,
    };

    // Jika proxy disediakan, atur agent
    if (proxy) {
      options.agent = new HttpsProxyAgent(proxy);
    }

    fetch(url, options)
      .then((response) => {
        // Validasi status response
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => resolve(data)) // Resolving the promise with data
      .catch((error) => {
        reject(error); // Rejecting the promise with error
      });
  });
}
async function simulateGameplay(gameName) {
  const duration = Math.floor(Math.random() * 31) + 30;
  for (let i = 0; i <= duration; i++) {
    const timestamp = new Date().toLocaleTimeString();
    process.stdout.write(
      `\r[${timestamp}] ➤  \x1b[36m${gameName} game in progress: ${i}s / ${duration}s [${"=".repeat(
        i
      )}${" ".repeat(duration - i)}]\x1b[0m`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log();
}

async function processChunkedData(queryIds, chunkSize = 5) {
  for (let i = 0; i < queryIds.length; i += chunkSize) {
    const queryContent = fs.readFileSync(proxy, "utf-8");
    const proxynew = queryContent ? queryContent : null;
    const chunk = queryIds.slice(i, i + chunkSize); // Ambil chunk data dengan batasan 20 item
    const promises = chunk.map(async (query, value) => {
      try {
        const getUser = await await makeRequest(
          url + "/api/user/login",
          JSON.stringify({}),
          { "Init-Data": `${query}` },
          proxynew
        );
        if (getUser.user) {
          log(`user id   : ${getUser.user.id_telegram}`, "custom");
          log(`token     : ${getUser.user.tokens}`, "custom");
          log(`username  : ${getUser.user.username}`, "custom");
          log(`play game : ${getUser.user.daily_attempts}`, "custom");

          if (getUser.dailyReward?.can_claim_today) {
            const claimDaily = await makeRequest(
              url + "/api/user/daily-claim",
              JSON.stringify({}),
              { "Init-Data": `${query}` },
              proxynew
            );
            log(`claimDaily.message [${value}]`, "warning");
          } else {
            log(`daily reward not available [${value}]`, "error");
          }
          if (getUser.user.can_claim) {
            const token = await makeRequest(
              url + "/api/user/claim",
              JSON.stringify({}),
              { "Init-Data": `${query}` },
              proxynew
            );
            log(`token.message [${value}]`, "success");
            const startFarming = await makeRequest(
              url + "/api/user/start",
              JSON.stringify({}),
              { "Init-Data": `${query}` },
              proxynew
            );
            log(startFarming.message, "warning");
          } else {
            log("Token claim not available", "error");
          }
          const dailyAttempts = getUser.user.daily_attempts;
          log(
            `Available game attempts: ${dailyAttempts} [${value}]`,
            "warning"
          );
          for (let i = 1; i <= dailyAttempts; i++) {
            const start = await makeRequest(
              url + "/api/game/start",
              JSON.stringify({}),
              { "Init-Data": `${query}` },
              proxynew
            );
            log(`start.message [${value}]`, "success");
            await simulateGameplay("1024");
            const gameResult = await makeRequest(
              url + "/api/game/save-tile",
              JSON.stringify({ maxTile: 1024 }),
              { "Init-Data": `${query}` },
              proxynew
            );
            log(`1024 game ${i} result:`, "warning");
            log(gameResult.message, "success");
            const gameOver = await makeRequest(
              url + "/api/game/over",
              JSON.stringify({}),
              { "Init-Data": `${query}` },
              proxynew
            );
            log(
              "current_xp :" + gameOver.current_xp + ` [${value}]`,
              "success"
            );
          }
          const task = await makeRequest(
            url + "/api/user/daily-tasks",
            JSON.stringify({}),
            { "Init-Data": `${query}` },
            proxynew
          );
          await Promise.all(
            task.map(async (value, index) => {
              if (value.is_completed) {
                log("task done " + value.task_type, "warning");
              } else {
                const complete = await makeRequest(
                  url + `/api/user/daily-task/${value.id}/complete`,
                  JSON.stringify({}),
                  { "Init-Data": `${query}` },
                  proxynew
                );
                log(`complete.message [${value}]`, "success");
                const claim = await makeRequest(
                  url + `/api/user/daily-task/${value.id}/claim`,
                  JSON.stringify({}),
                  { "Init-Data": `${query}` },
                  proxynew
                );
                log(`claim.message [${value}]`, "success");
              }
            })
          );
        } else {
          log(`get account failed akun ke [${value}]`, "error");
        }
      } catch (error) {
        log(`failed proses akun ke [${value}] ${error.toString()}`, "error");
      }
    });

    await Promise.all(promises); // Tunggu sampai semua promise dalam chunk selesai
    log(chalk.blue(`Chunk ${i / chunkSize + 1} completed.`));
    await delay(5000); // Delay 5 detik sebelum memproses chunk berikutnya (opsional)
  }
}
(async () => {
  const queryIds = readQueryIdsFromFile();
  if (queryIds.length === 0) {
    console.error(chalk.red("No query_ids found in query.txt"));
    return;
  }

  while (true) {
    await processChunkedData(queryIds, 5);
    log(`➤ Processing Account Couldown 10 menit !!`, "warning");
    await delay(60000 * 10);
  }
})();
