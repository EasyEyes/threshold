import { Screen_, Screens, viewMonitorsXYDeg } from "./globals";

const createExplanationRoutine = () => {
    //create a header: Multiple Displays
    //create a paragraph: This experiment requires multiple monitors. Once you hit Proceed, you will be asked to allow popups. Please allow popups in your browser by pressing OK. 
}
const createExperimentParagaph = (text: string, id:string, options:any = {}) => {
    const  p = document.createElement("p");
    p.innerText = text;
    p.id = id;
    //if options are provided, set them
    if(options){
        if (options.className) {
            p.className = options.className;
        }
        if (options.style) {
            Object.assign(p.style, options.style);
        }
    }
    return p;
}

const createExperimentHeader = (text: string, id:string, options:any= {}) => {
    const  h = document.createElement("h2");
    h.innerText = text;
    h.id = id;
    //if options are provided, set them
    if(options){
        if (options.className) {
            h.className = options.className;
        }
        if (options.style) {
            Object.assign(h.style, options.style);
        }
    }
    
    return h;
}

const handleWindowOpen = (url:string, name:string,eye:string, initialDisplayText:string,options:any = {}) =>{
    const win = openWindow(url, name, options);
    if(win){
    const s: Screen_ = {
        name: eye,
        usePsychoJSBool: false,
        widthPx: win.innerWidth,
        heightPx: win.innerHeight,
        widthCm: 0,
        heightCm: 0,
        pxPerCm: 0,
        Hz: 0,
        eyeXYZPxLeft: [0,0,0],
        eyeXYZPxRight: [0,0,0],
        fixationXYZPx: [0,0,0],
        eye: eye,
        distanceCm: 0,
        rc: null, // Currently imported from HTML script tag
        window: win
    }
    Screens.push(s);   
    win.onload = () =>{
        const h = createExperimentHeader(initialDisplayText, "header");
        win.document.body.appendChild(h);
        // console.log("Window loaded", win.runRemoteCalibrator);
        // if(win.runRemoteCalibrator)  win.runRemoteCalibrator()
    }
}
 console.log("Screens", Screens);   
}

const openWindow = (url:string, name:string, options:any = {}) =>{
    const o = `width='${options.width}', height='${options.height}', left='${options.left}', top='${options.top}'`; 
    return window.open(url, name, o);
}
const notifyUser = ()=> {
    const userConfirmed = confirm("This application will open multiple windows. Press OK to allow popups in your browser.");
    return userConfirmed;
}

export const startMultipleDisplayRoutine = async (paramReader:any) => {
    // if multiple screens are not required, return
    if(viewMonitorsXYDeg.maxNumberOfMonitors === 0) return;

    // getMonitorNumberingMapForAllMonitors(2);
    // getMonitorNumberComponent(2);
    //show explanation page
    await showExplanationPage();
    
    if(!notifyUser()) {
        console.log("User denied popup permission.");
        return false; // Abort if the user doesn't allow popups
    }
    // open windows for each screen
    console.log("Number of screens", viewMonitorsXYDeg.maxNumberOfMonitors, viewMonitorsXYDeg.values);
    for (let i = 1; i < viewMonitorsXYDeg.maxNumberOfMonitors; i++) {
        const url = 'peripheralDisplay.html';
        const name = `window${i}`;
        const eye = i==1? "left" : "right";
        console.log("Opening window", url, name, eye);
        const initialDisplayText = `Drag me to the ${eye} monitor`;
        handleWindowOpen(url, name,eye ,initialDisplayText, {left: i*100, top: 0, width: 800, height: 600});
    }
}

const showExplanationPage = async () => {
    //header, paragraph, button
    const container = document.createElement("div");
    container.style.zIndex = "999999";
    container.style.position = "absolute";
    container.style.top = "10vh";
    container.style.left = "10vw";
    container.style.width = "70vw";
    const header = createExperimentHeader("Multiple Monitors Required", "multiple-display-header",{style:{marginBottom: "20px"}});
    const p1 = createExperimentParagaph("This experiment is designed to utilize multiple monitors. Once you click on the Proceed button, you will be asked to allow popups. Please allow popups in your browser by pressing OK. Then the experiment will automatically open several new windows. Each of these windows is intended to be displayed on a different monitor.\n\n Please follow the instructions on each of the windows to drag them to the appropriate monitor.", "multiple-display-explanation",
    {style: {marginBottom: "20px"}}
    );
    const button = document.createElement("button");
    button.innerText = "Proceed";
    //add class
    button.className = "form-input-btn";
    button.id = "multiple-display-proceed";
    button.style.margin = "0"
    button.style.width = "auto"

    document.body.appendChild(container);
    container.appendChild(header);
    container.appendChild(p1);
    container.appendChild(button);

    await new Promise<void>((resolve) => {
        button.onclick = () => {
            header.remove();
            p1.remove();
            button.remove();
            container.remove();
            resolve();
        }
    });


}

/**
 *  Draw an identical map in each window, with the numbers 1 to N plotted 
 * in an X,Y plot of eccentricity, without axes or scales. Number the eccentricities
 *  1 to N, according to increasing horizontal or vertical eccentricity, whichever is emphasized. 
 * For example:

    1 2 3
    or
    3
    2
    1
 * 
 */
const getMonitorNumberingMapForAllMonitors = (monitorNumber:number) => {
    const direction:string = getAlignmentDirection() // horizontal or vertical
    const maxNumberOfMonitors = viewMonitorsXYDeg.maxNumberOfMonitors;

    // draw the map. If the alignment is horizontal, draw the map horizontally. Otherwise, draw it vertically.
    //the map is just a number line from 1 to N
    //prepare and return a div with the map. The numbers should be big and bold. and the div should be centered.
    const container = document.createElement("div");
    
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.justifyContent = "center";
    container.style.alignItems = "center";
    container.style.zIndex = "999999";
    container.style.position = "absolute";

    const map = document.createElement("div");
    // map.style.fontSize = "12rem";
    map.style.fontWeight = "bold";
    map.style.color = "black";
    map.style.backgroundColor = "white";
    map.style.display = "flex";
    map.style.justifyContent = "center";
    map.style.alignItems = "center";

    const numbers = Array.from({length: maxNumberOfMonitors}, (_, i) => i+1);
    if(direction === "horizontal") {
        numbers.forEach((n) => {
            const span = document.createElement("span");
            span.innerText = n.toString();
            span.style.margin = "0 10px";
            span.style.border = "3px solid black";
            span.style.width = `${50/maxNumberOfMonitors}vw`;
            span.style.height = "20vh";
            span.style.textAlign = "center";
            span.style.fontSize =  `${15/maxNumberOfMonitors}rem`;
            map.appendChild(span);
        });
    } else {
        numbers.reverse().forEach((n) => {
            map.style.flexDirection = "column";
            const span = document.createElement("span");
            span.innerText = n.toString();
            span.style.margin = "0 10px";
            span.style.border = "3px solid black";
            span.style.width = "20vw";
            span.style.height = `${50/maxNumberOfMonitors}vh`;
            span.style.textAlign = "center";
            //font size in rem
            span.style.fontSize =  `${15/maxNumberOfMonitors}rem`;
            map.appendChild(span);
        });
    }

    // add a text to the map: Drag me to monitor ${monitorNumber}. Right below the number line.
    const dragMe = document.createElement("p");
    dragMe.innerHTML = `Drag me to monitor <b>${monitorNumber}</b>`;
    dragMe.style.margin = "20px";
    dragMe.style.fontSize = "2rem";
    // dragMe.style.fontWeight = "bold";
    // map.appendChild(dragMe);

    container.appendChild(map);
    container.appendChild(dragMe);
    // document.body.appendChild(container);
    return container;
}

//display the monitor number in the top left corner of the screen
const getMonitorNumberComponent = (monitorNumber:number) => {
    const monitorNumberDiv = document.createElement("div");
    monitorNumberDiv.style.position = "absolute";
    monitorNumberDiv.style.top = "0";
    monitorNumberDiv.style.left = "0";
    monitorNumberDiv.style.zIndex = "999999";
    monitorNumberDiv.style.fontSize = "5rem";
    monitorNumberDiv.style.width = "15vw";
    monitorNumberDiv.style.height = "15vh";
    monitorNumberDiv.style.textAlign = "center";
    monitorNumberDiv.style.border = "3px solid black";
    monitorNumberDiv.style.fontWeight = "bold";
    monitorNumberDiv.style.color = "black";
    monitorNumberDiv.style.backgroundColor = "white";
    // monitorNumberDiv.style.padding = "10px";
    monitorNumberDiv.innerText = monitorNumber.toString();
    // document.body.appendChild(monitorNumberDiv);
    return monitorNumberDiv;
}


/* Horizontal or Vertical alignment

If the horizontal range of the viewMonitorsXYDeg eccentricities exceeds 
the vertical range, then the instructions will emphasize horizontal 
position. Otherwise emphasize the vertical position.
*/
const getAlignmentDirection = () => {
    const horizontalRange = getHorizontalRange();
    const verticalRange = getVerticalRange();
    return horizontalRange > verticalRange ? "horizontal" : "vertical";
}

const getHorizontalRange = () => {
    const xValues = viewMonitorsXYDeg.values.map((block:any) => {
        return block.map((xy:any) => xy[0]);
    });
    console.log("xValues", xValues);
    const xMax = Math.max(...xValues.flat());
    const xMin = Math.min(...xValues.flat());
    return xMax - xMin;
}

const getVerticalRange = () => {
    const yValues = viewMonitorsXYDeg.values.map((block:any) => {
        return block.map((xy:any) => xy[1]);
    });
    console.log("yValues", yValues);
    const yMax = Math.max(...yValues.flat());
    const yMin = Math.min(...yValues.flat());
    return yMax - yMin;
}