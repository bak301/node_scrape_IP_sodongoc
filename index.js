const puppeteer = require("puppeteer");
const fs = require("fs");
const config = require("./config");
let currentPage = 0;
let page;
let initPage =
  "http://wipopublish.ipvietnam.gov.vn/wopublish-search/public/trademarks?1&query=OFCO:VN#";
let filter_sodongoc = "Số đơn gốc";
let filter_ngaynopdon = "Ngày nộp đơn";
let response1filter =
  "IBehaviorListener.0-body-basicSearchTab-searchInputPanel-searchForm-searchSubmitLink&query=OFCO:VN";
let response2filter =
  "IBehaviorListener.0-body-controlOptionsPanel-formatController-linesLink-iLink&query=OFCO:VN";
let response3filter =
  "IBehaviorListener.0-body-basicSearchTab-searchInputPanel-searchForm-searchSubmitLink&query=OFCO:VN";
let responseNavigatorFilter =
  ".IBehaviorListener.0-body-searchResultPanel-resultWrapper-dataTable-bottomToolbars-toolbars-2-span-navigator-next&query=OFCO:VN";
let outputfilePath = "output.txt";

puppeteer
  .launch({
    headless: false,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  })
  .then(async (browser) => {
    page = await browser.newPage();
    await page.goto(initPage, {
      timeout: 120000,
    });
    await page.content();

    //await regularPreparation();
    await customPreparation();
    SortAndOrder();
    await delay(config.delay.beforeScrape);
    console.log("All good");
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

    console.log("Done");
  });

async function regularPreparation() {
  console.log("clicking #sortField ...");
  await delay(1000);
  await page.waitForSelector("#sortField");
  let sortField = await page.$("#sortField");
  await sortField.select(filter_sodongoc);

  await waitForResponse(response1filter, "POST");
}

async function customPreparation() {
  let dateTypeFilter = config.filter.date.find(
    (item) => item.type === "Ngày nộp đơn"
  ); // config.date.type = 'Ngày nộp đơn' // click
  await page.evaluate((id) => {
    document.querySelector(`#${id}`).click();
  }, dateTypeFilter.id);

  await waitForResponse(
    "IBehaviorListener.0-body-advancedSearchTab-preferencesPanel-categories-3-criterias-criteriasWrapper-1-filter&query=OFCO:VN",
    "GET"
  );

  let input = await page.$(dateTypeFilter.searchTerm);
  await input.type(dateTypeFilter.value, { delay: 200 });
  await page.evaluate(() => {
    document.querySelector('#advanceSearchButton').click()
  });

  await waitForResponse(
    "IBehaviorListener.0-body-advancedSearchTab-advancedSearchInputPanel-advancedSearchForm-advancedSearchSubmitLink&query=OFCO:VN",
    "POST"
  );

  await delay(1000);
  await page.waitForSelector("#sortField");
  let sortField = await page.$("#sortField");
  await sortField.select(filter_ngaynopdon);
  await waitForResponse(
    "IBehaviorListener.0-body-basicSearchTab-searchInputPanel-searchForm-searchSubmitLink&query=OFCO:VN",
    "POST"
  );

  console.log("Clicking .asc-icon ...");
  await delay(1000);
  await page.waitForSelector(".asc-icon");
  await page.evaluate(() => {
    document.querySelector(".asc-icon").click();
  });
  await waitForResponse(response3filter, "POST");
}

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

async function SortAndOrder() {
  console.log("Clicking #linesLink-iLink ...");
  await delay(1000);
  await page.waitForSelector("#linesLink-iLink");
  await page.evaluate(() => document.querySelector("#linesLink-iLink").click());
  await waitForResponse(response2filter, "GET");

  console.log("Clicking .asc-icon ...");
  await delay(1000);
  await page.waitForSelector(".asc-icon");
  await page.evaluate(() => {
    document.querySelector(".asc-icon").click();
  });
  await waitForResponse(response3filter, "POST");
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

  fs.appendFileSync(outputfilePath, csv);
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
