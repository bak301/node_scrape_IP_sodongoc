const config = {
  TOTAL_PAGE: 5,
  filePath : {
    output : "output.txt"
  },
  url : {
    initPage : 'http://wipopublish.ipvietnam.gov.vn/wopublish-search/public/trademarks?1&query=OFCO:VN'
  },
  delay : {
    betweenPage : 500,
    waitForNav : 1000,
    beforeScrape: 500,
    timeoutBetweenPage : 30000,
  },
  querySelector: {
    navButtonPath : 'a[title="Go to next page"]'
  }
};

module.exports = config;
