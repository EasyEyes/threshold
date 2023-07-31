import { multiply } from "mathjs";
import { SerialPort, ReadlineParser as Readline } from "serialport";

export class ColorCAL {
  constructor(port, maxAttempts = 2) {
    this.port =
      port ||
      (process.platform === "darwin"
        ? "/dev/tty.usbmodem00001"
        : process.platform.startsWith("linux")
        ? "/dev/ttyACM0"
        : 3);
    this.portString = isNaN(this.port) ? this.port : "COM" + this.port;
    this.isOpen = false;
    this.lastLum = null;
    this.lastCmd = "";
    this.type = "ColorCAL";
    this.OK = true;
    this.maxAttempts = maxAttempts;
    this._zeroCalibrated = false;

    // Setup serial port
    try {
      this.com = new SerialPort(this.portString, { baudRate: 115200 });
    } catch (error) {
      console.error(
        "Couldn't connect to port " +
          this.portString +
          ". Is it being used by another program?"
      );
      this.OK = false;
    }

    this.parser = this.com.pipe(new Readline({ delimiter: "\n\r" }));

    // Handle serial port open and error events
    this.com.on("open", () => {
      this.isOpen = true;
      console.log(`Opened serial port ${this.portString}`);
    });

    this.com.on("error", (err) => {
      // this.OK = false;
      console.error("Error on port: ", err.message);
    });

    this.getInfo()
      .then(([ok, serialNum, firm, firmBuild]) => {
        this.ok = ok;
        this.serialNum = serialNum;
        this.firm = firm;
        this.firmBuild = firmBuild;
      })
      .catch((err) => {
        console.error(err);
      });
    // this.getCalibMatrix()
    //   .then((calibMatrix) => {
    //     this.calibMatrix = calibMatrix;
    //   })
    //   .catch((err) => {
    //     console.error(err);
    //   });
  }

  sendMessage(message, timeout = 0.1) {
    return new Promise((resolve, reject) => {
      let lines = [];

      // Handle parser data event
      this.parser.on("data", (line) => {
        line = line.trim();
        if (line !== "" && line !== ">") {
          lines.push(line);
        }
      });

      // Send command and read response
      if (message.slice(-2) !== "\n") {
        message += "\n"; // append newline if necessary
      }
      this.lastCmd = message;
      this.com.write(message, (err) => {
        if (err) {
          reject(err);
        }
      });

      setTimeout(() => {
        this.parser.removeAllListeners("data");
        resolve(lines.length === 1 ? lines[0] : lines);
      }, timeout * 1000);
    });
  }

  /* Conduct a measurement and return the X,Y,Z values
  Usage:: ok, X, Y, Z = colorCal.measure()
  Where:
      ok is True/False
      X, Y, Z are the CIE coordinates (Y is luminance in cd/m**2)

  Following a call to measure, the values ColorCAL.lastLum will also be
  populated with, for compatibility with other devices used by PsychoPy
  (notably the PR650/PR655)
  */
  async measure() {
    let val = await this.sendMessage("MES", 5);
    console.log("val", val);
    let vals = val.split(",");
    let ok = vals[0] === "OK00";
    console.log("ok", ok);
    // Convert raw X, Y, Z to float
    let xyzRaw = vals.slice(1).map(Number);
    console.log("xyzRaw", xyzRaw);
    console.log("this.calibMatrix", this.calibMatrix);
    let [X, Y, Z] = multiply(this.calibMatrix, xyzRaw);
    this.ok = ok;
    this.lastLum = Y;
    return [ok, X, Y, Z];
  }
  trim(s) {
    return (s || "").replace(/^\s+|\s+$/g, "");
  }
  async getLum() {
    await this.measure();
    return this.lastLum;
  }

  async getInfo() {
    let val = await this.sendMessage("I");
    let vals = val.split(",");
    let ok = vals[0] === "OK00";
    if (ok) {
      let firmware = vals[2];
      let serialNum = this.trim(vals[4]);
      let firmBuild = vals[vals.length - 1];
      return [ok, serialNum, firmware, firmBuild];
    } else {
      return [ok, 0, 0, 0];
    }
    return ok ? [ok, vals[4], vals[2], vals[vals.length - 1]] : [ok, 0, 0, 0];
  }

  async getNeedsCalibrateZero() {
    let val = await this.sendMessage("ZCD");
    let vals = val.split(",");
    this._zeroCalibrated = vals[0] === "OK00";
    return this._zeroCalibrated;
  }

  async calibrateZero() {
    let val = await this.sendMessage("UZC");
    let vals = val.split(",");
    this._zeroCalibrated = vals[0] === "OK00";
    return this._zeroCalibrated;
  }

  async getCalibMatrix() {
    let matrix = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    for (let rowN = 0; rowN < 3; rowN++) {
      let rowName = "r0" + (rowN + 1);
      console.log("rowName", rowName);
      let val = await this.sendMessage(rowName, 1.0);
      console.log("getCalibMatrix val", typeof val);
      let vals = val.split(","); // convert to list of values

      if (vals[0] === "OK00" && vals.length > 1) {
        // convert to array of floats
        let floats = minolta2float(vals.slice(1).map(Number));
        matrix[rowN] = floats;
      } else {
        console.log(`ColorCAL got this from command ${rowName}: ${val}`);
      }
    }
    this.calibMatrix = matrix;
    return matrix;
  }
}

function minolta2float(inVal) {
  if (Array.isArray(inVal)) {
    // If inVal is an array, apply the function to each element
    return inVal.map((val) =>
      val < 50000 ? val / 10000.0 : (-val + 50000.0) / 10000.0
    );
  } else {
    // If inVal is a single number, apply the function to it
    return inVal < 50000 ? inVal / 10000.0 : (-inVal + 50000.0) / 10000.0;
  }
}
