const puppeteer = require("puppeteer");
const fs = require("fs");
const config = require('./config')
let currentPage = 0;

let initPage =
  "http://wipopublish.ipvietnam.gov.vn/wopublish-search/public/trademarks?1&query=OFCO:VN#";
let filterString = "Số đơn gốc";
let response1filter =
  "IBehaviorListener.0-body-basicSearchTab-searchInputPanel-searchForm-searchSubmitLink&query=OFCO:VN";
let response2filter =
  "IBehaviorListener.0-body-controlOptionsPanel-formatController-linesLink-iLink&query=OFCO:VN";
let response3filter =
  "IBehaviorListener.0-body-basicSearchTab-searchInputPanel-searchForm-searchSubmitLink&query=OFCO:VN";
let responseNavigatorFilter =
  ".IBehaviorListener.0-body-searchResultPanel-resultWrapper-dataTable-bottomToolbars-toolbars-2-span-navigator-next&query=OFCO:VN";
let outputfilePath = "output.txt";
let navButtonPath = 'a[title="Go to next page"]';

puppeteer
  .launch({
    headless: false,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  })
  .then(async (browser) => {
    const page = await browser.newPage();
    await page.goto(initPage, {
      timeout: 120000,
    });
    await page.content();

    let allGood = await babyStep(page);

    // start scraping
    if (allGood) {
      await delay(5000);
      console.log("ALl good");
      while (currentPage < config.TOTAL_PAGE) {
        await delay(1000);
        await scrape(page);

        await page.waitForSelector(navButtonPath);
        await delay(2000);
        await page.evaluate(() => {
          document.querySelector('a[title="Go to next page"]').click();
        });
        try {
          console.log("waiting for response ...");
          let response = await page.waitForResponse(
            (res) =>
              res.request().url().includes(responseNavigatorFilter) &&
              res.request().method() == "GET" &&
              res.status() == 200,
            {
              timeout: 10000,
            }
          );
          currentPage++;
        } catch (error) {
          console.log("break !!!");
          break;
        }
      }
    }
    console.log("Done");
  });

async function babyStep(page) {
  console.log("clicking #sortField ...");
  await delay(1000);
  await page.waitForSelector("#sortField");
  let sortField = await page.$("#sortField");
  await sortField.select(filterString);
  let response1 = await page.waitForResponse(
    (res) =>
      res.request().url().includes(response1filter) &&
      res.request().method() == "POST" &&
      res.status() == 200
  );

  let response2;
  if (response1 !== undefined) {
    console.log("Clicking #linesLink-iLink ...");
    await delay(1000);
    await page.waitForSelector("#linesLink-iLink");
    await page.evaluate(() =>
      document.querySelector("#linesLink-iLink").click()
    );
    response2 = await page.waitForResponse(
      (res) =>
        res.request().url().includes(response2filter) &&
        res.request().method() == "GET" &&
        res.status() == 200
    );
  }

  let response3;
  if (response2 !== undefined) {
    console.log("Clicking .asc-icon ...");
    await delay(1000);
    await page.waitForSelector(".asc-icon");
    await page.evaluate(() => {
      document.querySelector(".asc-icon").click();
    });
    response3 = await page.waitForResponse(
      (res) =>
        res.request().url().includes(response3filter) &&
        res.request().method() == "POST" &&
        res.status() == 200
    );
  }

  return response3 !== undefined;
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

    const extractedData = classesToExtract.map(selector =>
      Array.from(document.querySelectorAll(selector)).map(element => element.innerText.trim())
    );

    // Get the maximum number of rows
    const maxRows = Math.max(...extractedData.map(arr => arr.length));

    // Create CSV content
    const csvRows = Array.from({ length: maxRows }, (_, i) =>
      extractedData.map(column => column[i] || "").join("\t")
    );

    const csvContent = [...csvRows].join("\n") + "\n";

    // Return the CSV content
    return csvContent;
  });

  fs.appendFileSync(outputfilePath, csv);
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
