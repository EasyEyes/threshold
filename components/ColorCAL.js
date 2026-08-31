import { multiply } from "mathjs";

/**
 * CRS ColorCAL (MK2) over Web Serial.
 *
 * Protocol (same as PsychoPy's psychopy.hardware.crs.ColorCAL): commands
 * are ASCII lines ("MES\n", "r01\n", ...); the device answers one line
 * "OKxx,..." or "ERxx,..." terminated by "\n", then prints a "\r>" prompt.
 *
 * Web Serial delivers ARBITRARY CHUNKS, not lines: a response can arrive
 * split ("OK0" + "0,123..." + "\n\r>"), and the prompt often arrives as its
 * own chunk. Treating the latest chunk as the response (the historical
 * implementation) therefore mis-parsed randomly — calibration rows read
 * the "\r>" prompt and stayed zero, and MES parsed truncated lines. All
 * reads now accumulate into a buffer and sendCommand() consumes exactly
 * one complete response line per command.
 */
export class ColorCAL {
  constructor() {
    this.port = null;
    this.globalReader = null;
    // Accumulates incoming chunks; sendCommand() clears it before writing
    // and extracts one complete response line from it.
    this.readBuffer = "";
    // Last complete response line (for debugging/inspection).
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
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      console.log("Port opened", port);
      this.port = port;
      this.globalReader = port.readable.getReader();
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
      this.readBuffer += new TextDecoder().decode(value);
      this.dataReceived = true;
    }
  }

  /**
   * Write `command` + "\n" and wait for one complete response line.
   * The buffer is cleared before writing (like PsychoPy's flush of the
   * input buffer per command), so prompt remnants ("\r>") and stale bytes
   * from earlier commands cannot be mistaken for this response.
   *
   * @returns {Promise<string>} the response line, e.g. "OK00,123,456,789"
   */
  async sendCommand(command, timeoutMs = 2000) {
    const port = this.port ?? (await navigator.serial.getPorts())[0];
    this.readBuffer = "";
    this.dataReceived = false;
    const writer = port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(command + "\n"));
    } finally {
      writer.releaseLock();
    }
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      // The response starts at the OK/ER code (the device may emit prompt
      // characters or an echo first) and is complete at the next newline.
      const match = this.readBuffer.match(/(OK\d\d|ER\d\d)[^\n]*/);
      if (match && this.readBuffer.indexOf("\n", match.index) !== -1) {
        const line = match[0].replace(/\r/g, "").trim();
        this.lastReadValue = line;
        return line;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error(
      `ColorCAL did not answer "${command}" within ${timeoutMs} ms` +
        (this.readBuffer
          ? ` (received so far: ${JSON.stringify(this.readBuffer)})`
          : " (received nothing)"),
    );
  }

  minolta2float(inVal) {
    if (Array.isArray(inVal)) {
      return inVal.map((val) =>
        val < 50000 ? val / 10000.0 : (-val + 50000.0) / 10000.0,
      );
    } else {
      return inVal < 50000 ? inVal / 10000.0 : (-inVal + 50000.0) / 10000.0;
    }
  }

  /**
   * Read the device's calibration matrix (rows r01..r03). Each row is
   * retried a few times: a failed row would silently zero the matrix and
   * make every measurement 0 nits.
   */
  async calibrate() {
    console.log("Calibrate function called");
    for (let rowN = 0; rowN < 3; rowN++) {
      const rowName = "r0" + (rowN + 1);
      for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await this.sendCommand(rowName, 2000);
        const values = response.split(",");
        if (values[0] === "OK00" && values.length >= 4) {
          const cleanedValues = values
            .slice(1, 4)
            .map((val) => Number(val.replace(/[^0-9-]/g, "")));
          this.calibMatrix[rowN] = this.minolta2float(cleanedValues);
          break;
        }
        console.warn(
          `ColorCAL got this from command ${rowName} (attempt ${attempt}/3): ${response}`,
        );
      }
    }
    console.log("Calibration matrix:", this.calibMatrix);
    return this.calibMatrix;
  }

  /**
   * Send one MES command and return the calibrated CIE tristimulus
   * [X, Y, Z]. Y is luminance in cd/m^2 (nits); X and Z give chromaticity
   * (x = X/(X+Y+Z), y = Y/(X+Y+Z)), needed to verify chromatic stimuli and
   * color-space (sRGB vs Display-P3) tagging.
   *
   * Bounded retries: a malformed or ER-code response is retried, and after
   * `attempts` failures this throws instead of looping forever.
   */
  async measureXYZ(attempts = 5) {
    let lastResponse;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const response = await this.sendCommand("MES", 10000);
      lastResponse = response;
      const values = response.split(",");
      const xyzRaw = values
        .slice(1, 4)
        .map((val) => Number(val.replace(/[^0-9-.]/g, "")));
      if (
        values[0] === "OK00" &&
        xyzRaw.length === 3 &&
        xyzRaw.every(Number.isFinite)
      ) {
        const [X, Y, Z] = multiply(this.calibMatrix, xyzRaw);
        this.luminance = Y;
        return [X, Y, Z];
      }
      console.warn(
        `ColorCAL MES attempt ${attempt}/${attempts} got: ${response}`,
      );
    }
    throw new Error(
      `ColorCAL measurement failed after ${attempts} attempts ` +
        `(last response: ${lastResponse})`,
    );
  }

  /** Luminance-only measurement (Y in cd/m^2), as used by photometry.js. */
  async measure() {
    const [, Y] = await this.measureXYZ();
    console.log(`Luminance: ${Y}`);
    return Y;
  }
}
