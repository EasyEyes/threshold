import { multiply } from "mathjs";

export class ColorCAL {
  constructor() {
    this.globalReader = null;
    this.lastReadValue = null;
    this.dataReceived = false;
    this.calibMatrix = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    this.luminance = 0;
  }

  async connect() {
    try {
      console.log("Connect function called");
      console.log("navigator object", navigator);
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      console.log("Port opened", port);
      this.globalReader = port.readable.getReader();
      console.log("Reader created", this.globalReader);
      this.readLoop(this.globalReader);
    } catch (error) {
      if (error.name === "NotFoundError") {
        console.log("User cancelled the port selection");
      } else {
        console.error("Error during port selection:", error.name, error);
      }
    }
  }

  async readLoop(reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        console.log("Reader loop done");
        return;
      }
      this.lastReadValue = new TextDecoder().decode(value);
      this.dataReceived = true;
      // add sleep here to slow down the loop ( 1ms )
    }
  }

  minolta2float(inVal) {
    if (Array.isArray(inVal)) {
      return inVal.map((val) =>
        val < 50000 ? val / 10000.0 : (-val + 50000.0) / 10000.0,
      );
    } else {
      return inVal < 50000 ? inVal / 10000.0 : (-val + 50000.0) / 10000.0;
    }
  }

  async calibrate() {
    console.log("Calibrate function called");
    const port = (await navigator.serial.getPorts())[0];
    const writer = port.writable.getWriter();
    const reader = this.globalReader;

    for (let rowN = 0; rowN < 3; rowN++) {
      let rowName = "r0" + (rowN + 1) + "\n";
      let val = new TextEncoder().encode(rowName);
      await writer.write(val);
      await new Promise((resolve) => setTimeout(resolve, 500));
      let response = this.lastReadValue;
      console.log(
        "getCalibMatrix val",
        rowName,
        " : ",
        response,
        typeof response,
      );
      let values = response.split(",");
      let cleanedValues = values
        .slice(1)
        .map((val) => Number(val.replace(/[^0-9-]/g, "")));
      if (values[0] === "OK00" && values.length >= 4) {
        let floats = this.minolta2float(cleanedValues);
        this.calibMatrix[rowN] = floats;
      } else {
        console.log(`ColorCAL got this from command ${rowName}: ${response}`);
      }
    }
    writer.releaseLock();
    console.log("Calibration matrix:", this.calibMatrix);
    return this.calibMatrix;
  }

  async measure() {
    let writer;

    try {
      while (true) {
        console.log("Measure function called");

        const port = (await navigator.serial.getPorts())[0];
        const encoder = new TextEncoder();
        this.dataReceived = false;

        writer = port.writable.getWriter();
        await writer.write(encoder.encode("MES\n"));

        // wait until dataReceived is true or timeout
        let timeout = 10000; // timeout of 10 seconds
        while (!this.dataReceived && timeout-- > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
        if (!this.dataReceived) {
          throw new Error("Data was not received in the expected time frame.");
        }

        let response = this.lastReadValue;
        this.dataReceived = false;
        let values = response.split(",");
        let cleanedValues = values
          .slice(1)
          .map((val) => Number(val.replace(/[^0-9-.]/g, "")));
        if (values[0] == "OK00") {
          let xyzRaw = cleanedValues.map(Number);
          let [X, Y, Z] = multiply(this.calibMatrix, xyzRaw);
          this.luminance = Y;
          console.log(`Luminance: ${this.luminance}`);
          return this.luminance;
        }
        writer.releaseLock();
      }
    } catch (error) {
      console.error("An error occurred during measurement:", error);
      throw error; // re-throwing the error so the caller can handle it if needed
    } finally {
      writer && writer.releaseLock();
    }
  }
}
