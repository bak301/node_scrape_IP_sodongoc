const puppeteer = require("puppeteer");
const fs = require("fs");
const config = require("./config");

let currentPage = 0;
let page;

puppeteer
  .launch({
    headless: false,
    defaultViewport: null,
  })
  .then(async (browser) => {
    page = await browser.newPage();
    await page.goto(config.url.initPage, {
      timeout: 120000,
    });
    await page.content();

    await delay(3000);
    await waitForUserConfirmation();
    await delay(config.delay.beforeScrape);
    console.log("User confirmed. Start scraping ...");
    while (currentPage < config.TOTAL_PAGE) {
      await delay(config.delay.betweenPage);
      await scrape(page);

      await page.waitForSelector(config.querySelector.navButtonPath);
      await delay(config.delay.waitForNav);
      await page.evaluate((path) => {
        document.querySelector(path).click();
      }, config.querySelector.navButtonPath);

      try {
        console.log("waiting for response ...");
        await page.waitForResponse(
          (res) =>
            res.request().url().includes(responseNavigatorFilter) &&
            res.request().method() == "GET" &&
            res.status() == 200,
          {
            timeout: config.delay.timeoutBetweenPage,
          }
        );
        currentPage++;
      } catch (error) {
        console.log("break : " + error);
        break;
      }
    }

    console.log("Done");
  });

async function waitForResponse(url, method) {
  try {
    await page.waitForResponse(
      (res) =>
        res.request().url().includes(url) &&
        res.request().method() == method &&
        res.status() == 200
    );
  } catch (error) {
    throw error;
  }
}

async function waitForUserConfirmation() {
  await page.evaluate(() => {
    const navbar = document.querySelector("#navbar");
    if (navbar) {
      const button = document.createElement("button");
      button.id = "myButton";
      button.style.padding = "10px 20px";
      button.style.fontSize = "16px";
      button.style.margin = "auto";
      button.innerText = "Click Me";
      navbar.appendChild(button);
    }
  });
  await page.exposeFunction("onButtonClick", () => {
    console.log("Button clicked!");
    return true;
  });

  await page.evaluate(() => {
    window.buttonClicked = false;
    document.getElementById("myButton").addEventListener("click", async () => {
      window.buttonClicked = await window.onButtonClick();
    });
  });

  console.log("Waiting for button click...");
  await page.waitForFunction(() => window.buttonClicked === true, {
    timeout: 0,
  });
}

async function scrape(page) {
  console.log("Start scraping page number " + currentPage);
  let csv = await page.evaluate(() => {
    const classesToExtract = [
      ".rs-MK",
      ".rs-AFNB_ORI",
      ".rs-AFDT",
      ".rs-GZNB",
      ".rs-PBDT",
      ".rs-RENB",
      ".rs-REDT",
      ".rs-NCL",
      ".rs-VCL",
      ".rs-APNA",
      ".rs-STLB",
    ];

    const extractedData = classesToExtract.map((selector) =>
      Array.from(document.querySelectorAll(selector)).map((element) =>
        element.innerText.trim()
      )
    );

    // Get the maximum number of rows
    const maxRows = Math.max(...extractedData.map((arr) => arr.length));

    // Create CSV content
    const csvRows = Array.from({ length: maxRows }, (_, i) =>
      extractedData.map((column) => column[i] || "").join("\t")
    );

    const csvContent = [...csvRows].join("\n") + "\n";

    // Return the CSV content
    return csvContent;
  });

  fs.appendFileSync(config.filePath.output, csv);
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
