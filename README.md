# EasyEyes Threshold

📖 [**Read the Manual**](https://docs.google.com/spreadsheets/d/1x65NjykMm-XUOz98Eu_oo6ON2xspm_h0Q0M2u6UGtug/edit?usp=sharing) (shared via Google Sheets)

A PsychoJS-based experiment generator for the measuring various psychometric thresholds, e.g., crowding.

## UPDATE

What's below is out of date in some ways. It mentions that we replaced the Python preprocessor.py by javascript code,
but the instructions still use the Python version. Instructions below explain how to put files on a server and run them.
This will soon be done for us by the https://easyeyes.app/threshold web page, which also allows uploading of fonts and consent forms directly to the Fonts and ConsentForms folders in EasyEyesResources/ on the scientist's Pavlovia account.
The manual is up to date.
https://docs.google.com/spreadsheets/d/1x65NjykMm-XUOz98Eu_oo6ON2xspm_h0Q0M2u6UGtug/edit#gid=2021552264

- Denis, Sept 23, 2021.

## Installation Instructions

Note: We've moved `preprocessor.py` to `lib/legacy/` and future updates of the preprocessor will happen in the [control-panel](https://github.com/EasyEyes/control-panel) repository.

1. Clone this repository.

You will need a copy of the files locally to work with.
Running `git clone https://github.com/EasyEyes/threshold.git` in a
terminal window should do the trick.

2. Run `preprocessor.py` on your experiment's csv file.

Assume we have a csv configuration file for our experiment called `myExperiment.csv`,
which we've placed in the same directory as `preprocessor.py` and `threshold.js`.
From a shell open in the same directory, run `python preprocessor.py myExperiment.csv`.
If successful, this will create a `/conditions` directory, which contains
the properly formatted csv files needed (_ie_ by `threshold.js`) to create your experiment.

- If you don't have python available on your computer, [install it](https://www.python.org/downloads/).

3. Run `index.html` to run the experiment\*.

`index.html` is the entrypoint to the actually experiment.
From here the necessary [psychojs modules](https://github.com/psychopy/psychojs),
the EasyEyes Threshold experiment (_ie_ threshold.js),
and the parameters specific to your experiment
(_ie_ the files in `/conditions` you just produced by running `preprocessor.py`)

In this case, "run index.html" means "host index.html from a server, and visit the page from a web-browser".
While you could just double-click `index.html` to open it, this will result in experiment-breaking
errors.
In short, browsers only trusts resources drawn from a single source. This mechanism is a vital safety feature, but in this case means that if we try to run our experiment’s index.html file by double clicking on it, the browser will prevent the experiment from loading the resources it needs as it treats other files on our computer as separate sources.
To get around this, we can either start our own local server instance,
or use a hosting service like Pavlovia.

For testing your experiment while developing it, use the first solution below;
when your experiment is tested and ready to be run by participants, use the second.

- A. Start a server for testing locally.

  We need to [start up a local server](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/set_up_a_local_testing_server).
  In essence, this is a program running on
  our computer which properly sends all the required files for our experiment
  to the web-browser when we run the experiment.

  From a shell open in the same directory as `threshold.js` and `index.html`, simply run
  `python3 -m http.server`.
  This is a quick, one-line way to start a server instance in the current
  directory, which is built-in to python.
  (Note: Other servers, such as with [Node.js](https://stackoverflow.com/questions/6084360/using-node-js-as-a-simple-web-server)
  or [PHP](https://stackoverflow.com/questions/1678010/php-server-on-local-machine),
  would also work for this purpose, though we recommend
  using the Python server, as Python is already a dependency of the preprocessor.)

  We can then open the experiment by visiting
  the URL which the program provides, eg
  [http://0.0.0.0:8000/](http://0.0.0.0:8000/),
  from a web-browser on the same computer.

- B. Deploy your experiment by uploading to an experiment hosting service.

  Once your experiment is ready for participants, it should be hosted online.
  We recommend doing this safely and quickly by using a hosting service,
  such as [Pavlovia](https://pavlovia.org). In the case of Pavlovia,
  this looks like
  [importing your directory to a new project on Pavlovia's Gitlab.](https://gitlab.pavlovia.org/projects/new).

  Alternatively, you can manage your own server, running a program such as [JATOS](jatos.org),
  to host your experiment online.

4. Developers: Edit `threshold.js` to extend functionality
   Interested developers can expand upon the currently supported parameters by directly
   editing the `threshold.js` or `preprocessor.py` files.
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
showCharacterSetWhere,bottom,bottom,bottom,bottom
showCounterWhere,bottomRight,bottomRight,bottomRight,bottomRight
showInstructionsWhere,topLeft,topLeft,topLeft,topLeft
simulateParticipantYes,FALSE,FALSE,FALSE,FALSE
simulationModel,blind,blind,blind,blind
spacingDirection,radial,radial,radial,radial
spacingOverSizeRatio,1.4,1.4,1.4,1.4
targetCharacterSet,DHKNORSVZ,DHKNORSVZ,acenorsuvxz,acenorsuvxz
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

## Using custom fonts

[Some fonts](https://www.w3schools.com/cssref/css_websafe_fonts.asp) are natively supported by web-browsers;
these can be used in an experiment without
having to include any addition font files with your experiment.

To use other fonts, such as one you created or purchased from a third-party, start
by creating a /fonts folder in your local copy of this repo. Inside this folder you
can include any .woff font files that you would like to make accessible to to your
study.
Within your experiment csv file, simply use the same string for the targetFont
parameter as the name of the corresponding .woff file.
For example, given Pelli-EyeChart.woff in your /fonts folder, use
"Pelli-EyeChart" as the value for targetFont.
During the development process, open the javascript console in your browser to
monitor any failures to load assets like font files.

By default, PsychoJS also supports using finding fonts from [Google Fonts](https://fonts.google.com). Searching Google Fonts for a font of the requested name will therefore be the
fallback behavior of an experiment, if a `targetFont` parameter does not correspond to
a default web font, or a `.woff` file your `./fonts` directory.

Most importantly,
**always test your experiment, and verify for yourself that stimuli are being presented correctly**.

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
    showCharacterSetWhere
    showCounterWhere
    showInstructionsWhere
    simulateParticipantYes
    simulationModel
x   spacingDirection
x   spacingOverSizeRatio
!   targetCharacterSet => (Allowed keys) not supported when export to JS
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
