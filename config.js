const config = {
  TOTAL_PAGE: 5,
  delay : {
    betweenPage : 500,
    waitForNav : 1000,
    beforeScrape: 5000,
  },
  querySelector: {
    navButtonPath : 'a[title="Go to next page"]'
  },
  filter: {
    date: [
      {
        type: "Ngày nộp đơn",
        id: "AFDT-filter",
        searchTerm: 'input[placeholder="ví dụ 31.12.2017"]',
        value: "2006.06.27 TO 2024.05.17"
      },
    ],
  },
};

module.exports = config;
