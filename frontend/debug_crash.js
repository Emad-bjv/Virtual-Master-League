const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture page errors
  page.on('pageerror', error => {
    console.log('CRASH (pageerror):', error.message);
    console.log(error.stack);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    console.log("Page loaded. Clicking Admin Tab...");
    // 1. Wait for loading to finish and Auth to pass if mocked
    // Note: If Auth is required, let's bypass it or click through it
    
    // In MainDashboard, we need to bypass auth by clicking on a fake login button if any.
    // Or we can just evaluate a script to force Auth.
    await page.evaluate(() => {
      // Force React state if we can, but we might just click the 'ورود ادمین' button.
    });
    
    // We can also click through the UI
    const adminLoginBtn = await page.$x("//button[contains(., 'ورود با دسترسی ادمین')]");
    if (adminLoginBtn.length > 0) {
      console.log("Clicking Admin Login...");
      await adminLoginBtn[0].click();
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log("Clicking Live Stream Admin Tab...");
    const liveStreamTab = await page.$x("//button[contains(., 'مدیریت پخش زنده')]");
    if (liveStreamTab.length > 0) {
      await liveStreamTab[0].click();
      await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log("Clicking Match (استقلال vs پرسپولیس)...");
    const matchBtn = await page.$x("//button[contains(., 'استقلال')]");
    if (matchBtn.length > 0) {
      await matchBtn[0].click();
      await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log("Wait complete. If no error logged, it didn't crash.");
  } catch (err) {
    console.error("Script error:", err);
  } finally {
    await browser.close();
  }
})();
