 page.waitForSelector('iframe.d2l-iframe').then(async (value) => {
 var v = await value.contentFrame();
  console.log(v);
});

 page.waitForSelector('iframe.d2l-iframe').then(async (value) => {
 var v = await value.contentFrame();
  console.log(v);
});

browser.pages().then(async (value) => {
  //var v = await value[1].title();
  console.log(value);
  v = value;
});

v[2].title().then(async (value) => {
    console.log(value);
});

v[2].$( 'a.icon-play').then(async (value) => {
    console.log(value);
});

browser.userAgent().then(async (value) => {
  console.log(value);
});
