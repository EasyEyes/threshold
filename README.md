# crowding

A PsychoPy (soon PsychoJS) implementation of crowding threshold measurement experiment.

## Installation Instructions
1. Clone this repository.
You will need a copy of the files locally to work with. 
Running `git clone https://github.com/EasyEyes/crowding.git` in a 
terminal window should do the trick.
2. Run `preprocessor.py` on your experiment's csv file.
Assume we have a csv configuration file for our experiment called `myExperiment.csv`,
which we've placed in the same directory as `preprocessor.py` and `crowding.js`.
From a shell open in the same directory, run `python preprocessor.py myExperiment.csv`.
If successful, this will create a `/conditions` directory, which contains
the properly formatted csv files needed (*ie* by `crowding.js`) to create your experiment. 
   * If you don't have python available on your computer, [install it](https://www.python.org/downloads/).
3. Open `index.html` to run the experiment\*.
`index.html` is the entrypoint to the actually experiment.
From here the necessary [psychojs modules](https://github.com/psychopy/psychojs), 
the EasyEyes crowding experiment (*ie* crowding.js), 
and the parameters specific to your experiment 
(*ie* the files in `/conditions` you just produced by running `preprocessor.py`)

Unfortunately, [CORS](https://web.dev/cross-origin-resource-sharing/) makes 
the instruction "open `index.html`" more complicated than just double-clicking the file.
For testing your experiment while developing it, use the first solution below;
when your experiment is tested and ready to be run by participants, use the second.

    1. Start a server for testing locally.
    From a shell open in the same directory as `crowding.js` and `index.html`, simply run
    ```sh
    python3 -m http.server
    ```
    to start a local server for development, then open the experiment by visiting
    [http://127.0.0.1:8080/](http://127.0.0.1:8080/) from a browser.

    2.  Deploy your experiment by uploading to an experiment hosting service.
    Once your experiment is ready for participants, it should be hosted online.
    We recommend doing this safely and quickly by using a hosting service, 
    such as [Pavlovia](https://pavlovia.org). In the case of Pavlovia, 
    this looks like 
    [importing your directory to a new project on Pavlovia's Gitlab.](https://gitlab.pavlovia.org/projects/new).
    
    Alternatively, you can manage your own server, running a program such as [JATOS](jatos.org),
    to host your experiment online.
4. Edit `crowding.js` to extend functionality
Interested developers can expand upon the currently supported parameters by directly
editing the `crowding.js` or `preprocessor.py` files.
If you have a contribution that you think would be valuable for other EasyEyes Crowding users, consider 
[creating a pull request](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request) 
to share your work.

## Example CSV File

```
about,Effect of font on crowding.,Effect of font on crowding.,Effect of font on crowding.,Effect of font on crowding.
aboutDateCreated,8/1/21,8/1/21,8/1/21,8/1/21
aboutDateModified,8/15/21,8/15/21,8/15/21,8/15/21
author,Denis Pelli,Denis Pelli,Denis Pelli,Denis Pelli
authorEmail,dp3@nyu.edu,dp3@nyu.edu,dp3@nyu.edu,dp3@nyu.edu
blockOrder,1,1,2,2
conditionName,crowding,crowding,crowding,crowding
conditionTrials,40,40,40,40
markingFixationStrokeLengthDeg,1,1,1,1
markingFixationStrokeThicknessDeg,0.03,0.03,0.03,0.03
markTheFixationYes,TRUE,TRUE,TRUE,TRUE
showAlphabetWhere,bottom,bottom,bottom,bottom
showCounterWhere,bottomRight,bottomRight,bottomRight,bottomRight
showInstructionsWhere,topLeft,topLeft,topLeft,topLeft
simulateParticipantYes,FALSE,FALSE,FALSE,FALSE
simulationModel,blind,blind,blind,blind
spacingDirection,radial,radial,radial,radial
spacingOverSizeRatio,1.4,1.4,1.4,1.4
targetAlphabet,DHKNORSVZ,DHKNORSVZ,acenorsuvxz,acenorsuvxz
targetDurationSec,0.15,0.15,0.15,0.15
targetEccentricityXDeg,10,-10,10,-10
targetEccentricityYDeg,0,0,0,0
targetFont,Sloan,Sloan,Verdana,Verdana
targetFontStyle,,,,
targetKind,letter,letter,letter,letter
targetMinimumPix,8,8,8,8
targetTask,identify,identify,identify,identify
thresholdBeta,2.3,2.3,2.3,2.3
thresholdDelta,0.01,0.01,0.01,0.01
thresholdGuess,2,2,2,2
thresholdGuessLogSd,3,3,3,3
thresholdParameter,spacing,spacing,spacing,spacing
thresholdProbability,0.7,0.7,0.7,0.7
trackGazeYes,TRUE,TRUE,TRUE,TRUE
trackHeadYes,TRUE,TRUE,TRUE,TRUE
viewingDistanceDesiredCm,40,40,40,40
wirelessKeyboardNeededYes,FALSE,FALSE,FALSE,FALSE
```

A **CSV file** named `experiment.csv` must be placed at the same directory as the PsychoPy file. The program will take care of the rest. We use a transposed CSV as the input file so that it's easier to read and edit. The program is designed to handle this transposed style and will help you transpose back for PsychoPy to use.

🚨 Things worth noting:

1. Due to a PsychoPy limitation, `conditionTrials` must be the same for each condition within one block.


## PsychoPy Version

`2021.3.0`.

## TODO

- [ ] Check parameter spelling and give fatal error when detect any.

Working parameters:

(Needs to be updated!)

```
x   blockOrder
    conditionName
x   conditionTrials
    fixationStrokeLengthDeg
    fixationStrokeThicknessDeg
x   fixationYes
    showAlphabetWhere
    showCounterWhere
    showInstructionsWhere
    simulateParticipantYes
    simulationModel
x   spacingDirection
x   spacingOverSizeRatio
!   targetAlphabet => (Allowed keys) not supported when export to JS
x   targetDurationSec
x   targetEccentricityXDeg
x   targetEccentricityYDeg
x   targetFont
    targetFontStyle
    targetKind
x   targetMinimumPix
    targetTask
x   thresholdBeta
x   thresholdDelta
x   thresholdGuess
x   thresholdGuessLogSd
    thresholdParameter
x   thresholdProbability
    trackGazeYes
    trackHeadYes
x   viewingDistanceDesiredCm
    wirelessKeyboardNeededYes
```

`x` means working.
