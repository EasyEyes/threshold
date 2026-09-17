let rc = null;

async function runRemoteCalibrator() {
  rc = new RemoteCalibrator();

  rc.init();
  console.log("RC LD", rc.languageData);
  const tasks = [
    {
      name: "screenSize",
      options: { fullscreen: true, check: false },
    },
  ];
  await new Promise(async (resolve) => {
    console.log("Remote Calibrator is running...");
    //sleep for 2 seconds to make sure rc is loaded
    await new Promise((res) => setTimeout(res, 2000));
    rc.panel(
      tasks,
      "#rc-panel-holder",
      {
        debug: false,
        i18n: true,
      },
      () => {
        rc.removePanel();
        rc._removeBackground();
        console.log("Remote Calibrator is done");
        resolve();
      },
      null,
      null,
      null,
    );
  });
}
// await runRemoteCalibrator();
