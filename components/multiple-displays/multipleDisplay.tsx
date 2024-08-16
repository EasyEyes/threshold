import { language } from "googleapis/build/src/apis/language";
import { readi18nPhrases } from "../readPhrases";
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

const isWindowMaximized = (win:any) => {
    console.log("Window innerWidth", win.innerWidth, "Window screen.availWidth", win.screen.availWidth, "Window innerHeight", win.innerHeight, "Window screen.availHeight", win.screen.availHeight);
    return win.innerWidth === win.screen.availWidth && win.innerHeight <= win.screen.availHeight;
}

const handleWindowOpen = (url:string, name:string,eye:string, initialDisplayText:string,options:any = {}, language:string, resolve:any) =>{
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
        window: win,
        isWindowMaximized: isWindowMaximized(win),
        measurements:{
            screenName: "",
            width: 0,
            height: 0,
            leftMargin: 0,
            rightMargin: 0,
            topMargin: 0,
            bottomMargin: 0,
          },
        measurementContainer: null
    }
    Screens.push(s);   
    win.onload = async () =>{
        // Set an interval to check periodically
        // const checkInterval = setInterval(()=>{checkWindowScreens(win,checkInterval)}, 1000);
        const mapElement = getMonitorNumberingMapForAllMonitors(eye === "left"? 1:3);
        const screenNumberElement = getMonitorNumberComponent(eye === "left"? 1:3);
        win.document.body.appendChild(mapElement);
        win.document.body.appendChild(screenNumberElement);
        win.addEventListener("resize",async ()=>{
            if(isWindowMaximized(win)){
                // console.log("Window is maximized");
                s.isWindowMaximized = true;
                mapElement.remove();
                screenNumberElement.remove();
                
                //if all screens are maximized, show the input fields starting from the left most screen
                if(Screens.every(s => s.isWindowMaximized)){
                    
                    // get the left most screen
                    const leftMostScreen = Screens.find(s => s.name === "left");
                    if(leftMostScreen){
                        //input fields for measurements
                        const {measurements, screenContainer} = await inputForMultipleMonitorMeasurements(leftMostScreen.window.document.body, language, leftMostScreen.window);
                        leftMostScreen.measurements = measurements;
                        leftMostScreen.measurementContainer = screenContainer;
                    }

                    // get the middle screen
                    const middleScreen = Screens.find(s => s.name === "Main");
                    if(middleScreen){
                        //input fields for measurements
                        const {measurements, screenContainer} = await inputForMultipleMonitorMeasurements(middleScreen.window.document.body, language, middleScreen.window);
                        middleScreen.measurements = measurements;
                        middleScreen.measurementContainer = screenContainer;
                    }

                    // get the right most screen
                    const rightMostScreen = Screens.find(s => s.name === "right");
                    if(rightMostScreen){
                        //input fields for measurements
                       const {measurements, screenContainer} =  await inputForMultipleMonitorMeasurements(rightMostScreen.window.document.body, language, rightMostScreen.window);
                       rightMostScreen.measurements = measurements
                       rightMostScreen.measurementContainer = screenContainer;
                    }

                    //remove the container for each screen
                    Screens.forEach(s => s.measurementContainer?.remove());

                    
                    // remove the event listener for every screen
                    Screens.forEach(s => s.window.removeEventListener("resize", ()=>{}));
                    
                    // resolve the promise
                    resolve();
                }
            }
        })

        // const h = createExperimentHeader(initialDisplayText, "header");
        // win.document.body.appendChild(h);
        
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

export const startMultipleDisplayRoutine = async (paramReader:any, language:string) => {
    // if multiple screens are not required, return
    if(viewMonitorsXYDeg.maxNumberOfMonitors <= 1) return;

    //show explanation page
    await showExplanationPage(language);
    
    if(!notifyUser()) {
        console.log("User denied popup permission.");
        return false; // Abort if the user doesn't allow popups
    }

    // const mapElement = getMonitorNumberingMapForAllMonitors(2);
    // const screenNumberElement = getMonitorNumberComponent(2);

    // document.body.appendChild(mapElement);
    // document.body.appendChild(screenNumberElement);

    // open windows for each screen
    console.log("Number of screens", viewMonitorsXYDeg.maxNumberOfMonitors, viewMonitorsXYDeg.values);
    const s: Screen_ = {
        name: "Main",
        usePsychoJSBool: true,
        widthPx: window.innerWidth,
        heightPx: window.innerHeight,
        widthCm: 0,
        heightCm: 0,
        pxPerCm: 0,
        Hz: 0,
        eyeXYZPxLeft: [0,0,0],
        eyeXYZPxRight: [0,0,0],
        fixationXYZPx: [0,0,0],
        eye: "Main",
        distanceCm: 0,
        rc: null, // Currently imported from HTML script tag
        window: window,
        isWindowMaximized:true,
        measurements: {
            screenName: "",
            width: 0,
            height: 0,
            leftMargin: 0,
            rightMargin: 0,
            topMargin: 0,
            bottomMargin: 0,
          },
        measurementContainer: null
    }
    Screens.push(s);  
    await new Promise<void>(async (resolve) => { 
    for (let i = 1; i < viewMonitorsXYDeg.maxNumberOfMonitors; i++) {
        const url = 'peripheralDisplay.html';
        const name = `window${i}`;
        const eye = i==1? "left" : "right";
        console.log("Opening window", url, name, eye);
        const initialDisplayText = "";// `Drag me to the ${eye} monitor`;
        handleWindowOpen(url, name,eye ,initialDisplayText, {left: i*100, top: 0, width: 1000, height: 1000}, language, resolve);
    }
});
   
}

const showExplanationPage = async (language:any) => {
    //header, paragraph, button
    const container = document.createElement("div");
    container.style.zIndex = "999999";
    container.style.position = "absolute";
    container.style.top = "5vh";
    container.style.left = "10vw";
    container.style.width = "70vw";
    const header = createExperimentHeader("Multiple Monitors Required", "multiple-display-header",{style:{marginBottom: "20px"}});
    const p1 = createExperimentParagaph("Once you click on the Proceed button, you will be asked to allow popups. Please allow popups in your browser by pressing OK. Then the experiment will automatically open several new windows. Each of these windows is intended to be displayed on a different monitor.\n\n Please follow the instructions on each of the windows to drag them to the appropriate monitor.", "multiple-display-explanation",
    {style: {marginBottom: "20px"}}
    );
    const button = document.createElement("button");
    button.innerText = readi18nPhrases("T_proceed", language);
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

const inputForMultipleMonitorMeasurements = async (container:HTMLElement, language:string, win:any=null, screenName:string="") => {
    const maxNumberOfMonitors = viewMonitorsXYDeg.maxNumberOfMonitors;
    const measurements = {
        screenName: screenName,
        width: 0,
        height: 0,
        leftMargin: 0,
        rightMargin: 0,
        topMargin: 0,
        bottomMargin: 0,
    }

    // const explanation = createExperimentParagaph("This experiment is designed to utilize multiple monitors. Please provide the measurements for each of the monitors. Start from the left most monitor and go left to right. The measurements should be in centimeters. The width and height are the physical dimensions of the screen (just the glowing display). The left, right, top, and bottom margins are the distances from the edge of the monitor to the edge of the screen. ", "multiple-display-measurements-explanation", {style: {marginBottom: "20px"}});
    // container.appendChild(explanation);
    const screenContainer = await measurementForm(measurements, container,0, language, win);
    // explanation.remove();
    return {measurements, screenContainer};

};

const measurementForm = async (measurements: any, container: HTMLElement, screenIndex: number, language:any, win:any = null) => {
    const maxNumberOfMonitors = viewMonitorsXYDeg.maxNumberOfMonitors;

    return await new Promise((resolve) => {
        const screenNumber = screenIndex + 1;
        const screen = measurements;
        const screenContainer = document.createElement("div");
        screenContainer.style.position = "absolute"; // Use relative positioning for easier absolute positioning inside
        screenContainer.style.width = "100vw";
        screenContainer.style.height = "100vh";
        screenContainer.style.display = "flex";
        screenContainer.style.justifyContent = "center";
        screenContainer.style.alignItems = "center";

        const instructions = document.createElement("p");
        instructions.innerText = readi18nPhrases("RC_MeasureWidthHeightAndMargins", language);
        instructions.style.position = "absolute";
        instructions.style.top = "0";
        instructions.style.left = "20px";
        instructions.style.fontSize = "1.5rem";
        screenContainer.appendChild(instructions);

        // Create outer and inner rectangles
        const outerRectangle = document.createElement("div");
        outerRectangle.style.position = "relative";
        outerRectangle.style.width = "60%";
        outerRectangle.style.height = "60%";
        outerRectangle.style.border = "2px solid black";
        outerRectangle.style.display = "flex";
        outerRectangle.style.justifyContent = "center";
        outerRectangle.style.alignItems = "center";

        const innerRectangle = document.createElement("div");
        innerRectangle.style.width = "80%";
        innerRectangle.style.height = "80%";
        innerRectangle.style.border = "2px solid black";
        innerRectangle.style.position = "relative";

        // Append inner rectangle to outer rectangle
        outerRectangle.appendChild(innerRectangle);
        screenContainer.appendChild(outerRectangle);

        // Add the arrows inside the inner rectangle
        const svgNamespace = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNamespace, "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";

        // Create the arrow for width
        const widthArrow = document.createElementNS(svgNamespace, "line");
        widthArrow.setAttribute("x1", "0%");
        widthArrow.setAttribute("y1", "50%");
        widthArrow.setAttribute("x2", "100%");
        widthArrow.setAttribute("y2", "50%");
        widthArrow.setAttribute("stroke", "black");
        widthArrow.setAttribute("stroke-width", "2");

        // Create pointy arrowhead for the left side
        const widthArrowHeadLeft1 = document.createElementNS(svgNamespace, "line");
        widthArrowHeadLeft1.setAttribute("x1", "0%");
        widthArrowHeadLeft1.setAttribute("y1", "50%");
        widthArrowHeadLeft1.setAttribute("x2", "2%");
        widthArrowHeadLeft1.setAttribute("y2", "48%");
        widthArrowHeadLeft1.setAttribute("stroke", "black");
        widthArrowHeadLeft1.setAttribute("stroke-width", "2");

        const widthArrowHeadLeft2 = document.createElementNS(svgNamespace, "line");
        widthArrowHeadLeft2.setAttribute("x1", "0%");
        widthArrowHeadLeft2.setAttribute("y1", "50%");
        widthArrowHeadLeft2.setAttribute("x2", "2%");
        widthArrowHeadLeft2.setAttribute("y2", "52%");
        widthArrowHeadLeft2.setAttribute("stroke", "black");
        widthArrowHeadLeft2.setAttribute("stroke-width", "2");

        // Create pointy arrowhead for the right side
        const widthArrowHeadRight1 = document.createElementNS(svgNamespace, "line");
        widthArrowHeadRight1.setAttribute("x1", "100%");
        widthArrowHeadRight1.setAttribute("y1", "50%");
        widthArrowHeadRight1.setAttribute("x2", "98%");
        widthArrowHeadRight1.setAttribute("y2", "48%");
        widthArrowHeadRight1.setAttribute("stroke", "black");
        widthArrowHeadRight1.setAttribute("stroke-width", "2");

        const widthArrowHeadRight2 = document.createElementNS(svgNamespace, "line");
        widthArrowHeadRight2.setAttribute("x1", "100%");
        widthArrowHeadRight2.setAttribute("y1", "50%");
        widthArrowHeadRight2.setAttribute("x2", "98%");
        widthArrowHeadRight2.setAttribute("y2", "52%");
        widthArrowHeadRight2.setAttribute("stroke", "black");
        widthArrowHeadRight2.setAttribute("stroke-width", "2");

        svg.appendChild(widthArrow);
        svg.appendChild(widthArrowHeadLeft1);
        svg.appendChild(widthArrowHeadLeft2);
        svg.appendChild(widthArrowHeadRight1);
        svg.appendChild(widthArrowHeadRight2);

        // Create the arrow for height
        const heightArrow = document.createElementNS(svgNamespace, "line");
        heightArrow.setAttribute("x1", "50%");
        heightArrow.setAttribute("y1", "0%");
        heightArrow.setAttribute("x2", "50%");
        heightArrow.setAttribute("y2", "100%");
        heightArrow.setAttribute("stroke", "black");
        heightArrow.setAttribute("stroke-width", "2");

        // Create pointy arrowhead for the top side
        const heightArrowHeadTop1 = document.createElementNS(svgNamespace, "line");
        heightArrowHeadTop1.setAttribute("x1", "50%");
        heightArrowHeadTop1.setAttribute("y1", "0%");
        heightArrowHeadTop1.setAttribute("x2", "48%");
        heightArrowHeadTop1.setAttribute("y2", "2%");
        heightArrowHeadTop1.setAttribute("stroke", "black");
        heightArrowHeadTop1.setAttribute("stroke-width", "2");

        const heightArrowHeadTop2 = document.createElementNS(svgNamespace, "line");
        heightArrowHeadTop2.setAttribute("x1", "50%");
        heightArrowHeadTop2.setAttribute("y1", "0%");
        heightArrowHeadTop2.setAttribute("x2", "52%");
        heightArrowHeadTop2.setAttribute("y2", "2%");
        heightArrowHeadTop2.setAttribute("stroke", "black");
        heightArrowHeadTop2.setAttribute("stroke-width", "2");

        // Create pointy arrowhead for the bottom side
        const heightArrowHeadBottom1 = document.createElementNS(svgNamespace, "line");
        heightArrowHeadBottom1.setAttribute("x1", "50%");
        heightArrowHeadBottom1.setAttribute("y1", "100%");
        heightArrowHeadBottom1.setAttribute("x2", "48%");
        heightArrowHeadBottom1.setAttribute("y2", "98%");
        heightArrowHeadBottom1.setAttribute("stroke", "black");
        heightArrowHeadBottom1.setAttribute("stroke-width", "2");

        const heightArrowHeadBottom2 = document.createElementNS(svgNamespace, "line");
        heightArrowHeadBottom2.setAttribute("x1", "50%");
        heightArrowHeadBottom2.setAttribute("y1", "100%");
        heightArrowHeadBottom2.setAttribute("x2", "52%");
        heightArrowHeadBottom2.setAttribute("y2", "98%");
        heightArrowHeadBottom2.setAttribute("stroke", "black");
        heightArrowHeadBottom2.setAttribute("stroke-width", "2");

        svg.appendChild(heightArrow);
        svg.appendChild(heightArrowHeadTop1);
        svg.appendChild(heightArrowHeadTop2);
        svg.appendChild(heightArrowHeadBottom1);
        svg.appendChild(heightArrowHeadBottom2);


        const elevationArrow = document.createElementNS(svgNamespace, "line");
        elevationArrow.setAttribute("x1", "50%");
        elevationArrow.setAttribute("y1", "80%"); // Start from the bottom of the inner rectangle
        elevationArrow.setAttribute("x2", "50%");
        elevationArrow.setAttribute("y2", "100%"); // Extend beyond the outer rectangle
        elevationArrow.setAttribute("stroke", "black");
        elevationArrow.setAttribute("stroke-width", "2");

        const elevationArrowHeadTop1 = document.createElementNS(svgNamespace, "line");
        elevationArrowHeadTop1.setAttribute("x1", "50%");
        elevationArrowHeadTop1.setAttribute("y1", "80%");
        elevationArrowHeadTop1.setAttribute("x2", "49.5%");
        elevationArrowHeadTop1.setAttribute("y2", "81%");
        elevationArrowHeadTop1.setAttribute("stroke", "black");
        elevationArrowHeadTop1.setAttribute("stroke-width", "2");

        const elevationArrowHeadTop2 = document.createElementNS(svgNamespace, "line");
        elevationArrowHeadTop2.setAttribute("x1", "50%");
        elevationArrowHeadTop2.setAttribute("y1", "80%");
        elevationArrowHeadTop2.setAttribute("x2", "50.5%");
        elevationArrowHeadTop2.setAttribute("y2", "81%");
        elevationArrowHeadTop2.setAttribute("stroke", "black");
        elevationArrowHeadTop2.setAttribute("stroke-width", "2");

        const elevationArrowHeadBottom1 = document.createElementNS(svgNamespace, "line");
        elevationArrowHeadBottom1.setAttribute("x1", "50%");
        elevationArrowHeadBottom1.setAttribute("y1", "100%");
        elevationArrowHeadBottom1.setAttribute("x2", "49.5%");
        elevationArrowHeadBottom1.setAttribute("y2", "99%");
        elevationArrowHeadBottom1.setAttribute("stroke", "black");
        elevationArrowHeadBottom1.setAttribute("stroke-width", "2");

        const elevationArrowHeadBottom2 = document.createElementNS(svgNamespace, "line");
        elevationArrowHeadBottom2.setAttribute("x1", "50%");
        elevationArrowHeadBottom2.setAttribute("y1", "100%");
        elevationArrowHeadBottom2.setAttribute("x2", "50.5%");
        elevationArrowHeadBottom2.setAttribute("y2", "99%");
        elevationArrowHeadBottom2.setAttribute("stroke", "black");
        elevationArrowHeadBottom2.setAttribute("stroke-width", "2");

        const elevationSVG = document.createElementNS(svgNamespace, "svg");
        elevationSVG.setAttribute("width", "100%");
        elevationSVG.setAttribute("height", "100%");
        elevationSVG.style.position = "absolute";
        elevationSVG.style.top = "0";
        elevationSVG.style.left = "0";
        elevationSVG.appendChild(elevationArrow);
        elevationSVG.appendChild(elevationArrowHeadTop1);
        elevationSVG.appendChild(elevationArrowHeadTop2);
        elevationSVG.appendChild(elevationArrowHeadBottom1);
        elevationSVG.appendChild(elevationArrowHeadBottom2);

        screenContainer.appendChild(elevationSVG);


        innerRectangle.appendChild(svg);

        // Position width and height input fields close to arrows
        const widthInput = createInputField(readi18nPhrases("RC_Width", language), `width-${screenNumber}`, "number", {style:{alignItems:"baseline"}});
        widthInput.style.position = "absolute";
        widthInput.style.top = "50%";
        widthInput.style.left = "20%";
        widthInput.style.transform = "translateX(-50%)";

        const heightInput = createInputField(readi18nPhrases("RC_Height", language), `height-${screenNumber}`, "number", {style:{alignItems:"baseline"}});
        heightInput.style.position = "absolute";
        heightInput.style.top = "30%";
        heightInput.style.left = "50%";
        heightInput.style.transform = "translateY(-50%)";

        innerRectangle.appendChild(widthInput);
        innerRectangle.appendChild(heightInput);

        // Left and right margin inputs outside the outer rectangle
        const leftMarginInput = createInputField(readi18nPhrases("RC_LeftMargin", language), `left-margin-${screenNumber}`, "number",  {style:{alignItems:"flex-start"}}, "", "column");
        leftMarginInput.style.position = "absolute";
        leftMarginInput.style.left = "0";
        leftMarginInput.style.top = "50%";
        leftMarginInput.style.transform = "translateY(-50%)";

        const rightMarginInput = createInputField(readi18nPhrases("RC_RightMargin", language), `right-margin-${screenNumber}`, "number", {style:{alignItems:"flex-end"}}, "", "column");
        rightMarginInput.style.position = "absolute";
        rightMarginInput.style.right = "0";
        rightMarginInput.style.top = "50%";
        rightMarginInput.style.transform = "translateY(-50%)";

        const topMarginInput = createInputField(readi18nPhrases("RC_TopMargin", language), `top-margin-${screenNumber}`, "number", {style:{alignItems:"baseline"}});
        topMarginInput.style.position = "absolute";
        topMarginInput.style.top = "0";
        topMarginInput.style.left = "50%";
        topMarginInput.style.transform = "translateX(-50%)";

        const bottomMarginInput = createInputField(readi18nPhrases("RC_BottomMargin", language), `bottom-margin-${screenNumber}`, "number",{style:{alignItems:"baseline"}});
        bottomMarginInput.style.position = "absolute";
        bottomMarginInput.style.bottom = "0";
        bottomMarginInput.style.left = "50%";
        bottomMarginInput.style.transform = "translateX(-50%)";

        const ElevationInput = createInputField(readi18nPhrases("RC_Elevation", language), `elevation-${screenNumber}`, "number",{style:{alignItems:"baseline"}});
        ElevationInput.style.position = "absolute";
        ElevationInput.style.bottom = "10%";
        ElevationInput.style.left = "50%";
        // ElevationInput.style.transform = "translateX(50%)";

        const proceedButton = document.createElement("button");
        proceedButton.innerText = readi18nPhrases("T_proceed", language);
        proceedButton.classList.add("form-input-btn");
        proceedButton.style.position = "absolute";
        proceedButton.style.bottom = "5%";
        proceedButton.style.margin = "0px";
        proceedButton.style.left = "76%";
        
        //make it inactive until all the measurements are provided
        // proceedButton.disabled = true;

        proceedButton.onclick = () => {
            // Save the measurements
            screen.width = parseFloat(widthInput.querySelector("input")?.value || "0");
            screen.height = parseFloat(heightInput.querySelector("input")?.value || "0");
            screen.leftMargin = parseFloat(leftMarginInput.querySelector("input")?.value || "0");
            screen.rightMargin = parseFloat(rightMarginInput.querySelector("input")?.value || "0");
            screen.topMargin = parseFloat(topMarginInput.querySelector("input")?.value || "0");
            screen.bottomMargin = parseFloat(bottomMarginInput.querySelector("input")?.value || "0");
            screen.elevation = parseFloat(ElevationInput.querySelector("input")?.value || "0");

            // if width and height are provided and they are greater than 0, proceed to the next screen
            if(screen.width > 0 && screen.height > 0){
                // don't make the input fields editable
                widthInput.querySelector("input")?.setAttribute("readonly", "true");
                heightInput.querySelector("input")?.setAttribute("readonly", "true");
                leftMarginInput.querySelector("input")?.setAttribute("readonly", "true");
                rightMarginInput.querySelector("input")?.setAttribute("readonly", "true");
                topMarginInput.querySelector("input")?.setAttribute("readonly", "true");
                bottomMarginInput.querySelector("input")?.setAttribute("readonly", "true");
                ElevationInput.querySelector("input")?.setAttribute("readonly", "true");
                proceedButton.remove();
                resolve(screenContainer);
            } else {
                if(win)win.alert("Please fill out all fields with valid values.");
            }
            
        };


        outerRectangle.appendChild(leftMarginInput);
        outerRectangle.appendChild(rightMarginInput);
        outerRectangle.appendChild(topMarginInput);
        outerRectangle.appendChild(bottomMarginInput);
        screenContainer.appendChild(ElevationInput);
        screenContainer.appendChild(proceedButton);

        container.appendChild(screenContainer);
    });
};



const createInputField = (label:string, id:string, type:string, options:any = {}, defaultValue:any = "", flexDirection:string = 'row') => {
    const input = document.createElement("input");
    input.type = type;
    input.id = id;
    input.value = defaultValue;
    // input.style.marginBottom = "15px";
    input.style.borderRadius = "15px";
    input.style.width = "60px";
    input.style.height = "25px";
    input.style.fontSize = "1rem";
    input.style.border = "1px solid black";
    input.style.marginTop = "10px";
    input.style.marginBottom = "10px";

    const p = document.createElement("p");
    p.innerText = label;
    p.style.margin = "0";
    p.style.marginRight = "10px";

    const unit = document.createElement("span");
    unit.innerText = "cm";
    unit.style.marginLeft = "10px";

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = flexDirection;
    container.style.zIndex = "99999999";
    // container.style.alignItems = "baseline";
    container.appendChild(p);
    container.appendChild(input);
    container.appendChild(unit);

    if(options){
        if(options.style){
            Object.assign(container.style, options.style);
        }
    }
    return container;
}




// Function to check if windows are on the same screen
function checkWindowScreens(newWindow:any, checkInterval:any) {
    if (!newWindow || newWindow.closed) {
        clearInterval(checkInterval); // Stop checking if the new window is closed
        return;
    }

    // Get the screen properties of both windows
    const mainWindowScreenX = window.screenX;
    const mainWindowScreenY = window.screenY;
    const newWindowScreenX = newWindow.screenX;
    const newWindowScreenY = newWindow.screenY;

    const mainWindowWidth = window.innerWidth;
    const newWindowWidth = newWindow.innerWidth;

    // Compare the properties
    if (Math.abs(mainWindowScreenX - newWindowScreenX) > mainWindowWidth ||
        Math.abs(mainWindowScreenY - newWindowScreenY) > window.innerHeight) {
        console.log('The new window is likely on a different screen.');
        console.log("Is Maximized", isWindowMaximized(newWindow));
    } else {
        console.log('The new window is likely on the same screen.');
    }
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