/*
  Do not modify this file! Run npm `npm run glossary` at ROOT of this project to fetch from the Google Sheets.
  https://docs.google.com/spreadsheets/d/1x65NjykMm-XUOz98Eu_oo6ON2xspm_h0Q0M2u6UGtug/edit#gid=1287694458 
*/

interface GlossaryFullItem {
  [field: string]: string | string[];
}

export const GLOSSARY: GlossaryFullItem[] = [
  {
    name: "_about",
    availability: "now",
    example: "Effect of font on crowding.",
    explanation:
      "_about (no default) is an optional, brief description of the whole experiment. Ignored by EasyEyes, but saved with results. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_authorEmails",
    availability: "now",
    example: "dp3@nyu.edu",
    explanation:
      "_authorEmails (no default) is optional, semicolon-separated email addresses of the authors.  The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_authors",
    availability: "now",
    example: "Denis Pelli",
    explanation:
      "_author (no default) is optional, the names of all the authors, separated by semicolons. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_calibrateMicrophoneKeywords",
    availability: "now",
    example: "TRUE",
    explanation:
      '🕑 _calibrateMicrophoneKeywords (see defaults below) is a list of keywords used to interpret the list of input devices returned by Web Audio on a mobile phone. On a desktop, Web Audio identifies which input device is in use. On a mobile device, Web Audio just gives a list of available input devices, which may include use of the loudspeaker as a microphone. For calibration purposes, EasyEyes assumes that the phone is using either its main built-in microphone or a connected external microphone. When connected to a smartphone by the QR-code technique, EasyEyes scans the enumerated list of sound input device "labels" returned by web audio. Any enumerated device whose label includes a keyword from the _calibrateMicrophoneKeywords list will be assumed to be the active external microphone, and that name will be reported as the web audio name of the Microphone. Keyword matching ignores case. If no label matches a keyword, then EasyEyes assumes that the microphone enumerated as "mics:0" is default and active, and returns its name, which on some phones is "Default". If any of your participants uses an external microphone that EasyEyes fails to detect, you may be able help EasyEyes to catch it by adding a keyword to the default list and using that extended list. Conversely, if our list inadvertently contains a keyword that is causing a false alarm because it appears in a participant\'s phone\'s label for an internal sound-input source, you can create and use a new list without the problematic keyword.\nDEFAULT (matching ignores case): "UMIK-1, UMIK-2, Bluetooth, Headset, Headphones, Wireless, On-Ear, Over-Ear, In-Ear, Buds, Earbuds, AirPods, Eardrops, Air, Cloud, MIDI, Line-in, Audeze, Audio-Technica, Blackwire, Beats, beyerdynamic, Blue Satellite, BlueParrot, Bowers & Wilkins, Caymuller, Bose, Conambo, COOSII, Cowin, Discover, Focal, HD, HEIBAS, HIFIMAN, HyperX, Jabra, JBL, Koss, LEVN, Logitech, Meze, Monolith, NANAMI, Poly, Porta, Raycon, Sennheiser, Shure, Sony, Soundcore, TOZO, Trucker, Vibe, Voyager, Yealink"',
    type: "categorical",
    default:
      "UMIK-1, UMIK-2, Bluetooth, Headset, Headphones, Wireless, On-Ear, Over-Ear, In-Ear, Buds, Earbuds, AirPods, Eardrops, Air, Cloud, MIDI, Line-in, Audeze, Audio-Technica, Blackwire, Beats, beyerdynamic, Blue Satellite, BlueParrot, Bowers & Wilkins, Caymuller, Bose, Conambo, COOSII, Cowin, Discover, Focal, HD, HEIBAS, HIFIMAN, HyperX, Jabra, JBL, Koss, LEVN, Logitech, Meze, Monolith, NANAMI, Poly Voyager, Porta, Raycon, Sennheiser, Shure, Sony, Soundcore, TOZO, Trucker, Vibe, Yealink",
    categories: "",
  },
  {
    name: "_calibrateMicrophonesBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "_calibrateMicrophonesBool (default FALSE) enables calibration of new microphones, typically smartphone microphones. This is intended solely for use by a few sound experts (for now, Denis Pelli and his assistants), and requires a calibrated microphone (the manufacturer-calibrated USB-connected miniDSP UMIK-1 or UMIK-2, available from Amazon for one or two hundred dollars) for the initial loudspeaker calibration. The calibrated mic is used to calibrate the computer's loudspeaker, then the calibrated loudspeaker is used to calibrate, one by one, any number of smartphone microphones. Each new calibration file is added to the EasyEyes microphone calibration library. To contribute a microphone profile to the EasyEyes profile library, the experiment must specify _authorEmails.  ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateMicrophonesOnlyViaPhoneBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "❌🕑 _calibrateMicrophonesOnlyViaPhoneBool (default TRUE) allows microphone calibration only via a smartphone connected by QR code. This prevents a local connection (internal mic., USB mic., bluetooth mic. or Apple handoff), which, at least on a MacBook Pro, goes though the OS sound panel which often screws up efforts to calibrate sound. This is intended solely for use by scientists. We have been unable to get useful recording through a local connection, which all go through the Sound panel. It appears that despite our attempts to disable echoCancellation, noiseSuppression, and autoGainControl, the OS removes the calibration sounds, played through the loudspeaker, from the recording, which ruins the calibration. We were unabel to fix this, but we seem to get good recordings through a smartphone recruited through a QR code, so we're moving forward with that workaround. To use a calibrated mic (e.g. UMIK-1 from miniDSP) we attach it directly to the smartphone. We protect the scientist from bad calibration by disabling local connection by default. However, if you really want that, just set _calibrateMicrophonesOnlyViaPhoneBool=FALSE and you'll be allowed to record locally.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_calibrateScreenSizeCookieBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 _calibrateScreenSizeCookieBool (default TRUE) when TRUE enables EasyEyes reading and saving of a cookie (on the participant computer) containing the screen resolution (px) and size (cm),  e.g. 3024 px x 1964 px, 24.5 cm x 16 cm. The cookie is read'only if it's present and calibrateScreenSizeCookieBool==TRUE. If read, the cookie is considered valid only if it reports a screen resolution (width x height px) that matches the current resolution. If valid then EasyEyes takes the screen size (width x height cm) from the cookie instead of doing the calibration normally provoked by calibrateScreenSizeBool==TRUE. Lacking a valid cookie, then calibrateScreenSizeBool==TRUE will provoke size calibration. If size is actually calibrated, and calibrateScreenSizeCookieBool==TRUE, then a cookie is saved, holding the screen resolution and size. The reason to check for validity is that the computer might have several screens, and the browser window could be opened on any of them. The chances are low that a given computer will have two screens with different sizes and the same resolution. Set calibrateScreenSizeCookieBool=FALSE to rule out the small chance of mistaking a new display for a same-resolution but differently sized one that was calibrated on a previous occasion.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateSoundAgainOptionBool",
    availability: "now",
    example: "",
    explanation:
      '🕑 _calibrateSoundAgainOptionBool (default FALSE), if TRUE, then the "Again" button is ALWAYS offered at the top of the Sound Calibration Results page. If FALSE, then the "Again" button is shown only if _calibrateMicrophonesBool==TRUE or the loudspeaker correction is unacceptable, with SD > _calibrateSoundTolerance_dB.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateSoundBackgroundSecs",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBackgroundSecs (default 0) records the background sound for the specified duration. This is used to estimate the background spectrum, which we subtract from spectra of other recordings. This recording is made if and only if _calibrateSoundBackgroundSecs>0 and calibrateSoundAllHzBool==TRUE.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstDb",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBurstDb (default -34) sets the digital input sound level (in dB) at which to play the MLS during calibration. If _calibrateSoundBurstDbIsRelativeBool==TRUE then  _calibrateSoundBurstDb is relative to the input threshold of the dynamic range compression model, otherwise it's absolute power of the digital sound input. The MLS is synthesized as ±1, and its amplitude is scaled to yield the desired power level. The digital input sound power will be power_dB=_calibrateSoundBurstDb if _calibrateSoundBurstDbIsRelativeBool==FALSE and power_dB=_calibrateSoundBurstDb+(T-soundGainDbSPL) if _calibrateSoundBurstDbIsRelativeBool==TRUE. The unfiltered MLS amplitude is ±10^(power_dB/20). At the default of power_dB=-18 dB, the unfiltered MLS amplitude is ±0.126. power_dB specifies the digital power before any filtering by the inverse impulse response (IIR). Within EasyEyes, the IIR is always normalized to have gain 1 at 1 kHz.",
    type: "numerical",
    default: "-34",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstDbIsRelativeBool",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBurstDbIsRelativeBool (default FALSE) when TRUE the burst sound level is\n _calibrateSoundBurstDb+(T-soundGainDbSPL), \nwhere T is the output threshold in the dynamic range compression model and T - soundGainDbSPL is the input threshold. When FALSE the burst sound level is _calibrateSoundBurstDb. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstFilteredExtraDb",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBurstFilteredExtraDb (default 6) specifies how much higher the level of the digital filtered MLS is allowed to be over that of the digital unfiltered MLS. ",
    type: "numerical",
    default: "6",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstLevelReTBool",
    availability: "now",
    example: "",
    explanation:
      "❌ _calibrateSoundBurstLevelReTBool (default FALSE) when TRUE the burst sound level is \n_calibrateSoundBurstDb+(T-soundGainDbSPL), \nwhere T is the output threshold in the dynamic range compression model and T-soundGainDbSPL is the input threshold. When FALSE the burst sound level is _calibrateSoundBurstDb. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstMLSVersions",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBurstMLSVersions (default 1) is the number N of different MLS sequences to use, doing the whole Novak et al. MLS calibration (including _calibrateSoundBurstRepeats) to get an impulse response for each MLS sequence. EasyEyes will save the N impulse responses in the profile library and in the JSON file. EasyEyes will also save, in both places, the combined impulse response, for further analysis, which is the median at each time point of the several impulse response functions. As of January 27, 2024, we only have experience with N=1. Based on Vanderkooy (1994), we hope that increasing N to 3 will greatly reduce MLS artifacts. \n\nVanderkooy, J. (1994). Aspects of MLS measuring systems. Journal of the Audio Engineering Society, 42(4), 219-231.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstPostSec",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBurstPostSec (default 0.5) requests playing the burst periodically through a post interval that is rounded up to an integer multiple of the burst period. To tolerate some onset asynchrony, we record the playing of seamless repetition of the burst throughout the whole pre, used, and post iterval.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstPreSec",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBurstPreSec (default 0.5) requests playing the burst periodically through a pre interval rounded up to an integer multiple of the burst period.  To provides time for the hardware to warm up, and to tolerate some onset asynchrony, we record the playing of seamless repetition of the burst throughout the whole pre, used, and post iterval.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstRecordings",
    availability: "now",
    example: "",
    explanation:
      "❌ _calibrateSoundBurstRecordings (default 1) is the desired number of recordings, where each recording consists of _calibrateSoundBurstRepeats. Each recording includes its own warm up _calibrateSoundBurstsWarmup. WE NOW THINK THIS SHOULD ALWAYS BE 1, BECAUSE AVERAGING THE TIME-BASED IR IS NOT RECOMMENDED.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstRepeats",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBurstRepeats (default 4) is the number of times to play the sound burst for analysis.\n_calibrateSoundBurstPreSec and _calibrateSoundBurstPostSec are rounded up to be an integer multiple of the burst period. EasyEyes adds an extra warm-up rep, at the beginning, that is also recorded, but not used in estimation of the impulse response, and an extra 10% of the requested duration, at the end, to allow for any small difference in start time between the loudspeaker and microphone.  \nIMPORTANT: The Novak et al. (2012) algorithm to deal with an asychronous loudspeaker and microphone requires that we analyze at least two repeats of the MLS period, so make sure that\n_calibrateSoundBurstRepeats ≥ 2\nWe plan to have the EasyEyes compiler enforce this.",
    type: "numerical",
    default: "4",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstScalar_dB",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBurstScalar_dB (default 12), if _calibrateSoundBurstUses1000HzGainBool==FALSE, then add this dB offset to the gain at every frequency of the gain profile. Using intuitive names, reported gain level at each frequency is \ngain_dB = scalar_dB + output+dB - input_dB\nUsing actual input parameter names, this is\ngain_dB = _calibrateSoundBurstScalar_dB + output_dB - _calibrateSoundBurstDb",
    type: "numerical",
    default: "12",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstSec",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBurstSec (default 1) is the desired length of one sound burst (currently an MLS sequence) for sound calibration. To be useful, it should be longer than the impulse response that you want to measure. Excess length improves the signal to noise ratio. MLS sequences can only be certain lengths, in steps of roughly doubling, so EasyEyes will pick the shortest MLS length that, with the actual sampling rate, produces a burst duration at least as long as _calibrateSoundBurstSec.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstsWarmup",
    availability: "now",
    example: "",
    explanation:
      "❌ _calibrateSoundBurstsWarmup (default 1) is the number of extra sound bursts, not recorded, before the recorded series of bursts. The warmup is NOT part of the _calibrateSoundBurstRepeats. There will be _calibrateSoundBurstsWarmup+_calibrateSoundBurstRepeats sound bursts, and only the final _calibrateSoundBurstRepeats are recorded and analyzed. Having a warmup burst is traditional among professionals who use MLS to measure concert halls. It's meant to give the loudspeaker and microphone time to reach a stationary state before recording for analysis. It is common to set this to 1 (for very accurate measurement) or 0 (to save time). We can't think of any reason to use another value.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "_calibrateSoundBurstUses1000HzGainBool",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundBurstUses1000HzGainBool (default FALSE) if true, then change the gain of the MLS-measured frequency transfer function to equal that measured separately with 1000 Hz sine waves. This was Denis's idea, overriding Novak et al. (2016). Decided in January 2024 that it was a bad idea, so it's now disabled by default.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateSoundCheck",
    availability: "now",
    example: "",
    explanation:
      '_calibrateSoundCheck (default "goal") optionally the flatness of the spectrum produced by playing the MLS (which has a white spectrum) with frequency-response correction in place. Correction is performed by convolving the digital sound with an inverse impulse response (IIR) computed during sound calibration for the system, microphone, or loudspeaker. _calibrateSoundCheck must be set to one of three values: “none”, “system”, or “goal”. \n• “none” skips the check. \n• “system” checks using the IIR corresponding the the combination of loudspeaker and microphone.\n• “goal” checks using the IIR corresponding to the component being calibrated, either loudspeaker or microphone.\n• "both" checks both "system" and "goal".',
    type: "categorical",
    default: "goal",
    categories: "none, system, goal, both",
  },
  {
    name: "_calibrateSoundCopyToDownloadsBool",
    availability: "now",
    example: "",
    explanation:
      " _calibrateSoundCopyToDownloadsBool (default FALSE) save a copy of each newly created file in the Downloads folder.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateSoundFavoriteAuthors",
    availability: "now",
    example: "",
    explanation:
      '🕑 _calibrateSoundFavoriteAuthors (default is empty) optionally provides a comma-separated list of email addresses of trusted authors of microphone calibrations in the EasyEyes calibration library. Each calibration is stamped with the authors\' email(s). The list is ordered so that preference diminishes farther down the list. An empty list indicates that you\'ll accept any calibration file in the EasyEyes library that matches your microphone model. If you list one or more emails, then the first is your top preference, and so on. At the end you can list "any", or not. "any" indicates that if your favorite authors have not calibrated this device, then you\'ll accept any available calibration.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_calibrateSoundIIRPhase",
    availability: "now",
    example: "",
    explanation:
      '🕑 _calibrateSoundIIRPhase (default "linear") selects the algorithm used to compute the inverse impulse response from the impulse response. We implemented linear-phase first, and have just added minimum phase.',
    type: "categorical",
    default: "linear",
    categories: "linear, minimum",
  },
  {
    name: "_calibrateSoundIIRSec",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundIIRSec (default 0.1) specifies the desired length of the inverse impulse response (IIR). Correcting low frequencies or a big room requires a long inverse impulse response. The speed of sound is 343 m/s, so travel time for sound to echo from a wall 10 m away is 20/343=58 ms. The default 0.2 s duration is long enough to correct for the initial echo from a wall 34 m away.",
    type: "numerical",
    default: "0.1",
    categories: "",
  },
  {
    name: "_calibrateSoundIRSec",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundIRSec (default 0.1) specifies the desired length of the impulse response (IR). Correcting low frequencies or a big room requires a long impulse response. The speed of sound is 343 m/s, so travel time for sound to echo from a wall 10 m away is 20/343=58 ms. The default 0.2 s duration is long enough to correct for the initial echo from a wall 34 m away.",
    type: "numerical",
    default: "0.1",
    categories: "",
  },
  {
    name: "_calibrateSoundLimit",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundLimit (default 1.0). If filtered MLS amplitude, i.e. max(abs(filteredMLS)), would exceed _calibrateSoundLimit, then EasyEyes attenuates the filteredMLS to make its amplitude equal to _calibrateSoundLimit.\nIF maxAbsFilteredMLS > _calibrateSoundLimit THEN\ngain = _calibrateSoundLimit/maxAbsFilteredMLS;\nELSE\ngain = 1;\nEND\nThe recorded microphone output will be scaled back up by dividing out the gain. _calibrateSoundLimit applies solely to filtered MLS; it does not affect the amplitude of the 1000 Hz sine or the unfiltered MLS. The attenuation is reported in the output parameter \ncalibrateSoundAttenuationXXXDb = -20*log10(gain)\nThe XXX part of the name depends on what we’re correcting:\ncalibrateSoundAttenuationSpeakerAndMicDb\ncalibrateSoundAttenuationLoudspeakerDb\ncalibrateSoundAttenuationMicrophoneDb\nThis value will always be positive, because this parameter only attenuates, never amplifies, i.e. the gain ≤ 1.",
    type: "numerical",
    default: "1.0",
    categories: "",
  },
  {
    name: "_calibrateSoundPowerBinDesiredSec",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundPowerBinDesiredSec (default 0.2) sets the bin size for estimation of power to plot power vs. time during each MLS recording, filtered or unfiltered. You want the bin size to be short enough to reveal changes over time, but long enough to average out the random variations of the MLS itself, so you get a smooth curve.",
    type: "numerical",
    default: "0.1",
    categories: "",
  },
  {
    name: "_calibrateSoundPowerDbSDToleratedDb",
    availability: "now",
    example: "",
    explanation:
      '_calibrateSoundPowerDbSDToleratedDb (default 1) sets maximum for SD of power (in dB) during the "used" (i.e. analyzed) part of the recording, when recording filtered or unfiltered MLS. If the recording is rejected, then the recording begins again.',
    type: "numerical",
    default: "100",
    categories: "",
  },
  {
    name: "_calibrateSoundSamplingDesiredBits",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundSamplingDesiredBits (default 24) specifies the desired number of bits per sample in recording during sound calibration. Using the web API, some devices allow selection of number of bits, e.g. the miniDSP UMIK-2 offers 24 or 32 bits. The UMIK=1 is fixed at 24 bits. EasyEyes will pick the available bits per sample nearest to this desired value.",
    type: "integer",
    default: "24",
    categories: "",
  },
  {
    name: "_calibrateSoundSamplingDesiredHz",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundSamplingDesiredHz (default 48000) specifies the desired sampling rate of sound production and recording during sound calibration. Using the web API we can play with a sampling rate of up to 96000 Hz, but recording is often limited to a max of 48000 Hz. EasyEyes will pick the sampling rate nearest to this desired value that is available for both playing and recording.",
    type: "numerical",
    default: "48000",
    categories: "",
  },
  {
    name: "_calibrateSoundSaveJSONBool",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundSaveJSONBool (default FALSE) requests saving of sound-calibration results in a large JSON file for the just-calibrated device when EasyEyes reaches the Sound Calibration Results page. Currently the JSON is saved to the participant's Download folder. Ideally it would instead be saved to the experiment's repository on Pavlovia.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateSoundSmoothOctaves",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundSmoothOctaves (default 1/3) specifies the bandwidth, in octaves, of the smoothing of the component spectrum output by Splitter (our deconvolver). The value zero requests no smoothing. We smooth by replacing each power gain by the average power gain within the specified bandwidth, centered, in log frequency, about the frequency whose gain we are smoothing.",
    type: "numerical",
    default: "0.3333333",
    categories: "",
  },
  {
    name: "_calibrateSoundTaperSec",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundTaperSec (default 0.01) smooths onset and offset of sounds (1000 kHz sine and MLS wide-band burst). The onset taper is sin**2, which begins at zero and ends at 1. The offset taper is cos**2, which begins at 1 and ends at zero. They are plotted two cells to the right.\n\nSounds provided by the scientist already have built-in taper. Sounds synthesized by EasyEyes should be tapered on and off. That means gradually increasing the volume from zero or back down to zero. The only degree of freedom is the taper time. We use 10 ms. That's 0.01 seconds.\n\nHere is MATLAB code to compute the onset and offset tapers. The beginning of the sound should be multiplied by the onset taper and the end of the sound should be multiplied by the offset taper.\n\n% COMPUTE ONSET AND OFFSET TAPERS\ntaperSec=0.010;\nclockFrequencyHz=96000;\ntaperTime=0:(1/clockFrequencyHz):taperSec;\nfrequency=1/(4*taperSec); % sin period is 4 times taper duration.\nonsetTaper=sin(2*pi*frequency*taperTime).^2;\noffsetTaper=cos(2*pi*frequency*taperTime).^2;\ntaperLength=length(taperTime);\n",
    type: "numerical",
    default: "0.01",
    categories: "",
  },
  {
    name: "_calibrateSoundTolerance_dB",
    availability: "now",
    example: "",
    explanation:
      '🕑 _calibrateSoundTolerance_dB (default 1.5), if _calibrateMicrophonesBool==FALSE, is the maximum acceptable SD of the speaker correction test. If the SD is less than or equal to this level then the participant is congratulated and offered the current congratulations and the "Proceed to experiment" button. If the SD exceeds this level then we don\'t congratulate, and we show an "Again" button.        ',
    type: "numerical",
    default: "1.5",
    categories: "",
  },
  {
    name: "_calibrateSoundUMIK1Base_dB",
    availability: "now",
    example: "",
    explanation:
      "_calibrateSoundUMIK1Base_dB (default -124.8) is the base gain (dB power out re dB SPL power in) of a UMIK-1 microphone (miniDSP, Hong Kong). It is used solely to interpret the serial-number-indexed UMIK-1 calibration file available online from miniDSP. For example:\nhttps://www.minidsp.com/scripts/umikcal/umik90.php/7114754_90deg.txt\nThe microphone gain at frequency f_Hz is \ngain_dB(f_Hz) = _calibrateSoundUMIK1Base_dB + SensFactor_dB + sensitivity_dB(f_Hz)\nwhere gain_dB is the level increase of digital power level out (dB) from sound level in (dB SPL), SensFactor_dB is read from the header of the microphone's calibration file, e.g. it's -1.198 dB in this header\n\"Sens Factor =-1.198dB, SERNO: 7114754\", \nand sensitivity_dB is read from the calibration file's table, which has one row per frequency.\n     _calibrateSoundUMIK1Base_dB was determined for my two UMIK-1 microphones by using my 1 kHz 94 dB SPL Center 326 calibrator (which accepts any microphone tip diameter) and comparing with the free REW sound calibration app. The free REW app works with my two UMIK-1 mics and correctly reports my 1000 Hz 94 dB SPL Center 326 calibrator as 94 dB SPL (Z). So I worked out what value of _calibrateSoundUMIK1Base_dB makes EasyEyes consistent with REW. That empirical approach succeeds, and replaces my earlier unsuccessful attempt to follow miniDSP's and REW's hard-to-read and apparently inconsistent documentation of what the \"Sens Factor\" means.\n     NOTE: _calibrateSoundUMIK1Base_dB = -124.8 is much less than _calibrateSoundUMIK2Base_dB = -100.\n     Center 326 Calibrator (accepts any microphone diameter up to 0.5\".\nhttps://www.akulap.de/joomla/index.php/de/shop/product/view/7/1",
    type: "numerical",
    default: "-124.8",
    categories: "",
  },
  {
    name: "_calibrateSoundUMIK2Base_dB",
    availability: "now",
    example: "",
    explanation:
      '_calibrateSoundUMIK2Base_dB (default -100) is the base gain (dB power out re dB SPL power in) of a UMIK-2 microphone (miniDSP, Hong Kong). It is used solely to interpret the serial-number-indexed UMIK-2 calibration file available online from miniDSP. The microphone gain at frequency fHz is \ngain_dB = _calibrateSoundUMIK1Base_dB + SensFactor_dB + sensitivity_dB(fHz)\nwhere gain_dB is the level increase of digital power level out (in dB) from sound level in (in dB SPL), SensFactor_dB is read from the header of the microphone\'s calibration file, e.g. it\'s -10.58 in this header\n"Sens Factor =-10.58dB, AGain =18dB, SERNO: 8104281"., and sensitivity_dB is read from the table, which has one row per frequency. EasyEyes ignores "AGain" (see note below).\n     _calibrateSoundUMIK2Base_dB was determined by observing the free REW sound calibration app using my two UMIK-2 microphones recording my Reed R8090 Calibrator playing 1 kHz at 94 dB SPL. The free REW app works with my two UMIK-2 mics and correctly reports my 94±0.5 dB SPL Reed R8090 calibrator as either 93.7 or 94.2 dB SPL (Z). So I worked out what value of _calibrateSoundUMIK2Base_dB makes EasyEyes consistent with REW. The value of _calibrateSoundUMIK2Base_dB is approximately -100, which is consistent with a blog comment apparently by John Mulcahy, who seems to run REW. miniDSP speaks highly of Mulcahy and his REW software.\nhttps://www.hometheatershack.com/threads/understanding-spl-offset-umik-1.134857/post-1319361\nThat empirical approach succeeds, and replaces my earlier unsuccessful attempt to follow miniDSP\'s and REW\'s hard-to-read and apparently inconsistent documentation of what the "Sens Factor" means.\n     "AGain" NOTE: Supposedly the gain of the UMIK-2 can be changed (maybe by opening the mic and setting a switch or by softare, e.g. REW or Apple\'s "Audio MIDI Setup App"), and I suppose that "AGain=18dB" in the calibration file refers to that setting. However, I never changed the gain, and EasyEyes ignores the "AGain" parameter when reading the miniDSP UMIK-2 calibration file. "AGain" does not appear in the UMIK-1 calibration file.\n     NOTE: _calibrateSoundUMIK1Base_dB=-124.8 is much less than _calibrateSoundUMIK2Base_dB=-100.\n',
    type: "numerical",
    default: "-100",
    categories: "",
  },
  {
    name: "_calibrateTimingNumberAndSecs",
    availability: "now",
    example: "",
    explanation:
      '🕑 _calibrateTimingNumberAndSecs accepts a text string containing an even number of comma-separated arguments, n1,s1,n2,s2, etc. Each pair of arguments n,s, requests that EasyEyes generate n intervals of duration s, where s is in seconds, and measure how long each interval actually was, in seconds. Save the results in the CSV file. Use one column per series. Name each column by the duration in sec, e.g. "timing0.15". The column length will be n. This should run on the Requirements page, since its sole purpose is to work out the parameters of a compatibility test.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_calibrateTrackingDistanceCheckBool",
    availability: "now",
    example: "",
    explanation:
      "_calibrateTrackingDistanceCheckBool Whether to ask participant to help check accuracy of distance tracking. This replaces the now obsolete calibrateTrackingDistanceCheckBool.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_calibrateTrackingDistanceCheckCm",
    availability: "now",
    example: "",
    explanation:
      "_calibrateTrackingDistanceCheckCm A list of distances to check. This replaces the now obsolete calibrateTrackingDistanceCheckCm.",
    type: "text",
    default: "50, 70",
    categories: "",
  },
  {
    name: "_canMeasureMeters",
    availability: "now",
    example: "",
    explanation:
      "_canMeasureMeters (default 0) states that the participant can measure distance (in meters) up to _canMeasureMeters. When greater than zero, this implies that the participant has a meter stick or metric tape measure. (Use _needMeasureMeters to demand a minimum measuring ability on the Requirements page. In that case, you can use _canMeasureMeters to specify a default value for the participant's actual measuring capability, which the participant is asked to type in.)\n\nWe introduced this for development of multiple-monitor support. Initially we'll require a meter or two. Later, we'll use Google FaceMesh on each monitor's camera to minimize the need for manual measurement.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_compileAsNewExperimentBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 _compileAsNewExperimentBool (default TRUE) can be set to FALSE to accommodate users without an institutional Pavlovia license. Without that license, Pavlovia requires assigning tokens (money) to each experiment before it can run in RUNNING mode. If _compileAsNewExperimentBool=TRUE (the default), then, when EasyEyes compiles your experiment, EasyEyes appends the smallest possible integer (at least 1) to the spreadsheet filename (without extension) to create a unique (unused) experiment name. That keeps versions apart, and keeps the data from each version in its own repository. However, for users without a site license, Pavlovia requires that tokens be assigned in advance to the specific experiment (repo). For them, every time EasyEyes changes the repo name, they must visit Pavlovia to assign tokens to the new repo, which can be a nuisance. Token users (i.e. without a site license) can minimize the token-assignment nuisance by setting _compileAsNewExperimentBool=FALSE to reuse the old repo, instead of creating a new repo every time they compile. The downside is that if you collect data, edit the table, and collect more data, the data files will all be together in the same repo, distinguished only by date. When _compileAsNewExperimentBool is FALSE, scientists only need to assign tokens the first time they compile (when it's a new repo). Once it has tokens, provided the name of the spreadsheet file is unchanged, they can keep testing, through countless compiles, without visiting Pavlovia, until the experiment runs out of tokens. Note that this flag doesn't affect PILOTING mode, which is always free and can only be used from within Pavlovia. Also, any users concerned over the huge proliferation of repos might like to set _compileAsNewExperimentBool FALSE to minimize the number of repos created by EasyEyes.\nSee _pavloviaPreferRUNNINGModeBool for a more advice on working without an institutional Pavlovia site license.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_consentForm",
    availability: "now",
    example: "adultConsent2021.pdf",
    explanation:
      "⭑ _consentForm (no default) is an optional brief description of the whole experiment that asks the participant to give informed consent (yes or no) before participating. Normally this form should be approved by your institution's Institutional Review Board (IRB) for human research. Many IRB's suggest also obtaining agreement with a final debrief form as well (see _debriefForm).",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_daisyChainURLAfterEasyEyes",
    availability: "now",
    example: "http://xyz?cc=123",
    explanation:
      "🕑 _daisyChainURLAfterEasyEyes (no default) is a URL (with query parameters) that will add to a daisy chain of testing apps. This single or cascade of URLs will run after the EasyEyes study. Typically the last step is the completion page in Prolific (or MTurk), coding the participant as eligible for payment. The study URL returned by EasyEyes will run the whole cascade, including URLBeforeEasyEyes, the EasyEyes study, and URLAfterEasyEyes. Daisy chaining suggested by Becca Hirst at Open Science Tools. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_daisyChainURLBeforeEasyEyes",
    availability: "now",
    example: "http://xyz?cc=123",
    explanation:
      "🕑 _daisyChainURLBeforeEasyEyes (no default) is a URL (with query parameters) that will begin a daisy chain of testing apps. This single or cascade of URLs will run first, before the EasyEyes study. Typically the last step is the completion page in Prolific (or MTurk), signaling the participant's eligibility for payment. The study URL returned by EasyEyes will run the whole cascade, including URLBeforeEasyEyes, the EasyEyes study, and URLAfterEasyEyes. Thanks to Becca Hirst at Open Science Tools for suggesting daisy chaining.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_dateCreated",
    availability: "now",
    example: "8/1/2021",
    explanation:
      "_dateCreated (no default) is the optional date of creation. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: " ",
    categories: "",
  },
  {
    name: "_dateModified",
    availability: "now",
    example: "8/15/2021",
    explanation:
      "_dateModified (no default) is the optional date of latest modification. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: " ",
    categories: "",
  },
  {
    name: "_debriefForm",
    availability: "now",
    example: "debrief2021.pdf",
    explanation:
      "⭑ _debriefForm is the file name of your PDF (or plain-text Markdown with extension MD) debrief document in the folder EasyEyesResources/forms/ in your Pavlovia account. The EasyEyes.app/threshold page makes it easy to upload your debrief form(s) to that folder. The compiler will check that a file with this name is present in your EasyEyesResources/ConsentForms folder on Pavlovia. See consent in Glossary for information about testing minors and children. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_debugBool",
    availability: "now",
    example: "",
    explanation:
      "_debugBool enables features that only the scientist should see. This includes extra calibration tests and buggy new features that are still under development.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_invitePartingCommentsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "🕑 _invitePartingCommentsBool. At the end of the experiment, invite the participant to make parting comments. The leading underscore in the parameter name indicates that one value (provided in column B) applies to the whole experiment. Underscore-parameter rows must be blank in columns C on.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_language",
    availability: "now",
    example: "",
    explanation:
      '⭑ _language (default "English (US)") is the English name of the initial language of the experiment, e.g. English (US), Italian, French, or Arabic. EasyEyes currently supports 41 languages, and it would be easy to add more. All translation is done on the EasyEyes Google sheet for International Phrases :\nhttps://docs.google.com/spreadsheets/d/e/2PACX-1vRYca5lLyfoYjgL1aVktCftp9GCebMGuqELWCZ4lFYFQb0etqzRrQ1a51Bzhqo-YOJ4fduHq6wWhVtv/pubhtml\nThe translations by Google Translate (blue) and GPT_TRANSLATE (green) are imperfect, so in some cases we pasted in better translations for key phrases (white). If _languageSelectionByParticipantBool==TRUE then the initial Requirements page allows the participant to choose any language for the rest of the experiment. Otherwise the language remains as set by _language.',
    type: "categorical",
    default: "English (US)",
    categories:
      "Arabic, Armenian, Bulgarian, Chinese (Simplified), Chinese (Traditional), Croatian, Czech, Danish, Dutch, English (UK), English (US), Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Italian, Japanese, Kannada, Korean, Lithuanian, Malay, Malayam, Norwegian, Persian, Polish, Portuguese, Romanian, Russian, Serbian, Spanish, Sudanese, Swahili, Swedish, Tagalog, Turkish, Urdu",
  },
  {
    name: "_languageSelectionByParticipantBool",
    availability: "now",
    example: "",
    explanation:
      "_languageSelectionByParticipantBool (default FALSE), when TRUE, tell the Requirements page to offer the participant a pull-down menu to select the language for the rest of the experiment. The experiment always begins with the language specified by _language, and the participant's option to change language appears only on the Requirements page and if  _languageSelectionByParticipantBool=TRUE. The participant selects among the native names of the languages, e.g. English, Deutsch, عربي. EasyEyes currently offers 77 languages, and it would be easy to add more. If there's demand, we could add another parameter to allow you to specify the list of languages to offer to the participant. (The compiler would issue an error if any listed language is missing.)",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_logParticipantsBool",
    availability: "now",
    example: "",
    explanation:
      "⚠ _logParticipantsBool (default FALSE), when TRUE, record each participant in the Pavlovia CSV results file before initiating PsychoJS. This guarantees that the session leaves a record in Pavlovia even if it subsequently crashes. We use this to investigate discrepancies between the number of studies reported by Prolific and Pavlovia.  The results are automatically included by Shiny, so it effortlessly makes the Shiny display more complete. ⚠ Enabling _logParticipantsBool forces the EasyEyes web page to save a results CSV file on Pavlovia before beginning the experiment, which stress tests browser compatibility, especially at slow internet speeds (below 1 Mb/s). Thus, enabling this parameter may convert a late crash (at end of experiment) to an early crash (at beginning of experiment).",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_needBrowser",
    availability: "now",
    example: "Chrome",
    explanation:
      "⭑ _needBrowser (default Chrome) is a comma-separated list either of compatible browsers or of incompatible browsers. The list can be 'all', or just compatible browsers by name, or just incompatible browsers each preceded by \"not\". No mixing allowed. When compatibles are listed, anything not listed is deemed incompatible. When incompatibles are listed, anything not listed is deemed compatible. Before asking for consent, if the participant's device is incompatible, we reject it by issuing a fatal explanatory error message to the participant (asking the Prolific participant to \"return\" this study), which ends the session (with no pay). \nWHEN USING PROLIFIC: After compiling your experiment, copy the requirements statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "multicategorical",
    default: "Chrome",
    categories:
      "all, Chrome, Chrome Mobile, Safari, Firefox, Opera, Edge, Chromium, Tor, Duckduckgo, Brave, Vivaldi, Midori, SamsungInternet, UCBrowser, Android, Firefox, QQBrowser, Instabridge, WhaleBrowser, Puffin, YandexBrowser, EdgeLegacy, Edge, CocCoc, notChrome, notSafari, notFirefox, notOpera, notEdge, notChromium, notTor, notDuckduckgo, notBrave, notVivaldi, notMidori, notSamsungInternet, notUCBrowser, notAndroid, notFirefox, notQQBrowser, notInstabridge, notWhaleBrowser, notPuffin, notYandexBrowser, notEdgeLegacy, notEdge, notCocCoc",
  },
  {
    name: "_needBrowserVersionMinimum",
    availability: "now",
    example: "100",
    explanation:
      "_needBrowserVersionMinimum (default 0) is the needed minimum integer version number of the browser. \nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "integer",
    default: "0",
    categories: "",
  },
  {
    name: "_needCalibratedSound",
    availability: "now",
    example: "",
    explanation:
      '_needCalibratedSound (default empty) requires a "microphone" (in smartphone), or "loudspeaker" (in computer), or either ("microphone, loudspeaker") whose model is included in the EasyEyes profile library. If both are listed, EasyEyes tries first to match the microphone, because we expect the microphone profiles to be more reliable.\nCurrently, this parameter is ignored if _calibrateMicrophonesBool==TRUE. In the future, when _calibrateMicrophonesBool==TRUE, the only acceptable microphone match will be a UMIK-1 or UMIK-2 microphone, and the only acceptable loudspeaker match will be an exact match, for this particular computer. ',
    type: "multicategorical",
    default: "",
    categories: "microphone, loudspeaker",
  },
  {
    name: "_needCameraBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 _needCameraBool (default TRUE) tells EasyEyes whether to require presence of a camera. We use the camera to track viewing distance (and gaze) so most vision experiments need it. Use of the camera requires permission of the participant, and some will refuse. Before asking, we show an assurance that we won't retain the photos themselves and will retain only the position and orientation of the eyes (which includes \"head\" position--i.e. midpoint between eyes-- and pupillary distance). Currently we get permission in the Remote Calibrator, but it would be better to do that in the earlier Requirements page so people don't waste time calibrating if their camera is broken, or EasyEyes can't find it, or they won't give permission. (At least one participant reported via Prolific that EasyEyes couldn't find their camera.) \nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_needColorimeterBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needColorimeterBool (default FALSE) requires a Cambridge Research Systems Ltd. ColorCAL Colorimeter attached to a USB port. \nhttps://www.crsltd.com/tools-for-vision-science/light-measurement-display-calibation/colorcal-mkii-colorimeter/",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_needComputerSurveyBool",
    availability: "now",
    example: "",
    explanation:
      "_needComputerSurveyBool (default TRUE) if TRUE then the Requirements page asks the participant to identify the computer's model name and number, and proceeds. In a typical use, there is no calibration and no other data collection.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_needCookiesBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needCookiesBool (default TRUE) requires cookie support in the browser. Most browsers allow the user to block or enable cookies. Some parts of EasyEyes (e.g. _participantIDPutBool) use cookies, and won't run if cookies are blocked. If _needCookiesBool==TRUE and cookies are blocked, the Requirements page alerts the participant, who is allowed to proceed if they enable cookies. Otherwise they cannot proceed beyond the Requirements page, and they are asked to return the study to Prolific.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_needDeviceType",
    availability: "now",
    example: "desktop",
    explanation:
      '⭑ _needDeviceType (default desktop) is a comma-separated list of compatible devices types. Note that "desktop" includes laptops. Anything not listed is deemed incompatible. If incompatible, we reject by issuing a fatal explanatory error message to the participant (asking Prolific participants to "return" this study), which ends the session before asking for consent. NOTE: The value "all" is not yet implemented. \nAfter compiling your experiment, copy the Requirements statement from the EasyEyes compiler page into your _online2Description to satisfy Prolific\'s rule that all study requirements be declared in the study\'s Description.',
    type: "multicategorical",
    default: "desktop",
    categories: "desktop, tablet, mobile",
  },
  {
    name: "_needDisplay",
    availability: "now",
    example: "hdrMovie",
    explanation:
      "🕑 _needDisplay (default empty) demands support (on the Requirements page) for key display features:\nHDRMovie: Browser must support HDR movies.\ntenBit: Display must support 10-bit imaging. https://trello.com/c/VxGHyxDa\ncodec: I'm not sure whether we should explicitly list the codecs we support or just write \"codec\" and have EasyEyes check that the browser supports at least one of the video codecs supported by EasyEyes. EasyEyes's list of compatible codecs may grow. \nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.\n\nNOTE ON CODEC COMPATIBILITY. Note that even if the browser supports HDR movies, it typically is compatible with only one video codec, which we might not support. Currently we support two video codecs, one supported by Chrome, the other by Safari. Currently we manage this compatibility by specifying the compatible browsers. To keep up with browsers that add support for more codecs, it might be better to specify compatible codecs. However, when we reject a participant's browser, it will be more helpful to tell the participant which browsers we support, rather than which codecs, because hardly anyone knows which browsers support any given codec. Ideally, EasyEyes would read an online table of which codecs each browsers supports to offer the participant an up-to-date list of compatible browsers. We can support any codec that FFMPEG supports, but it may require a bit of code that is custom to the codec.",
    type: "multicategorical",
    default: "",
    categories: "hdrMovie, tenBit",
  },
  {
    name: "_needDoNotDisturbBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needDoNotDisturbBool (default FALSE) if TRUE and the Requirements page gives approval (by showing the ✅) then EasyEyes displays a pop-up with a message (below) and an Ok button. When the button is clicked, the pop-up disappears. That’s it. The pop-up merely tells the participant to enable their computer's Do Not Disturb mode. We have no way of confirming that they did it.\n\nRC_DoNotDisturb\nDO NOT DISTURB. Avoid unwanted sounds and interruption of this study.\n\n On a Macintosh, near the right end of the menu bar, click the Control Center icon 🟰. Click “Focus”. Click “Do Not Disturb”.\n\n⊞ In Windows, select Start  > Settings  > System  > Notifications. Turn on “Do not disturb”.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_needIncognitoBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needIncognitoBool (default FALSE) requires that the browser window be in \"incognito\" mode. Alas Safari always returns FALSE, so this will reject Safari. (When we reject for not having incognito, many participants will try again, by starting again in a new incognito window. They need to know that EasyEyes can't detect incognito in Safari.) In general, EasyEyes includes only participants whose equipment is known to meet the scientist's stated needs (by _needXXX statements in the experiment spreadsheet). \nhttps://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/extension/inIncognitoContext",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_needMeasureMeters",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needMeasureMeters (default 0) requires that the participant be able to measure distance (in meters) up to _needMeasureMeters. When greater than zero, this requires that the participant have a meter stick or metric tape measure and type in the maximum length, in meters, that they can measure. (Use _canMeasureMeters to specify a default value for the participant's actual measuring capability, so it doesn't need to be typed on each run.)\n\nWe introduced this for development of multiple-monitor support. Initially we'll require a meter or two. Later, we'll use Google FaceMesh on each monitor's camera to minimize the need for manual measurement.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_needOperatingSystem",
    availability: "now",
    example: "macOS,Windows",
    explanation:
      "⭑ _needOperatingSystem (default all) is a comma-separated list either of compatible or incompatible operating systems. The list can be 'all', or compatible OSes by name, or incompatible OSes each preceded by \"not\". No mixing allowed. The default is 'all'. If compatible, then anything not listed is deemed incompatible. If incompatible, then anything not listed is deemed compatible. If not compatible, we reject by issuing a fatal explanatory error message to the participant (asking Prolific participants to \"return\" this study), which ends the session before asking for consent. After compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "multicategorical",
    default: "all",
    categories:
      "all, macOS, Windows, ChromeOS, ChromiumOS, AndroidOS, iOS, SamsungOS, KaiOS, NokiaOS, Series40OS, Linux, Ubuntu, FreeBSD, Debian, Fedora, Solaris, CentOS, Deepin, notmacOS, notWindows, notChromeOS, notChromiumOS, notAndroidOS, notiOS, notSamsungOS, notKaiOS, notNokiaOS, notSeries40OS, notLinux, notUbuntu, notFreeBSD, notDebian, notFedora, notSolaris, notCentOS, notDeepin",
  },
  {
    name: "_needPopupsBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needPopupsBool (default TRUE) requires pop-up window support in the browser. Most browsers allow the user to block or enable pop-ups. Some parts of EasyEyes (e.g. Remote Calibrator and sound calibration) use pop-ups extensively, and won't run if pop-ups are blocked. If _needPopupsBool==TRUE and pop-ups are blocked, the participant is alerted and is allowed to proceed if they enable pop-ups. Otherwise they cannot proceed beyond the Requirements page, and they are asked to return the study to Prolific.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_needProcessorCoresMinimum",
    availability: "now",
    example: "6",
    explanation:
      "⭑ _needProcessorCoresMinimum (default 4) tries to exclude slow computers without testing speed. The number of cores is a positive integer, also called \"hardwareConcurrency,\" whose value is returned by all modern browsers except Safari. For Safari, we estimate its value by doubling and rounding the rate (in MHz) at which the computer generates random numbers. https://en.wikipedia.org/wiki/Multi-core_processor\nUsing Prolific, our experiments are occasionally invoked on slow computers that produce late and prolonged stimuli. EasyEyes measures lateness and duration and reports them as targetMeasuredLatenessSec and targetMeasuredDurationSec in the CSV file. We find that setting _needProcessorCoresMinimum=6 nearly eliminated bad timing, but it also eliminates quite a few computers with good timing. You may prefer to set _needProcessorCoresMinimum lower, e.g. 4, to include most computers, and weed out the slow computers later, during data analysis, based on mean and SD of  targetMeasuredLatenessSec and targetMeasuredDurationSec. \nNOTE: To make your computer harder to track, the Chrome extension DuckDuckGo spoofs the number of cores to 2. Any experiment requiring 3 or more cores will reject any participant whose computer spoofs having 2 cores. \nHIGH REJECTION RATE: As of January 2024, our experiments requiring 6 cores have good timing but their Requirements page rejects about as many participants as it accept. EasyEyes records the reason for rejection\n\nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "integer",
    default: "4",
    categories: "",
  },
  {
    name: "_needRecordingControls",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needRecordingControls (default empty) is for sound recording. It's multicategorical and allows the scientist to demand control of echoCancellation, autoGainControl, and noiseSuppression. Not all browsers offer such control. We need to turn these features off for sound calibration because they seriously distort the recording. In principle we'd be happy with a rudimentary browser that didn't do these things, and thus wouldn't offer control over them, but in practice the industry norm is to do these things by default, so the only way to be sure a feature is off is for the browser to report control, and then to use that control to disable the feature. Our calibration code always tries to turn the features off, but some browsers will ignore the request. This need statement admits only browsers that support the requests.",
    type: "multicategorical",
    default: "",
    categories: "echoCancellation, autoGainControl, noiseSuppression",
  },
  {
    name: "_needScreenSizeMinimumPx",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needScreenSizeMinimumPx is just a placeholder in this Glossary; any value provided by the scientist is ignored. In each block, needScreenHeightDeg and needScreenWidthDeg are each combined with needTargetSizeDownToDeg to compute a needed screen resolution, which is enforced in the initial Requirements page. ",
    type: "integer",
    default: "",
    categories: "",
  },
  {
    name: "_needSmartphoneCheckBool",
    availability: "now",
    example: "",
    explanation:
      "_needSmartphoneCheckBool (default FALSE) if TRUE then the Requirements page uses a QR code to evaluate any needed phone. Once this works reliably then _needSmartphoneCheckBool will always be TRUE. As of May 2024, I'm setting this FALSE when I set needEasyEyesKeypadBeyondCm=50. It's my impression that it keeps losing the phone connection when it's combined with _needSmartphoneCheckBool=TRUE.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_needSmartphoneSurveyBool",
    availability: "now",
    example: "",
    explanation:
      "_needSmartphoneSurveyBool (default FALSE) if TRUE then the Requirements page uses a QR code (or link typed into browser) to identify a smartphone. EasyEyes saves the data, and proceeds. In a typical use, there is no calibration and no other data collection.\nIf _needSmartphoneSurveyBool then show RC_inDescription, followed by a space, followed by RC_surveyPhoneSurvey:\n”This study is surveying smartphones.”",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_needSmartphoneTooBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "🕑 If TRUE, _needSmartphoneTooBool (default FALSE) asks the participant if, in addition to whatever device is running the experiment, they have a smartphone available for use by EasyEyes (either for sound calibration or remote keypad). EasyEyes just asks, without verifying. Verification will happen later, when the QR code is shown to recruit the smartphone. \n[We have not yet considered, in the case of an experiment running on a smartphone, whether we could use its built-in mic to calibrate its loudspeaker, eliminating the need for a second device.] \nAfter compiling your experiment, copy the needs statement from the EasyEyes page into your _online2Description to satisfy Prolific's rule that all study requirements be declared in the study's Description.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_soundCalibrationDialogEstimatedSec",
    availability: "now",
    example: "",
    explanation:
      "_soundCalibrationDialogEstimatedSec (default 60) is used to predict for the user how long calibration will take. The prediction is the sum _soundCalibrationDialogEstimatedSec + soundCalibrationMeasurementEstimatedSec, where \nsoundCalibrationMeasurementEstimatedSec = 57 + 6 * _calibrateSoundBurstMLSVersions * _calibrateSoundBurstRepeats * _calibrateSoundBurstSec.",
    type: "numerical",
    default: "60",
    categories: "",
  },
  {
    name: "_needTimingToleranceSec",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needTimingToleranceSec (default 0.05) is the largest acceptable RMS error in generating a 0.15-second interval. We suspect that this depends on both the CPU speed and the number of processes being timeshared, and thus can be reduced by closing other browser windows, and quitting other apps. In practice, we discovered that requiring 6 cpu cores (_needProcessorCoresMinimum) has eliminated bad timing. (Currently our experiments reject about as many participants as they accept. I suspect this is due to the cores requirement. We currently have no data on participants rejected by the Requirements page. We're changing that to get data on the rejected computers, so we can figure out why they're rejected.) We prefer that solution because the participant can understand in a study description that we need a certain number of cores (and can check themselves), whereas they can't check timing themselves. We try to minimize the number of participants that we turn away at the Nees page (to not waste their time, and to avoid creating a situation where participants try to work around the Requirements page limits), so it's better to require things that allow participants to assess elibility themselves, before reaching the Requirements page.",
    type: "numerical",
    default: "0.05",
    categories: "",
  },
  {
    name: "_needWeb",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needWeb (no default) is a comma-separated list of web features (APIs and dictionary properties) that the browser must provide, e.g. WakeLock, echoCancellation. Web feature support depends on the browser, not the OS or hardware platform. Most of the _needWeb features are supported by most current browsers, so the participant typically can add support for a needed web feature by updating their browser or switching to the Chrome browser. For a list of compatible browsers, search for the feature in https://developer.mozilla.org/, and consult the compatibility table at the bottom of the page. The easy compatibility check just asks the browser if a feature is supported. However, that can be misleading because browsers disable features for various reasons, including low battery. Since any feature requested here might be mission-critical, if the browser says it's available, we should also confirm that we can actually set it. That might take a second, and it's worth it.\n\nThe need for these features in EasyEyes is asymmetric. Test only the features selected by the parameter arguments, and test only that we can enable WakeLock, and disable echoCancellation, noiseSuppression, and autoGainControl. It's fine to test them all together in a batch, we won't use them independently. I bet that ChatGPT, if asked, will write the code we need.",
    type: "categorical",
    default: "",
    categories: "WakeLock, echoCancellation, noiseSuppression, autoGainControl",
  },
  {
    name: "_needWebPhone",
    availability: "now",
    example: "",
    explanation:
      "🕑 _needWebPhone (no default) is a comma-separated list of needed web features (APIs and dictionary properties) that the browser of the attached phone must provide, e.g. WakeLock, echoCancellation. The rest of this explanation is identical to that for _needWeb, above.",
    type: "categorical",
    default: "",
    categories: "WakeLock, echoCancellation, noiseSuppression, autoGainControl",
  },
  {
    name: "_online1InternalName",
    availability: "now",
    example: "",
    explanation:
      '_online1InternalName [Prolific "Give your study an internal name (only visible to you)"] (default is beginning of your study URL: net id and experiment name) specifies the internal name, as a text string, instead of letting Prolific assign it from your study URL. ',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_online1RecruitmentService",
    availability: "now",
    example: "Prolific",
    explanation:
      '⭑ _online1RecruitmentService (default none). Name of recruitment service: Prolific, SONA, MTurk.  The key idea is two URLs that carry parameters. The Study URL (a link to our experiment) carries parameters provided by the recruitment service (e.g. Prolific). The Completion URL (a link to the completion page of the recruitment service) carries the completion code certifying that the participant completed the study. \nnone - Just produce a study URL.\nProlific - integrate with Prolific, which is suggested by the PsychoPy manual. https://www.psychopy.org/online/prolificIntegration.html\nNOT YET IMPLEMENTED: MTurk - currently equivalent to "none".\nNOT YET IMPLEMENTED: SONA - currenlty equivalent to "none".',
    type: "categorical",
    default: "none",
    categories: "none, Prolific",
  },
  {
    name: "_online1Title",
    availability: "now",
    example: "Vision test",
    explanation:
      '⭑ _online1Title [Prolific "What is the title of your study?"] (default is "***") is the brief title for this study that will be used to recruit new participants. In deciding whether to participate, potential participants will consider _online1Title, _online2PayPerHour, _online2Minutes, and _online2Description. Participants often mention selecting my study by how interesting it sounds and by its pay per hour.',
    type: "text",
    default: "***",
    categories: "",
  },
  {
    name: "_online2Description",
    availability: "now",
    example: "",
    explanation:
      '⭑ _online2Description [Prolific "Describe what participants will be doing in this study."] (default is "***") is a (typically long) description of the study, used to recruit new participants. In deciding whether to participate, Prolific members will consider _online0Title, _online2Pay, _online2Minutes, and _online2Description. However, several Prolific participants told me that when the pay exceeds $15/hour, the jobs are filled quickly, so they often accept these without reading the study description. So you might want to have your study verify that participants actually satisfy any requirements stated in your description. The EasyEyes _needXXX parameters may be helpful in this regard. IMPORTANT: Prolific\'s recruitment policy demands advance statement of the study\'s requirements before the participant accepts. Thus any _needXXX should be mentioned in your study\'s Description in Prolific, which is copied from this parameter. EasyEyes helps you to do this, by offering a plain English statement of the needs on the scientist page that you can copy and include here.',
    type: "text",
    default: "***",
    categories: "",
  },
  {
    name: "_online2Minutes",
    availability: "now",
    example: "30",
    explanation:
      '⭑ _online2Minutes [Prolific "How long will your study take to complete?"] (default 0) is the expected study duration, in minutes, in your offer to each potential participant. EasyEyes uses a rule of thumb to estimate the duration of your study and displays it on the scientist page so you can copy it and paste it here. In deciding whether to participate, potential participants will consider _online2PayPerHour, _online0Title, _online2Description, and _online2Minutes. The total payment is fixed when the study begins. If the median duration of your study is much greater than your estimate then Prolific will invite you to proportionally increase the pay. But we suspect that participants are happier if your time estimate is accurate, because that makes the deal businesslike, whereas the increase, since it\'s not enforced, may seem like charity.',
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_online2Participants",
    availability: "now",
    example: "20",
    explanation:
      '⭑ _online2Participants [Prolific "Recruit participants"] (default 1) Number of people you want to test.',
    type: "integer",
    default: "1",
    categories: "",
  },
  {
    name: "_online2Pay",
    availability: "now",
    example: "7.5",
    explanation:
      '_online2Pay [Prolific "How much do you want to pay them?"] USE _online2PayPerHour INSTEAD BECAUSE THAT\'S WHAT PARTICIPANTS CARE ABOUT MOST. _online2Pay (default zero) specifies the payment (a number) to offer to each participant. The currency is specified by _online2PayCurrency.  If _online2Pay and _online2PayPerHour are both nonzero, then the participant is offered the sum of the two contributions.  In deciding whether to participate, potential participants mainly consider _online2PayPerHour, _online0Title, _online2Description, and _online2Minutes. Some participants mentioned selecting my study because it seemed interesting. Others said that in their rush to sign up for $15/hour studies, they often skip the description. ',
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_online2PayCurrency",
    availability: "now",
    example: "GBP",
    explanation:
      "🕑 _online2PayCurrency (default USD) specifies the currency of the payment: US Dollars (USD) or Great Britain Pounds (GBP). Prolific has no API to change this, but EasyEyes will confirm that Prolific is using the currency declared by _online2PayCurrency. Prolific allows your user account to be in USD or GBP, and can change an account's currency in response to a written request, but only rarely. Some users of EasyEyes will be in UK and will likely prefer to pay Prolific and participants in GBP. EasyEyes can't change Prolific's choice of currency, but by setting this parameter you can ask EasyEyes to make sure that Prolific is using the currency assumed by your spreadsheet. If not, then EasyEyes will flag this as a fatal error before deployment. You can then fix the currency in your experiment, and adjust the numeric pay to provide the desired compensation. ",
    type: "categorical",
    default: "USD",
    categories: "USD, GBP",
  },
  {
    name: "_online2PayPerHour",
    availability: "now",
    example: "15",
    explanation:
      '⭑ _online2PayPerHour (default zero) specifies the hourly rate (a number) that determines (with _online2Minutes) the payment offered to each participant. [In Prolific, EasyEyes computes and fills in "How much do you want to pay them?"] The currency is specified by _online2PayCurrency. If _online2Pay and _online2PayPerHour are both nonzero, then the participant is offered the sum of the two contributions. The pay is specified with two decimals (e.g. 11.01), rounding up to the next cent, so the hourly rate offered will never be less than specified by the experiment. Prolific lists the study titles and pay per hour for selection by prospective participants. Some participants mentioned selecting my study because it seemed interesting. Others said that in their rush to sign up for $15/hour studies, they often skip the description. ',
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_participantIDGetBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "_participantIDGetBool (default FALSE). Multi-session experiments require a way to link a participant's several sessions. When _participantIDGetBool is TRUE, we ask the participant to provide their EasyEyesID from a previous session. To facilitate this, EasyEyes checks for the most recent EasyEyesID cookie, and, if found, offers it to the participant for approval. The participant can approve this (if found), or select an EasyEyesID file from the computer's disk, or type in an EasyEyesID, or type in any ASCII alphanumeric string (also allowing underscore, dash, and period) without whitespace to use as their EasyEyesID. If EasyEyes cannot get an EasyEyesID, it exits the experiment. A participant who moves from one computer to another during the experiment should take an EasyEyesID file with them, or write down the EasyEyesID. Also see _participantIDPutBool below.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_participantIDPutBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "_participantIDPutBool (default FALSE). EasyEyes always saves an EasyEyesID cookie in browser local storage (which can be lost when participants clear browsing history etc.). If _participantIDPutBool is TRUE, then an EasyEyesID text file is also saved in the Downloads Folder of the  participant's computer. Also see _participantIDGetBool above.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_pavlovia_Database_ResultsFormatBool",
    availability: "now",
    example: "",
    explanation:
      "_pavlovia_Database_ResultsFormatBool (default FALSE) allows the scientist to select which results format Pavlovia will use when reporting the results of this experiment. After the participants run the experiment, Pavlovia's \"Database\" results format returns one merged CSV file with all participant results. The alternative \"CSV\" results format returns one CSV file for each participant.\n\nIMPLEMENTATION. As the experiment is compiled (into a newly created repository in Pavlovia bearing the experiment's name), the compiler will use the current value (default or assigned) of _pavlovia_Database_ResultsFormatBool to set the Results Format in the experiment's Pavlovia dashboard to either “CSV” or “Database”.\n\nTHIS WAS IMPLEMENTED TO WORK AROUND A TEMPORARY PROBLEM (March 26 to April 18, 2024) IN PAVLOVIA'S CSV RESULTS FORMAT: Pavlovia’s CSV results format was broken, so that in columns after \"targeTask\" (roughly the 37th), the headers are one row down and begin again from the first header. Pavlovia’s Database results format is fine. Since the problem was fixed on April 18, the default of _pavlovia_Database_ResultsFormatBool is FALSE.\n\nSPLITTING THE DATABASE FORMAT. The EasyEyes “Download results” button has been enhanced to download either kind of CSV file, as appropriate, and split any “Download”-style merged CSV into individual CSV files, practically equivalent to the CSV files that were returned by the “CSV”-mode when it worked properly.\n\nMANUAL OVERRIDE. We can't think of a reason to do so, but the scientist can use the manual control in the Pavlovia dashboard to change the experiment's results format, overriding whatever was selected in the experiment spreadsheet.\n\nNOTE: To download a cursor file (_saveCursorPositionBool=TRUE), Pavlovia must use the CSV results format (_pavlovia_Database_ResultsFormatBool=FALSE, the default). Otherwise the cursor data file will not appear. At some point we'll enhance the compiler to raise an error when both are true.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_pavloviaPreferRunningModeBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "_pavloviaPreferRunningModeBool helps EasyEyes optimize its behavior by indicating your preference for use of RUNNING or PILOTING mode while testing. Pavlovia offers two modes (RUNNING and PILOTING) for running your study. Remote data collection requires RUNNING mode. PILOTING mode is meant for checking and debugging and runs only from the Pavlovia console on the scientist's computer. The only advantage of the PILOTING mode is that it's always free. Unless your institution has a Pavlovia site license, RUNNING mode costs 20 pence per participant, and requires assigning tokens (money) in advance to each experiment. (Setting _compileAsNewExperiment=FALSE allows you to request that EasyEyes keep reusing the same experiment name, as you compile new versions, so you can assign tokens once to the experiment, when you begin testing, instead of before each compile.) Thus scientists with a site license will always prefer RUNNING mode. Without that license, scientists can save money by using PILOTING mode during development, and switch to RUNNING mode to test remote participants. _pavloviaPreferRunningModeBool allows you to express your preference. With an institutional site license, you'll always want the default TRUE. Without an institutional site license, you can save money by setting _pavloviaPreferRunningModeBool=FALSE during development, and TRUE for the actual remote testing. Without a site license, if you don't mind the 20 p expense, you can use RUNNING mode throughout (use the default _pavloviaPreferRunningModeBool=TRUE), and set _compileAsNewExperiment=FALSE to minimize the frequency at which you must assign tokens to the experiment.\n\nOLD EXPLANATION. Setting _pavloviaPreferRunningModeBool TRUE (the default) streamlines the use of Pavlovia's RUNNING mode, and setting it FALSE streamlines the use of Pavlovia's PILOTING mode. _pavloviaPreferRunningModeBool helps EasyEyes anticipate your preference in optimizing the EasyEyes user interface. EasyEyes uses a Pavlovia repository to hold your experiment. Pavlovia offers two modes for running your experiment, PILOTING and RUNNING. PILOTING mode is free, but can only be run directly from the Pavlovia dashboard, which prevents remote testing. RUNNING mode costs 20 pence per participant (this fee is waived if your instititution has a site license), and you get a URL for your study that you can send to your online participants. It is our guess that most EasyEyes users (like current Pavlovia users) will belong to institutions with Pavlovia site licenses, and thus have no usage fee. Thus, for most users, we suggest letting _pavloviaPreferRunningModeBool be TRUE (the default) to streamline the EasyEyes scientist page for RUNNING mode. When _pavloviaPreferRunningModeBool is TRUE, you just submit your table to the EasyEyes compiler to receive your study URL, with no more clicks. That includes setting your experiment to RUNNING mode in Pavlovia. If _pavloviaPreferRunningModeBool is FALSE, then your experiment remains in the INACTIVE mode, waiting for you to click the \"Go to Pavlovia\" button, where you'll use the Pavlovia dashboard to set your experiment to PILOTING mode and run it. (Pavlovia has no API by which EasyEyes could do this for you.) If your experiment is already in RUNNING mode you can still switch to PILOTING mode. Thus _pavloviaPreferRunningModeBool doesn't close any doors; it just streamlines use of your usually preferred mode.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_pavloviaSavePartialResultsBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 _pavloviaSavePartialResultsBool (default TRUE) determines whether partial results are saved. This is a feature in Pavlovia that should be enabled or disabled by EasyEyes using the Pavlovia API. Pavlovia (and EasyEyes) charges one token per saved session. Incomplete sessions are free if they are not saved.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_prolific0TraceBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 ON HOLD. _prolific0TraceBool (default FALSE), when TRUE, if EasyEyes was called by Prolific (i.e. if Prolific user ID is not empty), then EasyEyes, before initializing PsychoJS, immediately saves a small “prolific” CSV file in the experiment’s Pavlovia repo. Each such file is a breadcrumb, helping us trace the path of a participant. The filename is \nprolific-SSS-UUU.csv \nwhere SSS and UUU are replaced by the Prolific session and user IDs. The file includes: experiment name, Prolific user and session IDs, computer operating system (and version), and browser (and version). (The “prolific” file is created before initializing PsychoJS, so the Pavlovia session ID doesn’t exist yet.) When Prolific reports that the experiment is done, the scientist can compare the list of “prolific” filenames (in the experiment's Pavlovia repo) with the list of user IDs in Prolific’s Demographic data file. For any Prolific user ID lacking a results CSV in the Pavlovia repo, the scientist can examine their “prolific” file. This could help discover a browser version that breaks EasyEyes before it initializes PsychoJS.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_prolific1ProjectID",
    availability: "now",
    example: "",
    explanation:
      "⭑ _prolific1ProjectID. To use Prolific with EasyEyes, you must figure out whether your Prolific account is in the new (since mid-2022) \"Workspace\" mode or it's older non-Workspace mode (which may become obsolete). \nhttps://researcher-help.prolific.co/hc/en-gb/articles/4500057146140-Workspaces-\nBefore Prolific's Workspace mode arrived, there was no Project ID. In Workspace mode you assign funds to a folder which has a name and a project ID (a roughly 24-digit hexadecimal number). You can have multiple studies in one project folder; they all share the same project ID. If your experiment table includes an _prolific1ProjectID number, then EasyEyes will use it and call Prolific in Workspace mode. If _prolific1ProjectID is empty or absent, then EasyEyes will call Prolific in pre-Workspace mode.  If you provide a wrong Project ID then you'll get an invalid address (404) when EasyEyes tries to access your Prolific workspace. EasyEyes assumes that Prolific is locked into one mode or the other. (In fact, Prolific allows you to upgrade your Prolific account from pre-Workspace into Workspace mode, but you cannot downgrade, which is fine since Workspace mode is better.) If EasyEyes calls Prolific in the wrong mode, the call fails to transfer vital information for your study, which you'll notice when you try to publish your study in Prolific. Currently EasyEyes can't tell which mode your Prolific account is in, and expects you to provide a _prolific1ProjectID if and only if Prolific is in Workspace mode. So if you arrive in Prolific, and find Prolific ignorant of your study, you probably guessed wrong about the mode of your Prolific account. Does your study in Prolific have a Prolific Project ID? If yes, then your Prolific account is in Workspace mode, otherwise not. You can run all studies with the same _prolific1ProjectID, or have several projects eash with their own _prolific1ProjectID.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_prolific2DeviceKind",
    availability: "now",
    example: "",
    explanation:
      '⭑ _prolific2DeviceKind (default desktop) [Prolific "Which devices can participants use to take your study?"] is a comma-separated list of acceptable answers (see Categories) to this Prolific query:\nWhich devices can participants use to take your study?\nmobile\ntablet\ndesktop\nThe parameter value will be a comma-separated list of none to all of: mobile, tablet, desktop.',
    type: "multicategorical",
    default: "desktop",
    categories: "mobile, tablet, desktop",
  },
  {
    name: "_prolific2RequiredServices",
    availability: "now",
    example: "",
    explanation:
      '⭑ _prolific2RequiredServices (no default) [Prolific "Does your study require any of the following?"] (no default) is a comma-separated list of study requirements (see Categories) corresponding to this Prolific query:\nDoes your study require any of the following?\nAudio\nCamera\nMicrophone\nDownloads software\nThe parameter value will be a comma-separated list of none to all of: Audio, Camera, Microphone, Downloads software',
    type: "multicategorical",
    default: "",
    categories: "audio, camera, microphone, download",
  },
  {
    name: "_prolific2ScreenerSet",
    availability: "now",
    example: "",
    explanation:
      "🕑 _prolific2ScreenerSet (default none) allows you, the scientist, to provide the name of a screener set that you created in Prolific. This gives you immediate access to all Prolific parameters, as soon as they appear on Prolific. Using a screener set causes Prolific to ignore all other screener requests, including all the EasyEyes _prolific3XXX and _prolific4XXX parameters. The twenty EasyEyes _prolific3XXX and _prolific4XXX parameters are useful, but represent only a small fraction of the screeners offered by Prolific.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_prolific2StudyLabel",
    availability: "now",
    example: "",
    explanation:
      "🕑 _prolific2StudyLabel (default empty) provides an optional label (from Prolific's growing list) to help participants select a study.",
    type: "categorical",
    default: "",
    categories: "Survey, Writing task, Annotation, Interview, Other",
  },
  {
    name: "_prolific2SubmissionApproval",
    availability: "now",
    example: "",
    explanation:
      '_prolific2SubmissionApproval (default manual) [Prolific "How do you want to confirm participants have completed your study?") (default "manual") declares to Prolific whether evaluation of the  participant submissions (performance of the study) will be manual (the EasyEyes default) or automatic.',
    type: "categorical",
    default: "automatic",
    categories: "manual, automatic",
  },
  {
    name: "_prolific3AllowAfterHours",
    availability: "now",
    example: "",
    explanation:
      "🕑 _prolific3AllowAfterHours (default 0) requires that at least the specified (floating) number of hours pass since completion of the _prolific3AllowCompletedExperiment before the participant’s ID is added to the allowList.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "_prolific3AllowCompletedExperiment",
    availability: "now",
    example: "",
    explanation:
      "🕑 _prolific3AllowCompletedExperiment (default empty) specifies a comma-separated list of experiments (typically just one) in your Pavlovia account. (The compiler will check the experiment names.) A minimum time _prolific3AllowAfterHours after a participant completes (or has completed) one or more of the named experiments, EasyEyes will add their Prolific participant ID to the current experiment’s allowList. Adding continues until the new experiment completes. If _prolific3AllowCompletedExperiment is not empty, then participants are recruited solely through the allowList. If _prolific3CustomAllowList is not empty, then it adds its IDs to the allowList.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_prolific3ApprovalRate",
    availability: "now",
    example: "",
    explanation:
      '🕑 _prolific3ApprovalRate [Prolific "Approval rate"] (default 0,100) is a comma-separated list of two numbers (each in the range 0 to 100) that specify the minimum and maximum acceptable precent approval rate of the participant. \nApproval Rate\nApproval rate is the percentage of studies for which the participant has been approved. We use the upper bound of the 95% confidence interval to calculate approval rate.\n\nCreate a range using the sliders below:\n———————————\nMinimum Approval Rate: 0, Maximum Approval Rate: 100 (inclusive)',
    type: "text",
    default: " 0,100",
    categories: "",
  },
  {
    name: "_prolific3CustomAllowList",
    availability: "now",
    example: "",
    explanation:
      '_prolific3CustomAllowList [Prolific "Custom allowlist"] (no default) is a comma-separated list of Prolific participant IDs. ONLY these participants will be eligible for this study, unless _prolific3AllowCompletedExperiment is not empty, in which case both contribute to the allowList of participants.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_prolific3CustomBlockList",
    availability: "now",
    example: "",
    explanation:
      '_prolific3CustomBlockList [Prolific "Custom blocklist"] (no default) is a comma-separated list of Prolific participant IDs who will not be invited to this study.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_prolific3Location",
    availability: "now",
    example: "",
    explanation:
      '_prolific3Location [Prolific "Location"] (default All countries available) is a comma-separated list of acceptable answers (see Categories) to this Prolific query:\nLocation\nWhere should your participants be located?\nAll countries available\nUSA\nUK\n...\nThe answer can include many countries, which are combined by an OR rule.\nNOTE: _prolific3Location accepts "Venezuela" which is automatically converted to Prolific\'s "Venezuela, Bolivarian Republic of". ',
    type: "multicategorical",
    default: "All countries available",
    categories:
      "All countries available, USA, UK, Ireland, Germany, France, Spain, Afghanistan, Aland Islands, Albania, Algeria, American Samoa, Andorra, Angola, Anguilla, Antarctica, Antigua and Barbuda, Argentina, Armenia, Aruba, Australia, Austria, Azerbaijan, Bahamas, Bahrain, Bangladesh, Barbados, Belarus, Belgium, Belize, Benin, Bermuda, Bhutan, Bolivia, Bonaire, Bosnia and Herzegovina, Botswana, Bouvet Island, Brazil, British Indian Ocean Territory, Brunei Darussalam, Bulgaria, Burkina Faso, Burundi, Cambodia, Cameroon, Canada, Cape Verde, Cayman Islands, Central African Republic, Chad, Chile, China, Christmas Island, Cocos (Keeling) Islands, Colombia, Comoros, Congo, Congo the Democratic Republic of the, Cook Islands, Costa Rica, Cote d'Ivoire, Croatia, Cuba, Curacao, Cyprus, Czech Republic, Denmark, Djibouti, Dominica, Dominican Republic, Ecuador, Egypt, El Salvador, Equatorial Guinea, Eritrea, Estonia, Ethiopia, Falkland Islands (Malvinas), Faroe Islands, Fiji, Finland, French Guiana, French Polynesia, French Southern Territories, Gabon, Gambia, Georgia, Ghana, Gibraltar, Greece, Greenland, Grenada, Guadeloupe, Guam, Guatemala, Guernsey, Guinea, Guinea-Bissau, Guyana, Haiti, Heard Island and McDonald Islands, Holy See (Vatican City State), Honduras, Hong Kong, Hungary, Iceland, India, Indonesia, Iran, Iraq, Isle of Man, Israel, Italy, Jamaica, Japan, Jersey, Jordan, Kazakhstan, Kenya, Kiribati, Korea, Kuwait, Kyrgyzstan, Lao People's Democratic Republic, Latvia, Lebanon, Lesotho, Liberia, Libya, Liechtenstein, Lithuania, Luxembourg, Macao, Macedonia, Madagascar, Malawi, Malaysia, Maldives, Mali, Malta, Marshall Islands, Martinique, Mauritania, Mauritius, Mayotte, Mexico, Micronesia, Moldova, Monaco, Mongolia, Montenegro, Montserrat, Morocco, Mozambique, Myanmar, Namibia, Nauru, Nepal, Netherlands, New Caledonia, New Zealand, Nicaragua, Niger, Nigeria, Niue, Norfolk Island, Northern Mariana Islands, Norway, Oman, Pakistan, Palau, Palestinian Territory, Panama, Papua New Guinea, Paraguay, Peru, Philippines, Pitcairn, Poland, Portugal, Puerto Rico, Qatar, Reunion, Romania, Russian Federation, Rwanda, Saint Barthelemy, Saint Helena, Saint Kitts and Nevis, Saint Lucia, Saint Martin (French part), Saint Pierre and Miquelon, Saint Vincent and the Grenadines, Samoa, San Marino, Sao Tome and Principe, Saudi Arabia, Senegal, Serbia, Seychelles, Sierra Leone, Singapore, Sint Maarten (Dutch part), Slovakia, Slovenia, Solomon Islands, Somalia, South Africa, South Georgia and the South Sandwich Islands, South Sudan, Sri Lanka, Sudan, Suriname, Svalbard and Jan Mayen, Swaziland, Sweden, Switzerland, Syrian Arab Republic, Taiwan, Tajikistan, Tanzania, Thailand, Timor-Leste, Togo, Tokelau, Tonga, Trinidad and Tobago, Tunisia, Turkey, Turkmenistan, Turks and Caicos Islands, Tuvalu, Uganda, Ukraine, United Arab Emirates, United States Minor Outlying Islands, Uruguay, Uzbekistan, Vanuatu, Venezuela, Vietnam, Wallis and Futuna, Western Sahara, Yemen, Zambia, Zimbabwe",
  },
  {
    name: "_prolific3ParticipantInPreviousStudyExclude",
    availability: "now",
    example: "",
    explanation:
      '🕑 _prolific3ParticipantInPreviousStudyExclude [Prolific "Exclude participants from previous studies"] (no default) is a comma-separated list of Experiment names (Prolific internal study names) in response to this Prolific prescreening query:\nExclude participants from previous studies. This screener will exclude all participants from the selected studies regardless of their submission status. Please note this list only includes studies which are completed. Read about how to prevent certain participants from accessing your study.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_prolific3ParticipantInPreviousStudyInclude",
    availability: "now",
    example: "",
    explanation:
      '🕑 _prolific3ParticipantInPreviousStudyInclude [Prolific "Include participants from previous studies"] (no default) is a comma-separated list of Experiment names (Prolific internal study names)  in response to this Prolific prescreening query:\nInclude participants from previous studies. Only participants with approved submissions will be included. To add participants whose responses weren\'t approved, please instead use a custom allowlist. Please note this list only includes studies which are completed. Read about how to invite specific participants to your study.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "_prolific3StudyDistribution",
    availability: "now",
    example: "",
    explanation:
      '🕑 _prolific3StudyDistribution [Prolific "Study distribution"] (default Standard sample) is a comma-separated list of acceptable answers (see Categories) to this Prolific query:\nStudy distribution. How do you want to distribute your sample?\nRepresentative sample\nBalanced sample\nStandard sample\nApparently "Representative sample" is automatically assigned to either UK or USA.\nThe scientist chooses a sample of participants that is one of: Representative of USA or UK, Balanced 50/50 between sexes, or Standard (whoever is available). Prolific charges more for representative samples.',
    type: "categorical",
    default: "Standard sample",
    categories: "Representative sample, Balanced sample, Standard sample",
  },
  {
    name: "_prolific4CochlearImplant",
    availability: "now",
    example: "",
    explanation:
      '_prolific4CochlearImplant [Prolific "Cochlear implant"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nCochlear implant\nParticipants were asked the following question: Do you have a cochlear implant?\nYes\nNo\nRather not say',
    type: "multicategorical",
    default: "",
    categories: "Yes, No, Rather not say",
  },
  {
    name: "_prolific4Dyslexia",
    availability: "now",
    example: "",
    explanation:
      '_prolific4Dyslexia [Prolific "Dyslexia"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nDyslexia\nParticipants were asked the following question: Have you received a medical diagnosis for dyslexia?\n\nYes, I have been medically diagnosed with dyslexia\nNo, but I am in the process of being diagnosed\nNo, but I strongly suspect I have undiagnosed dyslexia\nNo\nRather not say\nThe value will be a comma-separated list of none or any number of: diagnosed, being diagnosed, suspect but undiagnosed, no, not saying',
    type: "multicategorical",
    default: "",
    categories: "diagnosed, being diagnosed, suspect, no, not saying",
  },
  {
    name: "_prolific4HearingDifficulties",
    availability: "now",
    example: "",
    explanation:
      '_prolific4HearingDifficulties [Prolific "Hearing difficulties"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nHearing difficulties\nParticipants were asked the following question: Do you have any hearing loss or hearing difficulties?\nYes\nNo\nRather not say\n• The parameter value will be a comma-separated list of: Yes, No, Rather not say.',
    type: "multicategorical",
    default: "",
    categories: "Yes, No, Rather not say",
  },
  {
    name: "_prolific4LanguageFirst",
    availability: "now",
    example: "",
    explanation:
      '_prolific4LanguageFirst [Prolific "First language"] (no default) is a comma-separated list of acceptable languages. Prolific uses OR to combine values within a parameter, and AND to combine across parameters. Prolific is international but based in UK; Enlish is the native language of a large fraction of their participants.',
    type: "multicategorical",
    default: "",
    categories:
      "Afrikaans, Albanian, Amharic, Arabic, Armenian, Basque, Belarusian, Bengali, Bulgarian, Burmese, Cantonese, Catalan, Chinese, Croatian, Czech, Danish, Dari, Dutch, Dzongkha, English, Esperanto, Estonian, Faroese, Farsi, Finnish, French, Gaelic, Galician, Georgian, German, Greek, Gujarati, Hakka, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Inuktitut, Italian, Japanese, Khmer, Korean, Kurdish, Laotian, Lappish, Latvian, Lithuanian, Macedonian, Malay, Malayalam, Maltese, Mandarin, Nepali, Norwegian, Papiamento, Pashto, Polish, Portuguese, Punjabi, Romanian, Russian, Scots, Serbian, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish, Tagalog-Filipino, Tajik, Tamil, Telugu, Thai, Tibetan, Tigrinya, Tongan, Turkish, Turkmen, Twi, Ukrainian, Urdu, Uzbek, Vietnamese, Welsh, Other",
  },
  {
    name: "_prolific4LanguageFluent",
    availability: "now",
    example: "",
    explanation:
      '_prolific4LanguageFluent [Prolific "Fluent languages"] (no default) is a comma-separated list of acceptable languages. Prolific uses OR to combine values within a parameter, and AND to combine across parameters. Prolific is international but based in UK; Enlish is the native language of a large fraction of their participants.',
    type: "multicategorical",
    default: "",
    categories:
      "Afrikaans, Albanian, Amharic, Arabic, Armenian, Basque, Belarusian, Bengali, Bulgarian, Burmese, Cantonese, Catalan, Chinese, Croatian, Czech, Danish, Dari, Dutch, Dzongkha, English, Esperanto, Estonian, Faroese, Farsi, Finnish, French, Gaelic, Galician, Georgian, German, Greek, Gujarati, Hakka, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Inuktitut, Italian, Japanese, Khmer, Korean, Kurdish, Laotian, Lappish, Latvian, Lithuanian, Macedonian, Malay, Malayalam, Maltese, Mandarin, Nepali, Norwegian, Papiamento, Pashto, Polish, Portuguese, Punjabi, Romanian, Russian, Scots, Serbian, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish, Tagalog-Filipino, Tajik, Tamil, Telugu, Thai, Tibetan, Tigrinya, Tongan, Turkish, Turkmen, Twi, Ukrainian, Urdu, Uzbek, Vietnamese, Welsh, Other",
  },
  {
    name: "_prolific4LanguagePrimary",
    availability: "now",
    example: "",
    explanation:
      '_prolific4LanguagePrimary [Prolific "Primary language"] (no default) is a comma-separated list of acceptable languages. Prolific uses OR to combine values within a parameter, and AND to combine across parameters. Prolific is international but based in UK; Enlish is the native language of a large fraction of their participants.',
    type: "multicategorical",
    default: "",
    categories:
      "Afrikaans, Albanian, Amharic, Arabic, Armenian, Basque, Belarusian, Bengali, Bulgarian, Burmese, Cantonese, Catalan, Chinese, Croatian, Czech, Danish, Dari, Dutch, Dzongkha, English, Esperanto, Estonian, Faroese, Farsi, Finnish, French, Gaelic, Galician, Georgian, German, Greek, Gujarati, Hakka, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Inuktitut, Italian, Japanese, Khmer, Korean, Kurdish, Laotian, Lappish, Latvian, Lithuanian, Macedonian, Malay, Malayalam, Maltese, Mandarin, Nepali, Norwegian, Papiamento, Pashto, Polish, Portuguese, Punjabi, Romanian, Russian, Scots, Serbian, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish, Tagalog-Filipino, Tajik, Tamil, Telugu, Thai, Tibetan, Tigrinya, Tongan, Turkish, Turkmen, Twi, Ukrainian, Urdu, Uzbek, Vietnamese, Welsh, Other",
  },
  {
    name: "_prolific4LanguageRelatedDisorders",
    availability: "now",
    example: "",
    explanation:
      '_prolific4LanguageRelatedDisorders [Prolific "Language related disorders"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nDo you have any language related disorders?\nreading difficulty\nwriting difficulty\nother language related disorder\nnone\nnot applicable',
    type: "multicategorical",
    default: "",
    categories:
      "reading difficulty, writing difficulty, other language related disorder, none, not applicable",
  },
  {
    name: "_prolific4MusicalInstrumentExperience",
    availability: "now",
    example: "",
    explanation:
      '_prolific4MusicalInstrumentExperience [Prolific "Experience with musical instruments"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nExperience with musical instruments\nParticipants were asked the following question: Do you play a musical instument, if so for how many years?\n\nNo. I don\'t play a musical instrument\nYes. For 0-1 years.\nYes. For 1-2 years.\nYes. For 2-3 years.\nYes. For 3-4 years.\nYes. For 5+ years.',
    type: "multicategorical",
    default: "",
    categories: "No, 0-1, 1-2, 2-3, 3-4, 5+",
  },
  {
    name: "_prolific4PhoneOperatingSystem",
    availability: "now",
    example: "",
    explanation:
      "_prolific4PhoneOperatingSystem [Prolific \"Phone operating system\"] is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nPhone Operating System\nParticipants were asked the following question: What operating system (OS) does your primary mobile phone have?\nAndroid\niOS (iPhone)\nWindows\nOther/Not Applicable\nDon't Know\n\nNOTE: This selector is in the _prolific4 group because it's important for EasyEyes sound experiments. EasyEyes uses the participant's smartphone to calibrate the loudspeaker of the participant's desktop computer.\n",
    type: "multicategorical",
    default: "",
    categories: "Android, iOS, Windows, Other, Don't Know",
  },
  {
    name: "_prolific4Vision",
    availability: "now",
    example: "",
    explanation:
      '_prolific4Vision [Prolific "Vision"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nVision. Do you have normal or corrected-to-normal vision?\nYes\nNo\nRather not say\n• The parameter value will be a comma-separated list of: Yes, No, Rather not say.',
    type: "multicategorical",
    default: "",
    categories: "Yes, No, Rather not say",
  },
  {
    name: "_prolific4VisionCorrection",
    availability: "now",
    example: "",
    explanation:
      '_prolific4VisionCorrection [Prolific "Corrected vision"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nCorrected vision\nParticipants were asked the following question: I currently use glasses or contact lenses to correct my vision\nI mainly use glasses\nI mainly use contact lenses\nI use both glasses and contact lenses\nI do not use glasses or contact lenses',
    type: "multicategorical",
    default: "",
    categories: "glasses, contacts, both, neither",
  },
  {
    name: "_prolific4VRExperiences",
    availability: "now",
    example: "",
    explanation:
      '_prolific4VRExperiences [Prolific "Simulated experiences"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query:\nSimulated Experiences\nParticipants were asked the following question: Have you engaged in any of the following simulated experiences before? Choose all that apply:\nVirtual reality\nAugmented reality\nMixed reality\nOther\nNot applicable / rather not say',
    type: "multicategorical",
    default: "",
    categories:
      "Virtual reality, Augmented reality, Mixed reality, Other, Not applicable",
  },
  {
    name: "_prolific4VRHeadsetFrequency",
    availability: "now",
    example: "",
    explanation:
      '_prolific4VRHeadsetFrequency [Prolific "VR headset (frequency)"] (no default) is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query: \nVR headset (frequency)\nParticipants were asked the following question: In a given month, how frequently do you use a VR headset?\n0 times\n1-5 times\n6-10 times\n11-15 times\nmore than 15 times\nNot applicable / rather not say',
    type: "multicategorical",
    default: "",
    categories:
      "0 times, 1-5 times, 6-10 times, 11-15 times, more than 15 times, Not applicable / rather not say",
  },
  {
    name: "_prolific4VRHeadsetOwnership",
    availability: "now",
    example: "",
    explanation:
      '_prolific4VRHeadsetOwnership [Prolific "VR headset (ownership)"] (no default), controls Prolific "VR Headset Ownership" and is a comma-separated list of acceptable answers (see Categories) to this Prolific prescreening query: \nVR headset (ownership)\nParticipants were asked the following question: Do you own a VR (Virtual Reality) headset?\nYes\nNo\nDon\'t know / other\nNot applicable / rather not say',
    type: "multicategorical",
    default: "",
    categories: "Yes, No, Don't know / other, Not applicable / rather not say",
  },
  {
    name: "_saveCursorPositionBool",
    availability: "now",
    example: "",
    explanation:
      "_saveCursorPositionBool (default FALSE) records cursor and crosshair position at every display frame throughout the experiment. At the end of the experiment, EasyEyes saves a CSV file to the \"data\" folder in the experiment's Pavlovia repository. (Based on the similar, but now deprecated _trackGazeExternallyBool.)\nCURSOR CSV TABLE. Each row of the EasyEyes CSV “cursor” table records posix time (in secs, floating point), x,y position (px) of the: crosshair, cursor, and (if present) target. We also include viewing distance (cm), x,y of closest point (px) to observer's eyes, experiment name, Pavlovia session ID, block number, condition number, conditionName, and trial number.\nNOTE: To download a cursor file (_saveCursorPositionBool=TRUE), Pavlovia must use the CSV results format (_pavlovia_Database_ResultsFormatBool=FALSE, the default). Otherwise the cursor data file will not appear. At some point we'll enhance the compiler to raise an error when both are true.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_saveEachBlockBool",
    availability: "now",
    example: "",
    explanation:
      '❌ works, but not recommended. When _saveEachBlockBool=TRUE (default is FALSE), the experiment will save to CSV as it begins each block. Thus, even if the participant abruptly quits or the computer freezes, the CSV file will always include the last active block. Usually _saveEachBlockBool will be FALSE because, unless absolutely necessary, we don’t want to use the internet in the middle of the session (to minimize delay and make the experiment more robust). But scientists will enable it when they want to know which block failed. \nSAVING. The extra saves enabled by _saveEachBlockBool are in addition to the always-performed saves at the beginning and "end" of the session. ("End" includes a shift of attention aways from the EasyEyes page, which is not the end if the participant returns.) All saves are alike in saving all currently known rows and parameters to the CSV file, and all saves are cumulative, only adding new data. The CSV file on Pavlovia is readable throughout, and grows in length with successive saves. EasyEyes first saves after the compatibility check, before the remote calibration (regardless of whether the remote calibrator runs), which is before the first block, and again at the "end," which includes four cases: 1. completion, 2. orderly termination through an error message or the escape mechanism including waiting out the "saving" window at the end, 3. closing the EasyEyes window before completion or termination, and 4. shift of browser focus away from the EasyEyes page before completion or termination. Saving does not end the experiment.  After shifting attention away, the participant can shift attention back to EasyEyes and continue the experiment, which will save again in any of the four ways. This can happen again and again. \nCAUTION: We introduced this in order to track down what happened to participants that are logged by Prolific and not Pavlovia. It helped, but some participants still escaped detection by Pavlovia. Also, we have the impression that enabling _saveEachBlockBool increased the probability of EasyEyes failing. So we introduced a new method, _logParticipantsBool, which is better. It seems not to cause failure and is more successful in detecting the participants who were undetected by Pavlovia. _logParticipantsBool saves a bit of data about the participant in a Formspree server.  The data remains on that server and is automatically aggregated by Shiny when it analyzes the Pavlovia results. Shiny also aggregates the Proflific report if its included in the *.results.zip file of Pavlovia results. Our current advice is to enable _logParticipantsBool only if you\'re worried about Pavlovia failing to record participants that are logged by Prolific. I don\'t know if there is any situation that warrants enabling _saveEachBlockBool.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_showResourceLoadingBool",
    availability: "now",
    example: "",
    explanation:
      '🕑 _showResourceLoadingBool (default TRUE). As each EasyEyes study begins, before the "Initializing ..." message, the study shows a blank page while it loads all resources needed by the experiment. This can take many minutes if the internet connection is slow (e.g. 3 MB/s), which can seem broken. _showResourceLoadingBool mitigates the possibly long wait by showing the participant that EasyEyes is busy loading resources, e.g. "8:20:27 AM. Loading consentForm …". Turn this off if seeing your resource names might have an undesired effect on your participants, e.g. reveal your hypothesis. STATUS. Ritika worked on this, but has not yet deployed.',
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_showSoundCalibrationResultsBool",
    availability: "now",
    example: "",
    explanation:
      "_showSoundCalibrationResultsBool (default TRUE) requests displaying the plots and tables of the calibration results immediately after each sound calibration (the loudspeaker and each microphone). These plots and tables are impressive, and might interest the participant. If that seems distracting, this switch allows the scientist to disable that display. Each sound calibration includes either or both sound level (at 1000 Hz) and frequency response (at all Hz), and is followed by display of results (if _showSoundCalibrationResultsBool===TRUE) and the Sound Test page (if _showSoundTestPageBool===TRUE).",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_showSoundParametersBool",
    availability: "now",
    example: "",
    explanation:
      "_showSoundParametersBool (default TRUE) adds to every sound plot a formatted display of several input parameters:\n_calibrateSoundBurstDb\n_calibrateSoundBurstSec\n_calibrateSoundBurstRepeats\n_calibrateSoundlIRSec",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "_showSoundTestPageBool",
    availability: "now",
    example: "",
    explanation:
      '_showSoundTestPageBool (default FALSE) requests the Sound Test page, after each sound calibration, to allow the "participant" (typically the scientist) to check the accuracy of sound calibration by using a control panel to produce several sounds at arbitrary sound levels, typically while measuring with a sound level meter. Each sound calibration (of the loudspeaker and each microphone) includes either or both sound level (at 1000 Hz) and frequency response (at all Hz), and is followed by display of results (if _showSoundCalibrationResultsBool===TRUE) and the Sound Test page (if _showSoundTestPageBool===TRUE).',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_textUsesHTMLBool",
    availability: "now",
    example: "",
    explanation:
      "_textUsesHTMLBool (default FALSE) tells EasyEyes to use the HTML capability of PIXIJS text rendering. This allows us to use CSS, which we need to support variable fonts.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "_timeoutSec",
    availability: "now",
    example: "",
    explanation:
      "_timeoutSec (default 180) is the suggested interval to wait before timing out. We set it long to allow for slow internet connections. This is for development. Ultimately EasyEyes should always cope with slow internet connections, but this aids our search for a general solution.",
    type: "numerical",
    default: "180",
    categories: "",
  },
  {
    name: "_trackGazeExternallyBool",
    availability: "now",
    example: "",
    explanation:
      "When _trackGazeExternallyBool is TRUE (default is FALSE), then EasyEyes uses a RESTful node to turn on gaze tracking at onset of experiment and turn it off at end of experiment. And, at the end of the experiment, EasyEyes saves a CSV file to the Downloads folder. \nSTIMULUS CSV TABLE. Each row of the EasyEyes CSV “stimulus” table records posix time (in secs, floating point), x,y position (px) of the: crosshair, cursor, and (if present) target. We also include viewing distance (cm), x,y of closest point (px), experiment name, Pavlovia session ID, block number, condition number, conditionName, and trial number.\nGAZE CSV TABLE. We assume that the external gaze tracker creates another csv file. We have a MATLAB program for this. Each row of that “gaze” table records posix time (in secs, floating point) and x,y gaze position (px), roughly every 10 ms. \n\nEasyEyes and MATLAB drop their CSV tables into the Downloads folder. EasyEyes (“stimulus”) and MATLAB (“gaze”) each generate one file for the whole experiment.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "block",
    availability: "now",
    example: "1",
    explanation:
      "⭑ The block number (default 1) is required in every condition. The first condition (column C) must have block==1. After the first condition, each successive condition (column) rightward must have the same block number as the one preceding it, or increased by +1.\n\nSHUFFLING. Shuffling preserves the total number of blocks and conditions. Despite shuffling by blockShuffleGroups1, blockShuffleGroups2, etc., each block retains its original block number in the CSV results file. Blocks are performed and reported in the shuffled column order, left to right, so in the CSV results, the block number sequence will be nonmonotonic and will vary across participants, but the block numbers will correspond between the experiment spreadsheet and results files.",
    type: "integer",
    default: "1",
    categories: "",
  },
  {
    name: "blockShuffleGroups1",
    availability: "now",
    example: "A",
    explanation:
      'blockShuffleGroups1 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the experiment.\n\nFor any N in the range 1 to 4, a group is defined by putting the same group name in all the conditions in several contiguous whole blocks in a blockShuffleGroups(N) row. blockShuffleGroups1 can be used alone. If N>1, each group defined in the blockShuffleGroups(N) row must be a subset of a containing group defined in a blockShuffleGroups(N-1) row.\n\nThe groups in blockShuffleGroups(N) will have various numbers of conditions and blocks. Order follows the left-to-right positions of the columns.  Not all blocks need be in groups. Within each containing group, EasyEyes counts the groups (from left to right), creates a shuffled list of the numbers from 1 to n, where n is the total count, and then replaces the i-th group by the group whose index is i-th in the shuffled list.\n\nblockShuffleGroups(N) groups are shuffled before blockShuffleGroups(N-1) groups. Shuffling preserves the total number of blocks and conditions. To ease analysis, despite shuffling, each block retains its original block number in the CSV results file. Blocks are performed and reported in the shuffled column order, left to right, so in the CSV results, the block number sequence will be nonmonotonic and will vary across participants.\n\nEasyEyes compiler requirements. Each cell in any blockShuffleGroups(N) row must be empty or have a group name. All the cells in a block must be the same. All the blocks in a group must be contiguous, and have the same group name.  If N>1, each group defined in the blockShuffleGroups(N) row must be a subset of a containing group defined in a blockShuffleGroups(N-1) row.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "blockShuffleGroups2",
    availability: "now",
    example: "A",
    explanation:
      'blockShuffleGroups2 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups1 group that contains them. \n\nSee blockShuffleGroups1.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "blockShuffleGroups3",
    availability: "now",
    example: "A",
    explanation:
      'blockShuffleGroups3 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups2 group that contains them. \n\nSee blockShuffleGroups1.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "blockShuffleGroups4",
    availability: "now",
    example: "A",
    explanation:
      'blockShuffleGroups4 (default is empty) allows the scientist to join one or more contiguous blocks by giving all the included conditions the same "group name" (an alphanumeric string), and requests shuffling the order of those groups within the blockShuffleGroups3 group that contains them. \n\nSee blockShuffleGroups1.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "calibrateBlindSpotBool",
    availability: "now",
    example: "TRUE",
    explanation:
      '⚠ MOST PEOPLE SHOULD USE _calibrateTrackViewingDistanceBool INSTEAD. Set calibrateBlindSpotBool TRUE (default FALSE) to make an initial measurement of viewing distance by mapping the blind spot, as suggested by the Li et al. (2020) "Virtual chinrest" paper, enhanced by flickering the target and manual control of target position. Use _calibrateTrackViewingDistanceBool or calibrateBlindSpotBool, not both. _calibrateTrackViewingDistanceBool maps the blind spot AND tracks viewing distance for the whole experiment. That\'s what most scientists want.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateDistanceCheckBool",
    availability: "now",
    example: "FALSE",
    explanation:
      'Set calibrateDistanceCheckBool TRUE (default FALSE), to request checking of the calibrator by the participant, provided they have a tape measure, meter stick, or yard stick, or failing that, a ruler. After the size and/or distance calibration, if calibrationDistanceCheckBool is TRUE, then we will ask the participant if they have an appropriate measuring device (ideally a tape measure, meter stick, or yard stick; a 12" or 30 cm ruler could be used if we exclude long distances), and, if so, how long is it, and what are its units: decimal cm, decimal inches, fractional inches. If no device, then we skip the rest of the calibrations that need a measuring device. In our instructions, we can say "Use your ruler, stick, or tape to measure this." When receiving fractional inches we could either accept a string like "16 3/16" or we could have three fields that each accept an integer, and allow the user to tab from field to field: "?? ??/??". The last number must be 2, 4, 8, 16, or 32. For round numbers, the numerator will be zero. After measuring screen size, we can ask them to use their ruler, stick, or tape to measure screen width. We can display a huge double headed arrow from left edge to right edge. After measuring viewing distance we can ask them to use ruler, stick, or tape to create three exact viewing distances that we then use the webcam to measure. We can request 12, 24, or 36 inches, or 30, 60, or 90 cm. (These are round numbers, not exactly equivalent.) \n     We have two ways of measuring viewing distance and I’d like to evaluate both. Our current scheme with the calibrator is to have a Boolean parameter for each calibration. We should have separate parameters for the two methods of measuring viewing distance so scientists can select none, either, or both. It would be interesting to compare the two estimates (direct vs indirect) of pupillary distance. We should always save the pupillary distance with the data. We can compare our population distribution with the textbook distribution. It might be an elegant check on our biometrics. \n     We could test people on Prolific and mention in our job description that they must have a tape measure, meter stick, or yard stick.  Readers of our article will like seeing data from 100 people online plus 10 experienced in-house participants. I think this will create confidence in the calibrations. For scientists that’s crucial.\n',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateFrameRateUnderStressBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⚠ WORKS BUT FAILS TO PREDICT TIMING PROBLEMS, SO NOT USEFUL. Set calibrateFrameRateUnderStressBool TRUE (default FALSE) to ask the Remote Calibrator (which runs at beginning of the experiment) to run a several-second-long test of graphics speed. The test is run if any condition requests it, and is only run once, regardless of the number of requests. This value is reported by the output parameter frameRateUnderStress in the CSV data file⚠",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateGazeCheckBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "To check gaze tracking we don’t need a measuring device, and hardly any instructions. I think we could just put up our fixation cross in a few random places and ask them to click on it. It will be very similar to the training and we don’t need to tell the participant that we progressed from training to checking.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibratePupillaryDistanceBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "🕑 USE calibrateBlindSpotBool INSTEAD. Set calibratePupillaryDistanceBool TRUE (default FALSE) to make an initial measurement of pupillary distance (eye to eye), to calibrate viewing distance. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateScreenSizeBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Setting calibrateScreenSizeBool TRUE (default TRUE) asks the Remote Calibrator (which runs at beginning of the experiment) to get the participant's help to measure the screen size. Adjust the screen image of a common object of known size to match, to determine the size in cm of the participant's screen. Thanks to Li et al. 2020.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "calibrateScreenSizeCheckBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Setting calibrateScreenSizeCheckBool TRUE (default FALSE) asks the participant to use a ruler, yardstick, meter stick, or tape measure to measure the distance directly to assess accuracy.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateSound1000HzBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Set calibrateSound1000HzBool TRUE (default FALSE) to request loudspeaker (and possibly _calibrateMicrophonesBool) sound gain calibration (db SPL re numerical dB) at 1 kHz, using the participant's pre-calibrated microphone (either in a smartphone or a USB-connected microphone). If the participant offers a smartphone, EasyEyes checks its library for that model in its library of microphone calibrations. Many sound levels are tested to calibrate the effect of clipping and dynamic gain control. Early exit if no calibrated microphone is available. Calibration is done only once, at the beginning, before block 1, if any condition(s) in the whole experiment requests it. Each condition uses the 1000 Hz calibration if and only if it sets calibrateSound1000HzBool=TRUE. The parameters calibrateSound1000HzBool and calibrateSoundAllHzBool are independent and complementary. The 1000 Hz calibration measures gain at many sound levels; the all-Hz calibration measures gain at all frequencies, at one sound level. We anticipate that most sound conditions will use both. Before block 1, once the loudspeaker is calibrated, if _calibrateMicrophonesBool is TRUE, then EasyEyes offers to calibrate microphones, one at a time.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateSound1000HzDB",
    availability: "now",
    example: "-3",
    explanation:
      "⭑ calibrateSound1000HzDB, used with calibrateSound1000HzBool, is a comma-separated list of digital RMS amplitudes, in dB, of the sinewave used to calibrate the sound gain. Default is -60, -50, -40, -30, -20, -15,- 10, -3.1 (dB), where levelDB = 20*log10(rms), and rms is the root mean square of the digital sound vector. A sinewave with range -1 to +1, the highest amplitude that won't be clipped, has rms -3.1 dB. Microphones clip and may have dynamic range compression, so we measure the gain at many amplitudes and fit a model to the data. The model allows for an additive environmental background noise and dynamic range compression and clipping of the recoding with three degrees of fredom (T,W,R). Digital sound cannot exceed ±1 without clipping. Thus sin(2*pi*f*t) is at maximum amplitude. It has RMS amplitude of 0.707, which is -3.1 dB. IMPORTANT. Order your calibration sound levels so that loudness increases. The iPhone microphone has a slow dynamic range compression and measurement of a given digital sound level (e.g. -50 dB) made after measuring a much louder sound can be 6 dB lower than after a quiet sound. Your smartphone's clipping and dynamic range compression are not part of your experiment; we just need to get good sound level measurements during calibration. ",
    type: "text",
    default: "-60, -50, -40, -30, -20, -15, -10, -3.1",
    categories: "",
  },
  {
    name: "calibrateSound1000HzPostSec",
    availability: "now",
    example: "",
    explanation:
      'calibrateSound1000HzPostSec (default 0) specifies the duration, after the part that is analyzed, of the 1 kHz sound at each sound level. This allows for some discrepancy between the clocks used to drive sound playing and recording. Making the sound longer than the recording allows us to be sure of getting a full recording despite modest discrepany in loudspeaker and microphone clocks.\nNOTE: Because of the uncertainty in synchronizing the loudspeaker and recording onsets we record for 20% longer than the whole requested duration: _calibrateSound1000HzPreSec+_calibrateSound1000HzSec+_calibrateSound1000HzPostSec. In the EasyEyes plots of power over time, the excess duration beyond _calibrateSound1000HzPreSec+_calibrateSound1000HzSec is assigned to the "post" interval, so the plotted "post" interval will be longer than requested by calibrateSound1000HzSec by 20% of the whole requested duration.',
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "calibrateSound1000HzPreSec",
    availability: "now",
    example: "",
    explanation:
      "calibrateSound1000HzPreSec (default 1) specifies the duration of the 1 kHz sound played as warmup, before the part that is analyzed at each sound level. Looking at plots of power variation vs time for my iPhone 15 pro, setting the pre interval to 1.0 sec is barely enough.  It might turn out that some phones need more.",
    type: "numerical",
    default: "1.5",
    categories: "",
  },
  {
    name: "calibrateSound1000HzSec",
    availability: "now",
    example: "",
    explanation:
      "calibrateSound1000HzSec (default 1) specifies the duration, after warmup, of the 1 kHz sound that is analyzed at each sound level. ",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "calibrateSoundAllHzBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Set calibrateSoundAllHzBool TRUE (default FALSE) to request loudspeaker (and possibly _calibrateMicrophonesBool) sound gain calibration (db SPL re numerical dB) at all frequencies, relative to 1000 Hz, using the participant's pre-calibrated smartphone microphone or USB-connected microphone. If the participant offers a smartphone, EasyEyes checks our library for that smartphone model in its library of microphone calibrations. The microphone is used to measure the loudspeaker's impuse response. The impulse response yields the gain (db SPL re numerical dB) at every frequency. Early exit if no pre-calibrated microphone is available. It's ok for the pariticipant try several smartphones before finding one that's in the EasyEyes microphone calibration library. Calibration is done once, before block 1, if any condition(s) in the whole experiment requests it. Each condition uses this calibration only if it sets calibrateSoundAllHzBool TRUE.  calibrateSound1000HzBool and calibrateSoundAllHzBool are independent and complementary. The 1000 Hz calibration measures gain at many sound levels; the allHz calibration measures gain at all frequencies, at one sound level. We anticipate that most sound conditions will use both. Once, the loudspeaker is calibrated, if _calibrateMicrophonesBool is TRUE, then EasyEyes offers to calibrate microphones, one at a time.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateSoundAllHzDB",
    availability: "now",
    example: "-3",
    explanation:
      "calibrateSoundAllHzDB, used with calibrateSoundAllHzBool, is a comma-separated list of digital RMS amplitudes, in dB, of the sinewave used to calibrate the sound gain. Default is -23.1 (in dB), where levelDB = 20*log10(rms), and rms is the root mean square of the digital sound vector. A sinewave with range -1 to +1, the highest amplitude that won't be clipped, has rms -3.1 dB. Built-in  speakers in laptop computers are typically small with severe dynamic range compression, so we need to measure the gain at many amplitudes since gain will drop at high sound levels. Digital sound cannot exceed ±1 without clipping. Thus sin(2*pi*f*t) is at maximum amplitude. It has RMS amplitude of 0.707, which is -3 dB.",
    type: "text",
    default: "-13.1",
    categories: "",
  },
  {
    name: "calibrateSoundMaxHz",
    availability: "now",
    example: "",
    explanation:
      "calibrateSoundMaxHz (default 10000) is the upper cut-off frequency applied to the inverse impulse response function. That's a low-pass filter. The cut off frequency is the break point at the meeting of straight lines to the transfer function expressed as dB gain vs. log frequency. Must be at least 1000.5.",
    type: "numerical",
    default: "10000",
    categories: "",
  },
  {
    name: "calibrateSoundMinHz",
    availability: "now",
    example: "",
    explanation:
      "calibrateSoundMinHz (default 40) is the lower cut-off frequency applied to the inverse impulse response function. That's a high-pass filter. The cut off frequency is the break point at the meeting of straight lines to the transfer function expressed as dB gain vs. log frequency. Must be positive and no more than 999.5.",
    type: "numerical",
    default: "40",
    categories: "",
  },
  {
    name: "calibrateSoundSaveToCSVBool",
    availability: "now",
    example: "",
    explanation:
      "If calibrateSoundSaveToCSVBool==TRUE (default FALSE) then save the digital sound stimuli and sound recordings in the Pavlovia CSV file for further analysis.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateSoundToleranceDB",
    availability: "now",
    example: "",
    explanation:
      "calibrateSoundToleranceDB specified the maximum allowed RMS dB error in the fit to the data for sound levels in and out of the louspeaker, i.e. output sound dB SPL vs. digital input dB. If the RMS fitting error exceeds this toleranance then the calibration must be repeated.",
    type: "numerical",
    default: "3",
    categories: "",
  },
  {
    name: "calibrateTrackDistanceBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ Set calibrateTrackDistanceBool TRUE (default FALSE) to calibrate and use the webcam to track viewing distance. Calibration occurs once for the whole experiment, before the first trial, if any condition(s) set calibrateTrackDistanceBool=TRUE. Use calibrateTrackDistanceBool or calibrateBlindSpotBool, not both. In preliminary testing (one participant), accuracy is better than 5% at viewing distances of 40 to 130 cm. Nearer, distance is overesimated by 13% at 30 cm and by 25% at 20 cm. Beyond 130 cm, estimated distance is unrealiable and nonmonotic.\n\nFUTURE PLANS: calibrateBlindSpotBool??. Set calibratePupillaryDistanceBool TRUE (default FALSE) to make an initial measurement of pupillary distance (eye to eye), to calibrate viewing distance. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateTrackDistanceCheckBool",
    availability: "now",
    example: "FALSE",
    explanation:
      '🕑 Setting calibrateTrackDistanceCheckBool=TRUE (default FALSE) requests checking of tracking distance estimation by the participant, provided they have a tape measure, meter stick, or yard stick, or ruler. Several distances are checked as specified by calibrateTrackDistanceCheckCm. After size and distance calibration, if calibrateTrackDistanceCheckBool is TRUE, then we will ask the participant if they have an appropriate measuring device (tape measure, meter stick, yard stick, or a 12" or 30 cm ruler), and, if so, how long is it, and what are its units: decimal cm, decimal inches, fractional inches. Set the new CSV output parameter calibrationRulerBool (default empty) to TRUE or FALSE indicating whether a suitable measuring device is available. If FALSE, then EasyEyes will skip all tests that require a measuring device. In our instructions, we can say "Use your ruler, stick, or tape to measure this." When receiving fractional inches we could either accept a string like "16 3/16" or we could have three fields that each accept an integer, and allow the user to tab from field to field: "?? ??/??". The last number must be 2, 4, 8, 16, or 32. For round numbers, the numerator will be zero. After measuring screen size, we can ask them to use their ruler, stick, or tape to measure screen width. We can display a huge double headed arrow from left edge to right edge. After measuring viewing distance we can ask them to use ruler, stick, or tape to create three exact viewing distances that we then use the webcam to measure. We can request 12, 24, or 36 inches, or 30, 60, or 90 cm. (These are round numbers, not exactly equivalent.) \n     We have two ways of measuring viewing distance and I’d like to evaluate both. Our current scheme with the calibrator is to have a Boolean parameter for each calibration. We should have separate parameters for the two methods of measuring viewing distance so scientists can select none, either, or both. It would be interesting to compare the two estimates (direct vs indirect) of pupillary distance. We should always save the pupillary distance with the data. We can compare our population distribution with the textbook distribution. It might be an elegant check on our biometrics. \n     We could test people on Prolific and mention in our job description that they must have a tape measure, meter stick, or yard stick.  Readers of our article will like seeing data from 100 people online plus 10 experienced in-house participants. I think this will create confidence in the calibrations. For scientists that’s crucial.\n',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "calibrateTrackDistanceCheckCm",
    availability: "now",
    example: "",
    explanation:
      "🕑 calibrateTrackDistanceCheckCm (default 25, 35, 50, 70, 100, 140, 160, 180) is a comma-separated list of viewing distances (in cm) that will be checked if calibrateTrackDistanceCheckBool=TRUE. ",
    type: "text",
    default: "25, 35, 50, 70, 100, 140, 160, 180",
    categories: "",
  },
  {
    name: "calibrateTrackGazeBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "⚠ WORKS BUT NOT RECOMMENDED BECAUSE ACCURACY IS ABOUT 3 DEG (less if camera has more pixels), AND IT REQUIRES FREQUENT RECALIBRATION, WHICH THE PARTICIPANTS FIND TIRESOME. Set calibrateTrackGazeBool TRUE (default FALSE) to calibrate and use the webcam for gaze tracking. Calibration occurs once for the whole block, before the first trial, if any condition(s) set calibrateTrackGazeBool=TRUE. Gaze tracking uses the built-in webcam to monitor where the participant's eyes are looking. To be clear, in gaze tracking, the webcam looks at your eyes to figure out where on the screen your eyes are looking. It estimates that screen location. Gaze-contingent experiments change the display based on where the participant is looking. Peripheral vision experiments typically require good fixation and may discard trials for which fixation was too far from the fixation mark. Precision is low, with a typical error of 3 deg at 50 cm. We expect the error, in deg, to be proportional to viewing distance.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "closestPointEccentricitySetting",
    availability: "now",
    example: "",
    explanation:
      "🕑 closestPointEccentricitySetting (no default). VIEWING GEOMETRY\nviewingDistanceCm = distance from eye to closest point.\nclosestPointXYInUnitSquare=[0.8 0.5]; % Rough location of closest point in screenRect re lower left corner.\nclosestPointXYPix % screen coordinate of point on screen closest to viewer's eyes. Y goes down.\nclosestPointXYDeg % eccentricity of closest point re fixation. Y goes up.\nclosestPointEccentricitySetting\n1. Set closestPointXYPix according to closestPointXYInUnitSquare.\n2. If closestPointEccentricitySetting==\n'target', then set closestPointXYDeg=eccentricityXYDeg\n'fixation', then set closestPointXYDeg=[0 0].\n'value', then assume closestPointXYDeg is already set.\n3. Ask viewer to adjust display so desired closest point is at desired\nviewing distance and orthogonal to line of sight from eye.\n4. If using off-screen fixation, put fixation at same distance from eye\nas the closest point, and compute its position relative to closest point.",
    type: "categorical",
    default: "",
    categories: "target, fixation, value",
  },
  {
    name: "conditionEnabledBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "⭑ When conditionEnabledBool is FALSE (default is TRUE), the condition (column in experiment table) is ignored, except for block numbering. The block is counted even if all its conditions are disabled. This makes it easy to omit conditions during development and debugging without removing their details from the experiment table. \n     This ignores a column. To ignore a row, insert % as its first character.\n     EXAMPLE. As noted above, disabling a column, unlike deleting it, doesn't affect block numbering. If you have three blocks and disable block 2, you'll be left with blocks 1 and 3, and the compiler won't complain. If you deleted block 2 then you'd have to renumber block \"3\" to be \"2\", or get a compiler error about non-consecutive block numbers.\n     NOTE. Values in ignored columns (conditionEnabledBool==FALSE) should not affect the compiled program. If you find such an effect, please report it as a bug. Send a short experiment that exhibits the problem to denis.pelli@nyu.edu.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "conditionGroup",
    availability: "now",
    example: "1",
    explanation:
      '🕑 conditionGroup (empty default) imposes consistent screen markings across a set of conditions. Screen markings before and during stimulus presentation indicate the positions of the fixation and possible targets. There are many parameters, below, whose names begin with "marking" that allow you to customize markings.  Within a block, all conditions with the same nonzero conditionGroup number are presented with the same markings (fixation cross "+" and target "x") to avoid giving any clue as to which of the possible targets will appear on this trial. Thus, one can implement uncertainty among the targets in any set simply by putting them all in one block, with one condition for each target, giving all the conditions the same nonzero conditionGroup number. There can be any number of conditions in a condition group, and there can be any number of condition groups in a block. Every condition belongs to a condition group. A condition with a zero or unique conditionGroup number belongs to a condition group with just that condition.',
    type: "integer",
    default: "0",
    categories: "",
  },
  {
    name: "conditionName",
    availability: "now",
    example: "Crowding",
    explanation:
      "⭑ conditionName (no default) labels each condition in your data as a potential guide to subsequent data analysis. Need not be unique. It's fine to give several (possibly identical) conditions the same conditionName, to guide analysis. Not used by EasyEyes, but reported in any error message. Set showConditionNameBool=TRUE to display it on screen during each trial. The R software that we are developing to analyze CSV results files will parse any conditionNames that include a period into a first and second part, before and after the period. This will identify factors that the scientist wants to use in analysis. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "conditionTrials",
    availability: "now",
    example: "40",
    explanation:
      "⭑ conditionTrials (no default) is the number of trials of this condition to run in this block. Each condition can have a different number of trials. They are all randomly interleaved. IMPORTANT: We have parameters, e.g. thresholdAllowedDuration and thresholdAllowedLateness, that can reject trials for various reasons, e.g. bad duration or delay. When a trial is rejected, it is not passed to Quest, and won't be part of the threshold estimate. The CSV file retains the rejected trial's result so you could reanalyze your data including the rejected trials. FUTURE: In principle, it would be nice to add a new trial to make up for each rejected trial, but the PsychoJS MultiStair code has no provision for adding a trial to an ongoing loop. We hope to add that capability in the future. NOTE: conditionTrials is ignored when targetKind==reading.",
    type: "integer",
    default: "35",
    categories: "",
  },
  {
    name: "errorBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "FOR DEBUGGING. errorBool (default FALSE) throws a fatal error in the first condition for which this parameter is TRUE. This is used to check out the EasyEyes error reporting.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "errorEndsExperimentBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 errorEndsExperimentBool (default FALSE) determines what happens after the participant hits the only button in the pop up error message. If TRUE then then button tells EasyEyes to terminate the experiment. If FALSE then the button tells EasyEyes to continue at the next block. The participant is not offered any choice. The scientist can set this independently for each condition throughout the experiment.\n\nCOMPLETE CODE AT END OF EXPERIMENT WITH ERROR. We’re going to change our handling of the completion code. Currently when there’s a fatal error, EasyEyes does NOT return a completion code. That makes the participant’s contribution seem suspect in the Prolific dash board, even though the error is practically always due to a fault in EasyEyes marring a best-faith effort by the participant. That denial of “completion” seems unfair to the participant. NEW POLICY: If we have an error in the middle, but eventually finish normally (including the case of an error in the last block), EasyEyes will consider the experiment “complete”, and return the completion code. That’s more fair to participants, graphically confirming that they did the work. Thus “completion” will refer to the orderly return from EasyEyes back to the caller (e.g. Prolific), even though some blocks (conceivably all blocks) may have been skipped due to errors. Prolific will declare the experiment as complete, and give it a green check. Properly handled errors will be invisible to Prolific. NOT YET IMPLEMENTED: When we issue the completion code we also set a new flag in the CSV file, indicating that it ended normally. Simon needs this for the Summary Report.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "fixationCheckBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 fixationCheckBool (default FALSE). Display a foveal triplet that is easy to read if the participant's eye is on fixation, and hard to read if the eye is elsewhere.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "fixationLocationStrategy",
    availability: "now",
    example: "centerFixation",
    explanation:
      '🕑  fixationLocationStrategy (default centerFixation) specifies the strategy by which EasyEyes places the fixation point, which is the origin of the visual coordinate system relative to the fixationOriginXYScreen. Most experimenters will choose centerFixation, the default, which simply places fixation at the fixationOriginXYScreen. For peripheral testing, you might set fixationOriginXYScreen near one edge of the display to maximize the eccentricity of a target at the opposite edge. Fixation, whether on- or off-screen, is always internally specified as a point in (x,y) display coordinates in the plane of the display (origin at lower left corner). (When the crosshair moves, fixation moves with it. In that case we also refer to the fixed "nominal" fixation at the static center of the motion.) The compiler requires that all conditions in a block have the same fixation point, fixationLocationStrategy, and fixationOriginXYScreen.\n• centerFixation places fixation at the fixationOriginXYScreen. This is the default.\n🕑 • centerTargets sets the (possibly offscreen) fixation location so as to maximize the screen margin around the edges of all the possible targets.  We consider all possible targets across all conditions within the block.  \n🕑 • centerFixationAndTargets places fixation so as to maximize the screen margin around the fixation and the edges of all the possible targets within the block. We consider all possible targets across all conditions within the block.  \n🕑 To test even farther into the periphery, you might want to set fixationRequestedOffscreenBool TRUE and place the fixation off-screen by putting tape on a bottle or a box and drawing a fixation cross on it.\n\nSatisfying centerTargets or centerFixationAndTargets may be impossible beyond a certain maximum viewing distance (in cm) proportional to screen size (in cm). We generally don\'t know the screen size at compile time, as each participant has their own computer. Currently the scientist can only specify viewing distance as a fixed number of cm. \n\n[Since short viewing distances are uncomfortable, it might be useful to be able to request the maximize viewing distance such that the screen will have a needed visual subtense. In effect, this requests a viewing distance that is a multiple of screen width or height.]',
    type: "categorical",
    default: "centerFixation",
    categories: "centerFixation, centerFixationAndTargets, centerTargets",
  },
  {
    name: "fixationOriginXYScreen",
    availability: "now",
    example: "0.5",
    explanation:
      "fixationOriginXYScreen (default 0.5,0.5). If fixationLocationStrategy is centerFixation (which is the default), then fixationOriginXYScreen specifies fixation's X,Y coordinate in the screen plane, as a fraction of screen width and height. The lower left corner is (0,0), and the upper right corner is (1,1). Normally the specified point must lie in that unit square (enforced by compiler), but if fixationRequestedOffscreenBool==TRUE then the specified point can be anywhere.",
    type: "text",
    default: "0.5,0.5",
    categories: "",
  },
  {
    name: "fixationRequestedOffscreenBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 fixationRequestedOffscreenBool (default FALSE). To test the far periphery, with help from the participant, it may be worth the trouble of setting up an off-screen fixation mark. Set fixationRequestedOffscreenBool TRUE and EasyEyes will ask the participant to put tape on a bottle or box and draw a crosshair on it. To figure out where the crosshair is, EasyEyes will display arrows on the display and ask the participant to drag the arrow heads to point to the crosshair.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "flankerCharacterSet",
    availability: "now",
    example: "abc",
    explanation:
      "🕑 flankerCharacterSet (default is the fontCharacterSet) is like fontCharacterSet but for the flankers. ",
    type: "text",
    default: "abcdefghijklmnopqrstuvwxyz",
    categories: "",
  },
  {
    name: "flankerFont",
    availability: "now",
    example: "Sloan.woff2",
    explanation:
      "🕑 flankerFont (default is the font) is like font, but for the flankers. ",
    type: "text",
    default: "Roboto Mono",
    categories: "",
  },
  {
    name: "flankerFontSource",
    availability: "now",
    example: "file",
    explanation:
      "🕑 flankerFontSource (default is google) is like fontSource, but for the flankers. ",
    type: "categorical",
    default: "google",
    categories: "file, google, browser",
  },
  {
    name: "flankerNumber",
    availability: "now",
    example: "2",
    explanation:
      "🕑 flankerNumber (default 1) is the number of flanker characters on each side of the target. Flankers are added on radial lines radiating from the target and going through each initial flanker. Each flanker is a random sample without replacement from flankerCharacterSet, if defined, otherwise from fontCharacterSet. Note that when drawing from fontCharacterSet the flankers are all different from the target. When drawing from flankerCharacterSet there is no target-based restriction.",
    type: "integer",
    default: "1",
    categories: "",
  },
  {
    name: "flankerSpacingDeg",
    availability: "now",
    example: "",
    explanation:
      "🕑 flankerSpacingDeg (default is the spacingDeg) is the center-to-center spacing between repeated flankers, as determined by flankerNumber. This is independent of spacingDeg, which specifies the center-to-center spacing of the target and each adjacent flanker.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "flipScreenHorizontallyBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 Set flipScreenHorizontallyBool to TRUE (default is FALSE) when the display is seen through a mirror.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "font",
    availability: "now",
    example: "Sloan.woff2",
    explanation:
      '⭑ font specifies the font for the target and for reading. How you specify it depends on the chosen fontSource:\n\nfile: font is the filename (including the extension: .woff2, .woff, .otf, or .ttf) of a font file in your EasyEyes Resources:Fonts folder in your Pavlovia account. Web font experts strongly recommend that you use the WOFF2 format, if you have it, instead of any other, because it\'s the smallest, by far (half of OTF), for fast download, and is supported by all modern browsers. The compiler will download the font file from your Fonts folder to your temporary local Experiment folder, which is then uploaded to a new Pavlovlia repo for your experiment.  (The list of allowed font types is copied from the Mozilla documentation of the @font-face command. https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face)\n\ngoogle:  font is the filename (without extension) of a font file provided by the free Google Font server. \n\n🕑 COMING SOON: server: font is a URL pointing to the desired font on a font server. For example, many fonts are served for free by the Google Fonts server.  https://fonts.google.com/  At that website, use "Search for font". Having found your font, select the style you want. In the "Selected Family" pop-up window, click the "@import" button. From within the revealed CSS code, copy the URL from inside the "url(. )". \n\nbrowser: The experiment will pass the font preference string that you place in font to the participant\'s browser and accept whatever the browser provides.  Your string can include several font names, separated by commas, first choice first, to help the browser find something close to your intent. This is the usual way to select a font on the web, and never generates an error.  Specify just the family name, like "Verdana", and use the "fontStyle" to select italic, bold, or bold-italic. Some "web safe" fonts (e.g. Arial, Verdana, Helvetica, Tahoma, Trebuchet MS, Times New Roman, Georgia, Garamond, Courier New, Brush Script MT) are available in most browsers. In ordinary browsing, it\'s helpful that browsers freely substitute fonts so that you almost always get something readable in the web page you\'re reading. In the scientific study of perception, we usually don\'t want data with a substituted font. So, normally, you should specify "file" or "server" so you\'ll know exactly what was shown to the participant. \n\nEasyEyes preloads all fonts. At the beginning of the experimen, EasyEyes preloads all needed fonts, for the whole experiment (all conditions), so, after preload, the experiment runs with no font-loading delay and no need for internet, except to save data at the end. ',
    type: "text",
    default: "Roboto Mono",
    categories: "",
  },
  {
    name: "fontCharacterSet",
    availability: "now",
    example: "DHKNORSVZ",
    explanation:
      "⭑ fontCharacterSet is a string of unicode characters. \nLETTER IDENTIFICATION: On each trial, the target and flankers are randomly drawn from this character set, without replacement. Allowed responses are restricted to this character set. The other keys on the keyboard are dead. Letters may appear more than once in the string, to increase their probability of being drawn, but once one is drawn any identical letters are removed with it, so the drawn samples won't have any repeats. (We have no experience using repeats in the fontCharacterSet.)\nREADING: The fontCharacterSet string is used to estimate typical spacing. For English I use lowercase a-z. ",
    type: "text",
    default: "abcdefghijklmnopqrstuvwxyz",
    categories: "",
  },
  {
    name: "fontColorRGBA",
    availability: "now",
    example: "0,0,0,1",
    explanation:
      'fontColorRGBA (default 0,0,0,1 i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify font color for each condition. "RGB" are the red, green, and blue channels; "A" controls opacity (0 to 1). 0,0,0,1 is black and 1,1,1,1 is white.  Use screenColorRGBA to control the background color. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA.',
    type: "text",
    default: "0,0,0,1",
    categories: "",
  },
  {
    name: "fontFeatureSettings",
    availability: "now",
    example: "",
    explanation:
      '🕑 fontFeatureSettings (no default) allows the scientist to specify how the font should use its glyphs to render a script or language. fontFeatureSettings receives a string. The default is the empty string. A typical value is\n"calt" 1\nor\n"calt" 1, "smcp", "zero"\nEach line above is a string that is passed to the CSS function "font-variation-settings". The (single or double) quote marks are required. Each four letter code is taken from a long list of possible font features. "calt" enables the font’s "contextual alternates", especially connections between adjacent letters in a script font. "smcp" enables small caps. "zero" requests a slash through the zero character to distinguish it from capital O. Most font features are Boolean and accept an argument of 0 for off and 1 for on. Some accept an integer with a wider range. Supported by all modern browsers, and even Internet Explorer.\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/font-feature-settings\nhttps://docs.microsoft.com/en-us/typography/opentype/spec/features_ae#tag-calt\nhttps://helpx.adobe.com/in/fonts/using/open-type-syntax.html\nhttps://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-ligatures\nhttps://en.wikipedia.org/wiki/Ligature_(writing)\nhttps://stackoverflow.com/questions/7069247/inserting-html-tag-in-the-middle-of-arabic-word-breaks-word-connection-cursive/55218489#55218489',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "fontKerning",
    availability: "now",
    example: "normal",
    explanation:
      "🕑 fontKerning (default auto) uses the fontKerning Canvas command to enable or disable kerning: auto (yes/no as dictated by browser), normal (yes), or none (no).\nhttps://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fontKerning",
    type: "text",
    default: "normal",
    categories: "",
  },
  {
    name: "fontLeftToRightBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "⭑ Set fontLeftToRightBool (default TRUE) to TRUE for languages that, like English, are written from left to right, and to FALSE for right-to-left languages, like Arabic and Hebrew.  When targetTask and targetKind are identify letter, all the fontCharacterSet letters will be placed on the response screen according to fontLeftToRightBool. For reading, left-to-right text is left-aligned, and right-to-left text is right aligned. If fontLeftToRightBool is set incorrectly for reading, text may fall off the screen.                                                                                                                                           ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "fontMaxPx",
    availability: "now",
    example: "",
    explanation:
      "fontMaxPx (default 300) sets an upper limit on the nominal font size. We added this to avoid some crashes that seem to result from trying to draw or measure huge characters. The crash is a stack overflow while trying to measure font size. We have only a rough estimate of the threshold for trouble. Introducing a limit of 900 helped a lot, but didn't eliminate all cases. Judging a year later, setting it to 600 elimintated this problem. In April 2023 we beefed up all error messages to include the font size, so any future crashes will tell us what font and size causes the crash.\nLATENESS: In April 2024 Maria Pombo discovered that two lacey fonts (Ballet and Zapfino) take too long to draw at large size which causes the trial to be discarded for excess lateness. See thresholdAllowedLatenessSec. Supposing that drawing time is proportional to size squared, we hope that halving fontMaxPx from 600 to 300 will reduce time to draw enough to be within the allowed lateness. Only the largest sizes are a risk for crashing and lateness. Typically QUEST begins each block at the largest possible size (i.e. fontMaxPx) and quickly descends to smaller size. With fontMaxPx=600, the fraction of too-late trials is 0.3 for Ballet, 0.2 for Zapfina, 0.15 for TimesNewRoman, and 0.03 for Baskerville. All text fonts that we tested are in the range 0.03 to 0.15. I hope that reducing fontMaxPx to 300 will reduce all of these below 0.05.",
    type: "numerical",
    default: "300",
    categories: "",
  },
  {
    name: "fontPadding",
    availability: "now",
    example: "3",
    explanation:
      "⭑ fontPadding is a positive number (default 0.5; we've tried 0, 0.5, 1, and 3) specifying how much padding PIXI.js should add around each string to avoid clipping, at the cost of slower rendering. Setting fontPadding to zero produces the default PIXI.js behavior, which renders the Roboto Mono font perfectly, but slightly clips the left and bottom edges of strings in fonts with more flourish, i.e. Catalina, Burgues, and Arabic. Increasing fontPadding to 0.5 or higher eliminates clipping of these fonts. Setting fontPadding to a high value (e.g. 3) can cause timing problems: lateness and errors in duration. Lateness and duration are measured by EasyEyes and reported in the CSV file as targetMeasuredLatenessSec and targetMeasuredDurationSec. On our 8-core M1 MacBook Pro, setting fontPadding to 0 or 0.5 gives good timing:  duration within 10 ms of the requested 150 ms targetDurationSec and SD about 20 ms, as I recall. Setting fontPadding to 3 results in terrible timing: Rendering is obviously very slow, and the requested 150 ms targetDurationSec yields 100 ms mean duration. The experiment testClippingOfCrowdingAndReading.xlsx was used to assess this.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "fontSource",
    availability: "now",
    example: "file",
    explanation:
      "⭑ fontSource must be file, google, server (🕑 not yet supported), or browser. Browsers blithely substitute for unavailable or slow-to-load fonts. That's great for keeping the web going, but bad for perception experiments, so we encourage you to provide access to a specific font, either as a file or on a font server. For each condition that has fontSource file, the compiler checks for presence of the font in your Fonts folder (in your Pavlovia account). That folder is persistent, and you can add more fonts to it at any time, through the EasyEyes.app. Any popular font format will work, but for quick upload, we recommend minimizing file size by using the highly compressed WOFF2 webfont file format, indicated by the filename extension woff2. \n\nfile: font contains the filename (with extension) of a file in the Fonts folder in the EasyEyesResources repository in your Pavlovia account. Font availability is checked by the EasyEyes compiler, to avoid runtime surprises. LIMITATIONS: The font filename should not have any spaces. EasyEyes currently is only aware of up to 20 fonts. Further fonts are ignored. We hope to remove these limits in a future release. If you hit the 20-font limit, you can use the VIew code button in Pavlovia to open the EasyEyesResources repository and delete fonts that you don't need right now.\n\ngoogle: font contains the font name as recognized by the Google Fonts server.\n\n🕑 server: font contains the URL of the font on a font server. (\"server\" support is coming.)\n\nbrowser: font is a font-preference string that is passed to the participant's browser. This never produces an error; we accept whatever font the browser chooses. Your font string can include several font names, separated by commas, to help the browser find something close to your intent. This is the usual way to select a font on the web, and never generates an error. (We don't know any quick way to discover what font the browser chose, so the scientist will never know.) ",
    type: "categorical",
    default: "google",
    categories: "file, google, browser",
  },
  {
    name: "fontStyle",
    availability: "now",
    example: "bold",
    explanation:
      '🕑 fontSyle can be regular (default), bold, italic, or boldItalic. \n• If font is a file name that already specifies the style you want, then don\'t specify a style here. Just leave fontStyle as default. Otherwise the participant\'s browser might try to "helpfully" synthesize the new style by tilting or thickening what the font file renders. It\'s safer to switch to the font file whose name specifies the style you want. \n• Alternatively, if fontSource is "browser", and font specifies only a font family name (e.g. Verdana), or several (e.g. Verdana;Arial), then you can use fontStyle to select among the four standard styles.',
    type: "categorical",
    default: "regular",
    categories: "regular, bold, italic, boldItalic",
  },
  {
    name: "fontTrackingForLetters",
    availability: "now",
    example: "0",
    explanation:
      'fontTrackingForLetters (default 0) adjust the gap between letters. It adds a positive or negative value to whatever the font would do otherwise. This is closely related to what Microsoft Word calls "tracking". The distance inserted (in px) is the product of the value provided and the point side of the font. It applies only to reading experiments (targetTask=identify, targetKind=reading) and letter experiments (targetTask=identify, targetKind=letter, spacingRelationToSize=typographic). Scientist must manually adjust parameters to ensure the paragraph does not expand too far such that the paragraph is outside of the participants view.\nNOT YET IMPLEMENTED for RSVP reading. (Note: Gus mentioned he already handled letter spacing in RSVP reading in a different way?)\nuses the "letterSpacing" Canvas command to adjust the spacing between letters.\nhttps://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/letterSpacing\n"letterSpacing" is part of the new CanvasRenderingContext2D, which is available for Chrome, Edge, and Samsung, not for Safari and Firefox.',
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "fontTrackingForWords",
    availability: "now",
    example: "0",
    explanation:
      '🕑 fontTrackingForWords (default 0) uses the "wordSpacing" Canvas command to adjust the spacing between words.\nhttps://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/wordSpacing\nThe distance inserted (in px) is the product of the value provided and the point side of the font. This works for Chrome, Edge, and Samsung, not for Safari and Firefox.',
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "fontVariableSettings",
    availability: "now",
    example: "",
    explanation:
      '🕑 fontVariableSettings accepts a string to control a variable font (default is the empty string). When you set this parameter, the EasyEyes compiler will flag an error if it determines that the target font is not variable. Variable fonts have one or more axes of variation, and fontVariableSettings allows you to pick any value along each axis to control the font rendering. You set all the axes at once. Any axis you don\'t set will be set to its default. Each axis has a four-character name. Standard axes have all-lowercase names, like \'wght\' for weight. Novel axes are called "unique" and have ALL-UPPERCASE names, like \'GRAD\', which (in Roboto Flex) adjusts letter weight without affecting line length. fontVariableSettings receives a string. A typical value is\n"wght" 625\nor\n"wght" 625, "wdth" 25\nYou pass the whole line as a string, INCLUDING the quote marks, but not the RETURN. The string is passed to the CSS function font-variation-settings. The (single or double) quote marks are required. Each four letter code represents an axis of variation supported by the particular variable font. "wght" is weight, which allows you to select any weight from extra thin, to regular, to bold, to black. "wdth" is width, which allows you to select any width from compressed to regular to expanded. (We\'re not sure, but we anticipate no error and no effect of using an unsupported axis name.) All modern browsers support variable fonts. Internet Explorer does not.\n\nYOUR FONT\'S AXES. To discover your variable font\'s axes of variation, and their allowed ranges, try this web page: https://fontgauntlet.com/. Or assign your font to some text in Adobe Illustrator. Illustrator\'s Character pane (in the Properties window) has a tiny variable-font icon consisting of a narrow and a wide T above a slider. Clicking that icon pops up a panel with a slider for each of your font\'s variable axes. Adobe\'s Roboto Flex variable font has 11 axes.\n\nFURTHER READING\nhttps://abcdinamo.com/news/using-variable-fonts-on-the-web \nhttps://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-variation-settings\n',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "fontWeight",
    availability: "now",
    example: "550",
    explanation:
      "🕑 fontWeight (default is regular weight) accepts a positive integer that sets the weight of a variable font. When you set this parameter, the EasyEyes compiler will flag an error if it determines that the target font is not variable. \nhttps://abcdinamo.com/news/using-variable-fonts-on-the-web\n[IMPLEMENTATION: myText.style.fontWeight = fontWeight.]",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "instructionFont",
    availability: "now",
    example: "Georgia",
    explanation:
      'instructionFont (default empty) sets the font used to display instructions to the participant. The parameter"font" applies to the target and stimulus text, and instructionFont applies to the instructional text. Four cases are selected by instructionFontSource=\ndefaultForLanguage: We recommend leaving instructionFont blank and setting instructionFontSource to defaultForLanguage, which will result in using whatever font is recommended by the EasyEyes International Phrases sheet for the chosen instructionLanguage. This allows runtime selection of instructionLanguage by the participant. For each language, the EasyEyes International Phrases table recommends a font from the Noto serif family, which are all served by Google Fonts.\nfile:  instructionFont is the file name (including extension .woff2, .woff, .otf, or .ttf) of a font in your Fonts folder in your Pavlovia account. Be sure that your font can render the characters of the instructionLanguage you pick. \ngoogle: instructionFont is a filename (including extension) of a font on the Google Fonts server.\nserver: instructionFont is a URL pointing to the desired font on a font server, e.g. Adobe. ("server" support is coming.)\nbrowser: instructionFont should be a string for the browser expressing your font preference.\n     Noto Fonts. The EasyEyes International Phrases table recommends the appropriate "Noto" font, available from Google and Adobe at no charge. Wiki says, "Noto is a font family comprising over 100 individual fonts, which are together designed to cover all the scripts encoded in the Unicode standard." Various fonts in the Noto serif family cover all the worlds languages that are recognized by unicode. https://en.wikipedia.org/wiki/Noto_fonts  \nWe plan to use the free Google Fonts server, which serves all the Noto fonts.\n     Runtime language selection. To allow language selection by the participant at runtime, we will ask the Google Fonts server to serve an appropriate font (from the Noto Serif family) as specified by the EasyEyes International Phrases sheet. \n     Fonts load early. We\'ll get the browser to load all needed fonts at the beginning of the experiment, so the rest of the experiment can run without internet or font-loading delay. Of course, we hope the computer eventually reconnects to send the experiment\'s data to Pavlovia, where the scientist can retrieve it.',
    type: "text",
    default: "Verdana",
    categories: "",
  },
  {
    name: "instructionFontColorRGBA",
    availability: "now",
    example: "",
    explanation:
      'instructionFontColorRGBA (default 0,0,0,1, i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify the color of the text generated by several instructional parameters, including instructionFor*, showConditionNameBool, showCounterBool, showViewingDistanceBool, and showTargetSpecsBool. The "RGB" values are the red, green, and blue channels. The "A" value controls opacity (0 to 1). Use screenColorRGB to control the background color. The foreground color controls are fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, and targetColorRGBA. The background color control is screenColorRGBA.',
    type: "text",
    default: "0,0,0,1",
    categories: "",
  },
  {
    name: "instructionFontLeftToRightBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "instructionFontLeftToRightBool should be set to TRUE for most languages, including English, which are written from left to right, and should be set to FALSE for Arabic, Hebrew, and other right-to-left languages. The default value is TRUE. For identifying letters, the letters will be placed accordingly on the response screen. For reading, it's important to set this correctly, or text may fall off the screen: left-to-right text will be left-aligned, and right-to-left text will be right aligned.                                                                                                                                                                                      ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "instructionFontSizePt",
    availability: "now",
    example: "25",
    explanation:
      "instructionFontSizePt (default 25) specifies the point size of the font used for instructions.",
    type: "numerical",
    default: "17",
    categories: "",
  },
  {
    name: "instructionFontSource",
    availability: "now",
    example: "browser",
    explanation:
      'instructionFontSource (default is browser) must be file, google, server, or browser. 🕑 "server" support is coming. See fontSource for explanation.',
    type: "categorical",
    default: "browser",
    categories: "file, google, browser",
  },
  {
    name: "instructionForBlock",
    availability: "now",
    example: "",
    explanation:
      "⭑ instructionForBlock (empty default, which has no effect) is instructional text to be presented once at the beginning of the block, before running any trial of any condition. This text replaces whatever were the condition's default instructions, which depend on targetTask and targetKind. An empty field requests the default text, so write #NONE to suppress block instructions for this condition. The text is line-wrapped to fit, and any carriage returns in the text are expressed. Use the string #PAGE_BREAK to insert a page break. You can use an unlimited number of pages. You should normally end each page with the symbol #PROCEED, which will be replaced by text telling the participant how to continue to the next page: offering one or both of hitting RETURN and clicking the PROCEED button, as appropriate given the setting of the responseClickedBool and responseTypedBool parameters (see https://trello.com/c/OI2CzqX6). If the block has multiple conditions, then EasyEyes will present every unique set of block instructions, one after another, before the first trial. FUTURE: Support Markdown to allow simple formatting, including italic and bold. FUTURE: We add a new parameter instructionURL that accepts a URL to a Google Sheets doc, similar to EasyEyes International Phrases, but set up by the Scientist, and when it's provided, instructionForXXX, rather than text, expects a phrase name, like EE_Welcome, and  pulls from that Sheets doc the named phrase in the current language. \n",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "instructionForExperiment",
    availability: "now",
    example: "",
    explanation:
      "🕑 instructionForExperiment (empty default, which has no effect) is instructional text to be presented once at the beginning of the whole experiment, before beginning the first block. It can appear in any condition, e.g. in the last condition of the last block, but is presented first, before the first first block. If instructionForExperiment is defined in more than one condition in the experiment, then the several instances are concatenated, in their order of appearance in the experiment spreadsheet after shuffling. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "instructionForResponse",
    availability: "now",
    example: "",
    explanation:
      "⭑ instructionForResponse (empty default, which has no effect) is instructional text, to be presented after each stimulus of this condition, that reminds the participant how to respond to the stimulus, e.g. clicking or typing to identify, detect, or rate. This text replaces whatever were the condition's default instructions, which depend on targetTask and targetKind. An empty field requests the default text, so write #NONE to suppress response instructions for this condition. The text is line-wrapped to fit, and any carriage returns in the text are expressed. We typically ask the participant to respond by clicking one or more buttons indicating their selection(s). We rarely use the standard #PROCEED symbol here. FUTURE: Support Markdown to allow simple formating, including italic and bold. FUTURE: If the participant has requested translation to another language, then we use Google Translate to do so. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "instructionForResponseWhere",
    availability: "now",
    example: "topLeft",
    explanation:
      '🕑 instructionForResponseWhere can be topLeft (the default), bottomLeft, or none. This is shown after the stimulus disappears, to instruct the participant how to respond. A typical instruction for the identification task is: "Type your best guess for what middle letter was just shown." ',
    type: "categorical",
    default: "topLeft",
    categories: "none, topLeft, bottomLeft",
  },
  {
    name: "instructionForStimulus",
    availability: "now",
    example: "",
    explanation:
      "⭑ instructionForStimulus (empty default, which has no effect) is instructional text, to be shown immediately before each stimulus of this condition, that tells the participant how to request the stimulus. This text replaces whatever were the condition's default instructions, which depend on targetTask and targetKind. An empty field requests the default text, so write #NONE to suppress stimulus instructions for this condition. The text is line-wrapped to fit, and any carriage returns in the text are expressed. To initiate a trial we typically ask the participant to click the center of a crosshair or hit the SPACE BAR. We rarely use the standard #PROCEED symbol here. If the participant has requested translation to another language, then we use Google Translate to do so. FUTURE: Support Markdown to allow simple formating, including italic and bold. FUTURE: If the participant has requested translation to another language, then we use Google Translate to do so. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "instructionForStimulusLocation",
    availability: "now",
    example: "upperLeft",
    explanation:
      "instructionForStimulusLocation (default upperLeft) indicates where the stimulus instructions should be placed on the screen: top, upperLeft, or upperRight. If you select top, then the text will be at the top of the screen, using the full width of the screen (allowing modest right and left margins), aligned with the left or right side of the display, as guided by whether instructionFontLeftToRightBool is TRUE or FALSE. When you select upperLeft or upperRight, EasyEyes will break the text up into short lines of text, to present it as a roughly square block of text in the upper left or right corner, which may help keep the text far from the target.",
    type: "categorical",
    default: "upperLeft",
    categories: "top, upperLeft, upperRight",
  },
  {
    name: "instructionLanguage",
    availability: "now",
    example: "Italian",
    explanation:
      '🕑 English name for the language used for instructions to the participant. It must be "participant" or match one of the entries in the second row of the EasyEyes International phrases sheet. If you enter "participant", then the participant will be allowed to select the instruction language from a pull-down menu.',
    type: "categorical",
    default: "English",
    categories: "",
  },
  {
    name: "internationalPhrasesURL",
    availability: "now",
    example: "",
    explanation:
      "🕑 internationalPhrasesURL accepts a URL to a Google Sheets doc, similar to EasyEyes International Phrases, but set up by the Scientist. When it's provided in a condition, the instructionForXXX parameters for that condition, rather than literal text, accept a phrase name, like EE_Welcome, and pull the named phrase in the current language from the Sheets doc pointed to by internationalPhrasesURL. internationalPhrasesURL can provide a URL (same or different) for each condition that needs it. Each condition operates independently of the rest. For the table to be valid it must include the first 4 rows of the EasyEyes International Phrases: language, EE_languageDirection, EE_languageUseSpace, EE_languageFont. Allowing multiple phrase tables with different language coverage seems needlessly confusing for all concerned, so just copy the first four rows (all the columns) of the EasyEyes International Phrases spreadsheet, and add new rows below, one for each new phrase. Our international phrases doc is designed to make it easy for us to add new languages (by adding a new column for each language). Please send your request to denis.pelli@nyu.edu. He will need to know: the ISO two-letter code for the language (https://www.sitepoint.com/iso-2-letter-language-codes/), the language direction (left to right or right to left), and whether it uses spaces. Once EasyEyes adds a new language, the EasyEyes compiler will insist that every scientist's internationalPhrasesURL Google Sheets doc also include that language. ",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "internationalTableURL",
    availability: "now",
    example: "",
    explanation:
      '🕑 internationalTableURL (default is URL of this table) is the URL of a Google Sheets table of international phrases to be used to give instructions throughout the experiment. A scientist can substitute her own table, presumably a modified copy of this one (the EasyEyes International Phrases Table). https://docs.google.com/spreadsheets/d/1UFfNikfLuo8bSromE34uWDuJrMPFiJG3VpoQKdCGkII/edit#gid=0\nThis table allows the Participant page to make all non-stimulus text international. In every place that it displays instruction text, the Participant page looks up the mnemonic code for the needed phrase in the instruction table, to find a unicode phrase in the selected instructionLanguage (e.g. English, German, or Arabic). It\'s a Google Sheets file called "EasyEyes International Phrases".\nhttps://docs.google.com/spreadsheets/d/1AZbihlk-CP7sitLGb9yZYbmcnqQ_afjjG8h6h5UWvvo/edit#gid=0\nThe first column has mnemonic phrase names. Each of the following columns gives the corresponding text in a different language. After the first column, each column represents one language. Each row is devoted to one phrase. The second row is languageNameEnglish, with values: English, German, Polish, etc. The third row is languageNameNative, with values: English, Deutsch, Polskie, etc. \n     We incorporate the latest "EasyEyes International Phrases" file when we compile threshold.js. For a particular experiment, we only need the first column (the mnemonic name) and the column whose heading matches instructionLanguage. We should copy those two columns into a Javascript dictionary, so we can easily look up each mnemonic phrase name to get the phrase in the instructionLanguage. To display any instruction, we will use the dictionary to convert a mnemonic name to a unicode phrase. \n     languageDirection. Note that most languages are left to right (LTR), and a few (e.g. Arabic, Urdu, Farsi, and Hebrew) are right to left (RTL). Text placement may need to take the direction into account. The direction (LTR or RTL) is provided by the languageDirection field.\n     languageNameNative. If we later allow the participant to choose the language, then the language selection should be based on the native language name, like Deustch or Polskie, i.e. using languageNameNative instead of languageNameEnglish.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "invitePartingCommentsBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 Setting invitePartingCommentsBool (default FALSE) TRUE tells EasyEyes, at the end of this block, to invite the participant to make parting comments. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "logQuestBool",
    availability: "now",
    example: "",
    explanation:
      "logQuestBool (default FALSE) enables logging of Quest activity in the browser Console.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markDot",
    availability: "now",
    example: "",
    explanation:
      '❌ WILL SOON BE REPLACED BY A SET OF PARAMETERS, e.g. markDotDiameterDeg, WHICH OFFER THE SAME SERVICE WITH SELF-DOCUMENTING PARAMETER NAMES. markDot: Until the target appears, display a dot. It accepts several arguments as comma-separated values. Diameter zero (the default) request no dot.\n▶ xDeg, yDeg, diameterDeg, colorRGBA\nxDeg and yDeg (default 0,0) are coordinates of the dot center relative to the nominal fixation location (which a moving crosshair circles around).  \ndiameterDeg (default 0) is the dot diameter. Diameter zero requests no dot.\ncolorRGBA (default black) is four comma separated values. 0,0,0,1 is black, 1,1,1,1 is white. The fourth number "A" is alpha, which weights the blending; use 1 for 100% color. Each of the four values ranges 0 to 1.',
    type: "text",
    default: "0,0,0,0,0,0,1",
    categories: "",
  },
  {
    name: "markDotColorRGBA",
    availability: "now",
    example: "",
    explanation:
      '🕑 markDotColorRGBA (default 0,0,0,1 i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify the color of the dot. "RGB" are the red, green, and blue channels. "A" controls opacity (0 to 1). 0,0,0,1 is black and 1,1,1,1 is white. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA.',
    type: "text",
    default: "0,0,0,1",
    categories: "",
  },
  {
    name: "markDotDiameterDeg",
    availability: "now",
    example: "",
    explanation:
      "🕑 markDotDiameterDeg (default 0) is the dot diameter. Display a dot until the target appears. Diameter zero disables the dot.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "markDotTrackFixationBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 markDotTrackFixationBool (default FALSE) specfies:\nif FALSE, that the dot position is relative to the fixed nominal fixation or, \nif TRUE, relative to the (possibly moving) crosshair location. In this case, when the crosshair moves, the dot will move with it.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markDotXYDeg",
    availability: "now",
    example: "",
    explanation:
      "🕑 markDotXYDeg (default 0,0) is the (x,y) coordinate of the dot center relative to the origin, which is selected by markDotTrackFixationBool.",
    type: "text",
    default: "0,0",
    categories: "",
  },
  {
    name: "markFlies",
    availability: "now",
    example: "",
    explanation:
      '❌ WILL SOON BE REPLACED BY A SET OF PARAMETERS, e.g. markFliesNumber, WHICH OFFER THE SAME SERVICE WITH SELF-DOCUMENTING PARAMETER NAMES. markFlies: Until the target appears, display a swarm of moving "flies" (each like a crosshair) that make it hard to get the cursor to track the real crosshair (typically moving) unless your eye is on it. The flies are confined to a circular area with radius radiusDeg centered on either the actual (typically moving) crosshair or the (static) nominal fixation position at the center of the crosshair motion. Each fly moves a fixed radial distance degPerSec/fHz from frame to frame, where fHz is the frame rate (e.g. 60) and degPerSec is the speed. On each frame, each fly moves in a random direction. Any fly whose center is more than radiusDeg from the circle\'s center disappears (dies) and is replaced by a new fly at a random location in the circle. markFlies accepts several arguments as comma separated values:\n▶ n, radiusDeg, degPerSec, centeredOnNominalFixationBool, thicknessDeg, lengthDeg, colorRGBA\ncenteredOnNominalFixationBool (default TRUE) centers the circular fly area on, if TRUE, the nominal fixation location (that the crosshair circles around), otherwise centers on the moving crosshair.\nn (default 0, i.e. none) is the number of flies. Setting n=0, the default, disables markFlies.\nradiusDeg (default 1) is the radius of the circular area that the flies are confined to.\ndegPerSec (default 0.3) is the speed (change in position from one frame to next per frame duration).\nthicknessDeg (default 0.05) is the line thickness.\nlengthDeg (default 2) is the length of each of the two lines that make one "fly".\ncolorRGBA (default blue: 0,0,1,1) follows the same conventions as targetColorRGBA. "0,0,0,1" is black, "1,1,1,1" is white; "1,0,0,1" is red. Last number is alpha, the weight assigned to this color (instead of what\'s behind it).',
    type: "text",
    default: "0,1,0.3,FALSE,0.05,2,0,0,1,1",
    categories: "",
  },
  {
    name: "markFliesColorRGBA",
    availability: "now",
    example: "",
    explanation:
      '🕑 markFliesColorRGBA (default 0,0,0,1 i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify the color of the dot. RGB are the red, green, and blue channels. "A" controls opacity (0 to 1). 0,0,0,1 is black, 1,1,1,1 is white. We recommend blue flies: 0,0,1,1. They are obviously different from a fixated black crosshair, yet strongly group with a peripherally viewed crosshair. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA.',
    type: "text",
    default: "0,0,1,1",
    categories: "",
  },
  {
    name: "markFliesGravity",
    availability: "now",
    example: "",
    explanation:
      "markFliesGravity (default 0) simulates gravitational attraction (or repulsion) between flies. This modifies the path of flies generated by markFliesNumber, and does nothing if there are no flies. In physics the gravitational constant is positive. Here the scientist will usually want negative gravity, so the flies repel one another, to fill voids in fly coverage. This is implemented at each frame update by running a loop that considers all the possible pairings of flies. For each pair, a vector is added to each fly's position. Each vector is colinear with the line connecting the two flies. The two vectors have equal length hDeg and opposite directions. Compute the distance dDeg between two flies. Both displacement vectors have length hDeg,  \nhDeg=gravity/(fHz*dDeg^2).\nPositive gravity is attraction, and the vectors point inwards, from one fly to the other. Negative gravity is repulsion, and the vectors point outward. ",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "markFliesLengthDeg",
    availability: "now",
    example: "",
    explanation:
      '🕑 markFliesLengthDeg (default 2) is the length of each of the two lines that make the cross that is one "fly".',
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "markFliesNumber",
    availability: "now",
    example: "",
    explanation:
      '🕑 markFliesNumber (default 0): Until the target appears, display a swarm of moving "flies" (each a cross, like the crosshair) that make it hard to get the cursor to track the moving crosshair unless your eye is on it. The flies are confined to a circular area with radius radiusDeg centered on either the actual (typically moving) crosshair or the (static) nominal fixation position at the center of the crosshair motion. On each frame, each fly moves a fixed distance degPerSec/fHz in a random direction where fHz is the frame rate (e.g. 60) and degPerSec is the speed. Any fly whose center is more than radiusDeg from the circle\'s center disappears (dies) and is replaced by a new fly at a random location in the circle. Each fly is a cross. Several parameters specify the flies and their motion.\nmarkFliesColorRGBA (default blue: 0,0,1,1) follows the same conventions as targetColorRGBA. "0,0,0,1" is black, "1,1,1,1" is white; "1,0,0,1" is red. Last number is alpha, the weight assigned to this color (instead of what\'s behind it).\nmarkFliesGravity (default 0) simulates positive or negative gravity among the flies. Negative gravity (repulsion) helps the flies fill the space more uniformly, making it less likely that the crosshair will be in an area without flies.\nmarkFliesLengthDeg (default 2) is the length of each of the two lines that make one "fly".\nmarkFliesRadiusDeg (default 1) is the radius of the circular area that the flies are confined to.\nmarkFliesThicknessDeg (default 0.05) is the line thickness.\nmarkFliesTrackFixationBool (default FALSE) centers the circular fly area on, if FALSE, the fixed nominal fixation location (that the crosshair circles around), otherwise centers on the (possibly moving) crosshair.',
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "markFliesRadiusDeg",
    availability: "now",
    example: "",
    explanation:
      "🕑 markFliesRadiusDeg (default 1.5) is the radius of the circular area that the flies are confined to.",
    type: "numerical",
    default: "1.5",
    categories: "",
  },
  {
    name: "markFliesSpeedDegPerSec",
    availability: "now",
    example: "",
    explanation:
      "🕑 markFliesSpeedDegPerSec (default 0.3) is the speed (change in position from one frame to next per frame duration).",
    type: "numerical",
    default: "0.2",
    categories: "",
  },
  {
    name: "markFliesThicknessDeg",
    availability: "now",
    example: "",
    explanation:
      "🕑 markFliesThicknessDeg (default 0.05) is the line thickness.",
    type: "numerical",
    default: "0.05",
    categories: "",
  },
  {
    name: "markFliesTrackFixationBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 markFliesTrackFixationBool (default FALSE) centers the circular fly area on:\nif FALSE, the fixed nominal fixation location (that the crosshair circles around), \nif TRUE, centers on the (possibly moving) crosshair.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markGrid",
    availability: "now",
    example: "",
    explanation:
      'markGrid: Until the target appears, display a square grid as a static background centered on the nominal fixation location (which the moving crosshair circles around). Grid center is midway between two gridlines.  markGrid accepts several arguments as comma-separated values:\n▶ spacingDeg, thicknessDeg, lengthDeg, colorRGBA\nspacingDeg (default 0.5) is the center-to-center line spacing in both x and y.\nthicknessDeg (default 0.03) is the line thickness.\nlengthDeg (default 0, i.e. no grid) is the length of each grid line.\ncolorRGBA has same rules as targetColorRGBA. "0,0,0,1" is black; "1,0,0,1" is red; "1,1,1,1" is white. Last number is alpha, the weight (0 to 1) assigned to this color (as opposed to what\'s behind it).',
    type: "text",
    default: "0.5,0.05,0,0,0,0,1",
    categories: "",
  },
  {
    name: "markingBlankedNearTargetBool",
    availability: "now",
    example: "TRUE",
    explanation:
      '⭑ Setting markingBlankedNearTargetBool TRUE (default FALSE) suppresses any parts of the fixation cross or target X that are too close to the possible targets in this conditionGroup. This enables both meanings of "too close": markingBlankingRadiusReEccentricity and markingBlankingRadiusReTargetHeight.\nUseful with any target eccentricity.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markingBlankingRadiusReEccentricity",
    availability: "now",
    example: "0.5",
    explanation:
      "⭑ So that markings don't crowd the target, the closest that a marking pixel can be to the target center is specified by setting markingBlankingRadiusReEccentricity to the fraction (default 0.5) of the target's radial eccentricity.\nUseful with a peripheral target.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "markingBlankingRadiusReTargetHeight",
    availability: "now",
    example: "2",
    explanation:
      "⭑ So that markings don't mask the target, the closest that a marking pixel can be to the traget center is specified by setting markingBlankingRadiusReTargetHeight (default 1) to the fraction of target height.\nUseful with any target eccentricity.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "markingClippedToStimulusRectBool",
    availability: "now",
    example: "FALSE",
    explanation:
      '⭑ markingClippedToStimulusRectBool TRUE requests that fixation and target marking be restricted to the stimulus rect, protecting the screen margins. Otherwise they are allowed to extend to the screen edges, a "full bleed".',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "markingColorRGBA",
    availability: "now",
    example: "",
    explanation:
      'markingColorRGBA (default 0,0,0,1 i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify the color of the marks (for fixation, target, etc.). "RGB" are the red, green, and blue channels. "A" controls opacity (0 to 1). 0,0,0,1 is black, 1,1,1,1 is white. Use screenColorRGBA to control the background color. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA.',
    type: "text",
    default: "0,0,0,1",
    categories: "",
  },
  {
    name: "markingFixationAfterTargetOffsetBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 markingFixationAfterTargetOffsetBool (default TRUE) determines whether the crosshair (if present) is erased along with the target. ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "markingFixationAfterTargetOnset",
    availability: "now",
    example: "",
    explanation:
      "markingFixationAfterTargetOnset (default freeze) determines what happens to the crosshair when the target appears. There are four cases:\n* disappear: At target onset the crosshair is erased.\n* freeze: At target onset the crosshair stops moving and persists. \n* continueMovingButIndependently: At target onset the crosshair continues moving (or not moving) but the origin (of the deg coordinate system) remains at the point where the crosshair was when the target appeared, so the crosshairs motion won’t affect the target etc. For a static crosshair this option is equivalent to freeze. This option complicates target drawing so it will only be supported for some target kinds. The compiler will reject unsupported combinations. \n* continueMovingAsOrigin: At target onset the crosshair continues moving (or not moving) and the origin (of the deg coordinate system) moves with it as usual. For a static crosshair this option is equivalent to freeze. This option complicates target drawing so it will only be supported for some target kinds. The compiler will reject unsupported combinations. \n",
    type: "categorical",
    default: "freeze",
    categories:
      "disappear, freeze, continueMovingButIndependently, continueMovingAsOrigin",
  },
  {
    name: "markingFixationDuringTargetBool",
    availability: "now",
    example: "",
    explanation:
      "markingFixationDuringTargetBool (default TRUE) causes the crosshair to remain visible during the target presentation. If FALSE, then the crosshair is erased at target onset.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "markingFixationHotSpotRadiusDeg",
    availability: "now",
    example: "0.05",
    explanation:
      "markingFixationHotSpotRadiusDeg (default 0.3 deg) is the radius, in deg, of the hot spot in the fixation cross. The hot spot is the disk-shaped area that can be clicked with the tip of the cursor.\n     Used with responseMustTrackContinuouslyBool=TRUE.\n     Tracking a moving crosshair demands good eye-hand coordination. Teenagers can handle a hot-spot raidus of 0.1 deg. People over 30 need at least 0.15 deg. We anticipate that children will need 0.2 or more deg.\n     Typically you’ll want to limit the success of the participant strategy (invented by Maria Pombo) that fixates the crosshair to place the cursor on it, and then looks away (e.g. to the anticipated target location). This strategy relies on the crosshair moving so slowly that the cursor remains within the hotspot for the required interval. We can defeat that strategy by making the minimum crosshair travel distance (product of speed and min tracking duration) at least double the hotspot radius.\nresponseTrackingMinSec*markingFixationMotionSpeedDegPerSec > 2*markingFixationHotSpotRadiusDeg\nObeying this rule of thumb, I’m currently using a minimum tracking duration of 1 sec, a speed of 0.4 deg/sec, and a hot spot radius of 0.2 deg.",
    type: "numerical",
    default: "0.1",
    categories: "",
  },
  {
    name: "markingFixationMotionPath",
    availability: "now",
    example: "",
    explanation:
      "markingFixationMotionPath (default circle) selects which kind of path the moving crosshair follows. In both cases, markingFixationMotionRadiusDeg specifies the radius of a circle centered on the fixed nominal fixation point.\n• circle: the crosshair moves along the circle with speed markingFixationMotionSpeedDegPerSec. The starting point on the circle is random.\n• randomWalk: on each frame, the crosshair takes a step in a random direction with speed markingFixationMotionSpeedDegPerSec. If the step would land outside the circle, it instead reflects off the circle back into the circular area. One step can have many reflections. The initial starting point is a random location in the circular area.\nUsed with responseMustTrackContinuouslyBool=TRUE.",
    type: "categorical",
    default: "circle",
    categories: "circle, randomWalk",
  },
  {
    name: "markingFixationMotionRadiusDeg",
    availability: "now",
    example: "0.5",
    explanation:
      "markingFixationMotionRadiusDeg (default 0 deg, i.e. no motion) is the radius of the circular trajectory of the crosshair about the origin. When the radius is zero, there is no motion. A negative radius should generate a compiler error. Used with responseMustTrackContinuouslyBool =TRUE. ",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "markingFixationMotionSpeedDegPerSec",
    availability: "now",
    example: "",
    explanation:
      "markingFixationMotionSpeedDegPerSec (default 0.3) is the speed, in deg/sec, of the crosshair as it revolves around the origin. The time to do a full revolution (sec), i.e. one period, will be 2*pi*markingFixationMotionRadiusDeg/markingFixationMotionSpeedDegPerSec. Used with responseMustTrackContinuouslyBool=TRUE. Don't zero this to disable motion. To disable motion, set markingFixationMotionRadiusDeg = 0 (which is the default).",
    type: "numerical",
    default: "0.3",
    categories: "",
  },
  {
    name: "markingFixationStrokeLengthDeg",
    availability: "now",
    example: "1",
    explanation:
      "⭑ markingFixationStrokeLengthDeg (default 2 deg) specifies the stroke length in the fixation cross. The cross consists of two strokes, one horizontal, one vertical. Thus this is a diameter, unless the other marking parameters, which are mostly radii. Setting this to a large value (e.g. 100) will produce a fixation cross that extends from edge to edge of the display, which may help restore salience of a cross despite blanking of the cross near possible target locations. You can avoid colliding with a peripheral target by setting this short, or by leaving it long and setting markingBlankingRadiusReTargetHeight.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "markingFixationStrokeThickening",
    availability: "now",
    example: "",
    explanation:
      'markingFixationStrokeThickening (default 1.4) specifies a thickness multiplier when the fixation mark is "bold". Currently the bold effect is only used to indicate that the cursor is in the hotspot (i.e. the cursor tip is within markingFixationHotSpotRadiusDeg of the center of the crosshair). The multiplier is greater than or equal to zero, so it can shrink or expand the crosshair stroke thickness. Setting it to 1, the default, disables bolding. ',
    type: "numerical",
    default: "1.4",
    categories: "",
  },
  {
    name: "markingFixationStrokeThicknessDeg",
    availability: "now",
    example: "0.03",
    explanation:
      "markingFixationStrokeThicknessDeg (default 0.05 deg) sets stroke thickness in the fixation cross.",
    type: "numerical",
    default: "0.05",
    categories: "",
  },
  {
    name: "markingOffsetBeforeTargetOnsetSecs",
    availability: "now",
    example: "0.3",
    explanation:
      "⭑ Pause for markingOffsetBeforeTargetOnsetSecs before target onset to minimize forward masking of the target by the preceding fixation and target markings. You should leave this at zero (default) when the target is peripheral, because you don't want to give the participant time to foveate the peripheral target. Thus we expect this parameter to be nonzero only when the target is foveal. In that case it may be wise to give enough time (e.g. 0.3 s) to prevent forward masking of the target by the fixation cross. Forward masking of the target by the fixation cross can also be reduced by blanking the cross near the target, as controlled by markingBlankedNearTargetBool. Especially useful with a foveal target.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "markingOnsetAfterTargetOffsetSecs",
    availability: "now",
    example: "0.2",
    explanation:
      "⭑ markingOnsetAfterTargetOffsetSecs (default 0): After target offset, pause this amount before onset of response screen or fixation and target markings to minimize backward masking of the target. Especially useful with a foveal target.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "markingShowCursorBool",
    availability: "now",
    example: "",
    explanation:
      "markingShowCursorBool (default TRUE) when TRUE requests that the cursor be shown while waiting for the stimulus. When FALSE, the cursor remains hidden until the response screen, which shows the cursor or not depending on responseClickBool.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "markingTargetStrokeLengthDeg",
    availability: "now",
    example: "1",
    explanation:
      "markingTargetStrokeLengthDeg (default 1) set the stroke length in the X marking the possible target location. ",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "markingTargetStrokeThicknessDeg",
    availability: "now",
    example: "0.03",
    explanation:
      "markingTargetStrokeThicknessDeg (default 0.03) set the atroke thickness in the X marking the possible target location.",
    type: "numerical",
    default: "0.03",
    categories: "",
  },
  {
    name: "markTheFixationBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "markTheFixationBool (default TRUE), when true, draws a fixation cross. This will collide with a foveal target unless you prevent collision by using markingBlankingRadiusReTargetHeight or markingOffsetBeforeTargetOnsetSecs and markingOnsetAfterTargetOffsetSecs. Regardless of this parameter, we don't show fixation when targetRepeatsBool is TRUE. In that can we cover a large area of the screen with repeated targets. ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "markThePossibleTargetsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "Setting markThePossibleTargetsBool TRUE (default FALSE), draws an X at every possible target location, considering all conditions in this conditionGroup. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "maskerBaseFrequencyMultiplier",
    availability: "now",
    example: "2",
    explanation:
      "maskerBaseFrequencyMultiplier (default 2). Compute base frequency of a mask melody by multiplying the target frequency by this factor. If there are two melodies then the second melody has base frequency given by target frequency divided by this factor.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "maskerSoundDBSPL",
    availability: "now",
    example: "-100",
    explanation:
      "⭑ maskerSoundDBSPL (default -100) is sound level of the masker in dB SPL.",
    type: "numerical",
    default: "-100",
    categories: "",
  },
  {
    name: "maskerSoundFolder",
    availability: "now",
    example: "sounds",
    explanation:
      "⭑ The name of a folder of sound files (each file can be in WAV or AAC format), to be used when targetKind is sound. The folder is submitted as a zip archive to the EasyEyes drop box, and saved in the Pavlovia account in the Folders folder. The name of the zip archive, without the extension, must match the value of maskSoundFolder. See targetSoundFolder for comments on the WAV and ACC file formats.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "maskerSoundPhrase",
    availability: "now",
    example: "",
    explanation:
      'maskerSoundPhrase is a text phrase that is used when targetKind is 16ChannelSound. The phrase consists of a series of words and category names, with each category name preceded by #. Currently the maskerSoundPhrase is "Ready #CallSign GoTo #Color #Number Now". Every word must appear as a sound file with that name, and every category must appear as a folder with that name, both in the current talker folder in the maskerSoundFolder.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "measureLuminanceBool",
    availability: "now",
    example: "",
    explanation:
      "measureLuminanceBool (default FALSE) turns on sampling by the photometer during stimulus presentation. (It is currently implemented solely for targetKind='movie'.) This uses the Cambridge Research Systems Colorimeter, which must be plugged into a USB port of the computer and pointed at whatever you want to measure. (Tip: An easy way to stably measure from a laptop screen is to lay the screen on its back and rest the photocell, gently, directly on the screen.) Use measureLuminanceDelaySec and measureLuminanceHz to set the start time from movie onset and sampling rate. After sampling the stimulus, EasyEyes saves a data file called luminance-EXPERIMENT-BLOCK-CONDITIONNAME-TRIAL.csv into the Downloads folder, where EXPERIMENT is the experiment name, BLOCK is the block number, CONDITIONNAME is the conditionName, and TRIAL is the trial number in the block. \nThe luminance*.csv file has four columns: \nframeTimeSec, movieValue, luminanceTimeSec, luminanceNits\n• frameTimeSec is when  (in fractional seconds) the frame is presented, relative to beginning of movie. The first value is zero, and it increments by 1/movieHz. There is one frame (and frameTimeSec value) for each value of movieValues.\n• movieValues is copied from the input parameter array movieValues. \n• luminanceTimeSec is time of measurement relative to the beginning of movie. Its first value is measureLuminanceDelaySec and each subsequent value increases by 1/measureLuminanceHz.\n• luminanceNits is measured luminance in nits. (A nit is also called cd/m^2, candelas per meter squared.) \nNOTES: measureLuminanceDelaySec and thus luminanceTimeSec can be negative. The frameTimeSec and luminanceTimeSec columns will be aligned only when measureLuminanceHz == movieHz.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "measureLuminanceDelaySec",
    availability: "now",
    example: "",
    explanation:
      "measureLuminanceDelaySec (default 5) sets the delay (which can be negative) from stimulus onset to taking of the first luminance sample. Note that the CRS Colorimeter is designed for slow precise measurements. To achieve better than 12-bit precision, if you want the reading of a new luminance to be unaffected by the prior luminance, we recommend allowing 5 s for the device to settle at the new luminance before taking a reading. Thus, if targetKind=='movie', you might run your movie with 6 s per frame (i.e. movieHz=measureLuminanceHz=1/6) and set measureLuminanceDelaySec=5.",
    type: "numerical",
    default: "5",
    categories: "",
  },
  {
    name: "measureLuminanceHz",
    availability: "now",
    example: "",
    explanation:
      "measureLuminanceHz (default 1) sets the rate that the photometer is sampled. Note that the CRS Colorimeter is designed for slow precise measurements. If the stimulus is a movie, you'll typically set this frequency to match the frame rate of the movie. We recommend a slow frame rate, e.g. movieHz=measureLuminanceHz=1/6.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "measureLuminancePretendBool",
    availability: "now",
    example: "",
    explanation:
      "measureLuminancePretendBool (default FALSE) allows testing of the timing of the luminance measurement without a photometer. The luminance returned is always -1. Strictly for debugging.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "movieComputeJS",
    availability: "now",
    example: "",
    explanation:
      '⭑ movieComputeJS holds the filename (including extension “.js”) of a JavaScript program to compute an HDR movie. A one-frame movie will display a static image for the specified targetDurationSec. movieComputeJS is used if and only if the targetKind is movie. When the experiment is compiled, the movie program must already have been uploaded through the EasyEyes submission box. The program must define and fill the “movieNit” array. The program can use several predefined variables, including: movieRectPx, tSec, xyDeg, xDeg, and yDeg, as well as the EasyEyes input parameters targetContrast, targetEccentricityXDeg, targetEccentricityYDeg, targetCyclePerDeg, targetHz, targetPhaseDeg, targetOrientationDeg (clockwise from vertical), targetSpaceConstantDeg (the 1/e radius), targetTimeConstantSec, movieRectDeg, and movieLuminanceNit. When EasyEyes reads your compute js file, it processes the list of argument in the function definition. You can include any of the INPUT PARAMETERS defined in this GLOSSARY in your list of arguments. At runtime, EasyEyes will retrieve their values and provide whichever input parameters the argument list specifies.\n\nTIMING: Each movie trial reports timing data in the CSV results file. Each movie trial, computes a movie by first running the scientist\'s movieComputeJS and then passing it through the ffMPEG encoder. Here are some results using tiltedFlickeringGrating.js on Chrome on a MacBook Pro (13-inch, M1, 2020), asking ffMPEG to use the avc1 : libx264 codec. Total prep time (watching the wait icon) grows linearly with the product of pixels per frame and number of frames. \ntimeSec = 1 + MPix*frames/4\nwhere timeSec is the prep time in seconds, MPix means a mega pixel, i.e. one million pixels, and frames is the number of frames in the movie. 25% of this is the runtime of the tiltedFlickeringGrating.js, and 75% is ffMPEG. The formula for just ffMPEG is\nffMpegSec = 0.7 + MPix*frames/6\nThe 6 MPix/s rate seems fine. The fixed 0.7 s overhead is surprising. We don\'t yet know what it\'s doing during that time.\n\nTIMING DATA IN CSV FILE, for each trial\ncomputeMovieArraySec, e.g. 1.1. The time (in sec) spent in the scientist’s movie.js to prepare compute the movie for this trial.\ncomputeFfmpegSec, e.g. 2.1, The time (in sec) spent in ffMPEG to encode the movie for this trial\ncomputeTotalSec, e.g. 3.2, Total time (in sec) preparing the movie for this trial.\ncomputePixels, e.g., 1000000, The number of pixels in each frame.\ncomputeFrames, e.g. 10, The number of frames in the movie.\ncomputeCodec is the name is of the codec, different for Chrome and Safari.\n\n(NOT UP TO DATE) ADVICE ON HOW TO WRITE YOUR JavaScript MOVIE ROUTINE\nxyDeg is a 2*width*height float array, which provides the exact x,y visual coordinate of each screen pixel in movieRectPx. \nxDeg and yDeg are float vectors, which provide approximate visual coordinates of the screen pixels in movieRectPx. \nTo compute a (possibly one-frame) movie as a visual stimulus, we usually need the visual coordinate of each pixel. EasyEyes provides the width*height*2 array xyDeg[i,j,k], where each 2-number element (indexed by k) is the x,y position in deg of pixel i,j. Use of the xyDeg array does not allow speed up by computational separation of x and y, so you may prefer to use the separable approximation provided by the width-long vector xDeg and height-long vector yDeg, which provide approximate visual coordinates of the pixels in movieRectPx. (Note: xyDeg takes time and space for EasyEyes to compute, and not all movieComputeJS programs need it, so EasyEyes skips making xyDeg if the string  "xyDeg" is not found in the movieComputeJS file.)\n\nEXAMPLE: movieComputeJS might contain the filename "VerticalGrating.js", and that file might contain:\n// Compute vertical Gabor.\nvar imageNit = new Array(xDeg.length).fill(0)\n        .map(() => new Array(yDeg.length).fill(0));\nvar gx = [];\nvar gy = [];\nfor (const x of xDeg) {\n        gx.push(\n                Math.exp(-((x-targetEccentrictyXDeg)/targetSpaceConstantDeg)**2)\n        );\n}\nfor (const y of yDeg) {\n        gy.push(\n                Math.exp(-((y-targetEccentrictyYDeg)/targetSpaceConstantDeg)**2)\n        );\n}\nvar fx = [];\nfor (i = 0; i < xDeg.length; i++) {\n        fx[i]=gx[i]*Math.sin(\n                2*Math.PI*((xDeg[i]-targetEccentrictyXDeg)*targetCyclePerDeg + targetPhase/360)\n        )\n}\nfor (j = 0; j < yDeg.length; j++) {\n        for (i = 0; i < xDeg.length; i++) {\n                imageNit[i][j] = (255/2) * (1 + targetContrast * gy[j] * fx[i]);\n        }\n}',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "movieHz",
    availability: "now",
    example: "",
    explanation:
      "⭑ movieHz is the desired frame rate of the movie. Most displays run at 60 Hz, some are faster, and some have variable frame rate. movieHz set the number of computed movie frames per second. Each computed frame could be displayed for several display frames. For example, one might save computation time by setting movieHz to 15 for display on a 60 Hz display. Not to be confused with the desired flicker frequency of the target, targetHz, which is independent.",
    type: "numerical",
    default: "60",
    categories: "",
  },
  {
    name: "movieLuminanceNit",
    availability: "now",
    example: "",
    explanation:
      "movieLuminanceNit (default -1) is the desired screen luminance in cd/m^2, i.e. nits. Specifying luminance will only be practical when we use an HDR codec supporting PQ. More typically, we'll want to use the display at the background luminance it was designed for, often 500 cd/m^2 in 2022, or half that. The default -1 value indicates that we should use the display at whatever background luminance we find it in.",
    type: "numerical",
    default: "-1",
    categories: "",
  },
  {
    name: "moviePQEncodedBool",
    availability: "now",
    example: "",
    explanation:
      "moviePQEncodedBool (default FALSE) determines whether to use the PQ transfer function. With PQ each pixels specified its own absolute l",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "movieRectDeg",
    availability: "now",
    example: "",
    explanation:
      "⭑ movieRectDeg (default is empty, indicating whole screen) indicates the desired approximate movie size and location in the visual field. It consists of four float numbers separated by commas, stored as text. All number are in deg relative to fixation. deg are positive above and to the right of fixation. The sequence is left,bottom,right,top. Whatever is requested will be mapped to pixels and clipped by screenRectPx. \n     Note that movieRectDeg is a rect on the retina, which will be curved on the screen, and tthe movie's screen pixels are specified as the screen rect, movieRectDeg. Guided by movieRectPxContainsRectDegBool, EasyEyes creates screenRectPx to be a reasonable approximation to movieRectDeg.\n     The scientist provides movieRectDeg, which defines a rect in visual coordinates (i.e. deg on the retina). Note that straight lines in visual space generally correspond to curves in pixel space. However, the HDR movie must be a screen rect (horizontal & vertical rectangle), so EasyEyes defines the movieRectPx screen rect approximation to movieRectDeg. movieRectDeg is rectangular on the retina, and movieRectPx is rectangular on the screen. \n     movieRectPx is the screen rect used for the movie. It is derived from movieRectDeg according to movieRectPxContainsDegBool, and then clipped by screenRectPx. If movieRectDeg is empty (the default) then movieRectPx is the whole screen, ie screenRectPx.\n     The movie bounds are movieRectPx. To compute a movie, we usually need to know the visual coordinate of each pixel. If needed, EasyEyes provides the 2*width*height array xyDeg, where array xyDeg(i,j) is the x,y position in deg of pixel (i,j).",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "movieRectPxContainsRectDegBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "If movieRectPxContainsRectDegBool (default FALSE) is FALSE then movieRectPx is the bounding box of the four screen points that correspond to the four midpoints (on the retina) of the four sides of movieRectDeg. If it's TRUE then movieRectPx is the screen bounding box containing the four midpoints and the four corners of movieRectDeg. So movieRectPx will contain practically all the pixels in movieRectDeg. The issue, of course, is that a rect on the screen (px coordinates) when mapped to the retina (deg coordinates) is not a rect, all four sides are curved. Similarly, a rect on the retina (deg coordinates) when mapped to the screen (px coordinates) is not a rect, all four sides are curved. Despite the imprerfect correspondence, rects are convenient, so movieRectPxContainsRectDegBool selects how to approximate the correspondence. Usually the scientist will want to specify in deg coordinates, but want the efficiciency of implementation in px coordinates.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "movieSec",
    availability: "now",
    example: "60",
    explanation:
      "⭑ movieSec is the desired duration of the movie. The actual duration will be an integer number of frames. EasyEyes will compute n=round(movieHz*movieSec) frames, with a duration of n/movieHz. The movieSec duration is normally longer than the requested targetDurationSec. \nNOTE: movieSec is ignored if movieValues is not empty.",
    type: "numerical",
    default: "60",
    categories: "",
  },
  {
    name: "movieTargetDelaySec",
    availability: "now",
    example: "0",
    explanation:
      "movieTargetDelaySec (default is 0) specified the target delay (positive or negative) relative to being centered in the movie duration movieSec.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "movieValues",
    availability: "now",
    example: "",
    explanation:
      'movieValues (default empty) is a comma-separated list of numbers. The movie will have one frame of per number. This vector offers the scientist a handy way to provide a series of numbers to the scientist\'s movieCompute.js program to control, e.g. the contrast, of each frame of a movie, with one frame per value in this list. If movieMeasureLuminanceBool==TRUE then the movieValues vector is reproduced as a column in the "luminances*.csv" data file that is dropped into the Downloads folder. The movieValues column will be aligned with the other columns only when measureLuminanceHz == movieHz.\nNOTE: movieSec is ignored if movieValues is not empty.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "needEasyEyesKeypadBeyondCm",
    availability: "now",
    example: "",
    explanation:
      "needEasyEyesKeypadBeyondCm (default 75). If any block has \nviewingDistanceDesiredCm > needEasyEyesKeypadBeyondCm, \nEasyEyes will recruit the participant's smartphone on the Requirements page and provide a keypad on the smartphone during each block that requires it. The phone remains connected through the whole experiment. The keypad is enabled only for blocks with a viewingDistanceDesiredCm that exceeds needEasyEyesKeypadBeyondCm. While the keypad is enabled, the participant is free to type on either or both the computer's keyboard and the smartphone keypad. Set needEasyEyesKeypadBeyondCm to zero to enable the keypad regardless of viewingDistanceDesiredCm. Set it to a huge value to never provide a keypad.\n\nWe recruit the phone on the Requirements page for the whole experiment. \n\nAs of May 2024, I'm setting _needSmartphoneCheckBool=FALSE when I set needEasyEyesKeypadBeyondCm=50. It's my impression that I keep losing the phone connection when _needSmartphoneCheckBool=TRUE.\n\nIn my testing with Marialuisa, it would be nice for the phone connection to be optional. It can be handy for the experimenter, but there might not be a phone available. We need a way to offer an OPTIONAL phone connection. This is similar to our QR code for the phone survey which allows the participant to continue without connecting a phone.  It would be nice to have one UI for all these cases, and allow the experiment to specify whether the phone connection is: not mentioned, required, or optional.  In the survey, you must have a phone, but you can refuse to connect it. In the classroom, you need not have a phone.\n\nGus April 14, 2023: Needed improvements:\n1. Support arbitrary fonts\n2. Make sure it works with targetKinds other than “letter”\n3. Add a visual indication on the keypad when responses aren’t being registered (currently we are ignoring responses from the threshold.js side when they aren’t allowed) \n4. Display a message when the keypad is no longer needed and the participant can put their phone away.\n\nDenis's requests:\n1. Suspend nudging until the smartphone is connected.\n2. I paused for many minutes and when I came back the keypad announced loss of connection, but offered no way to restore it. Presumably both the phone and the computer know the connection was lost. In this situation, I suggest we hide the keypad, say \"Connection lost.\" and offer a \"Reconnect\" button.\n\n",
    type: "numerical",
    default: "75",
    categories: "",
  },
  {
    name: "needScreenHeightDeg",
    availability: "now",
    example: "30",
    explanation:
      "🕑 needScreenHeightDeg (default 0) allows you to specify the minimum screen height in deg for this condition. This is used in two way, first in the Requirements page to reject a computer screen that doen't have enough pixels, and second, at the beginning of each block to reduce viewing distance, if necessary, to provide the requested angular screen height.\n\n1. REQUIRE SCREEN PIX IN REQUIREMENTS PAGE. For each block, needScreenHeightDeg, needTargetSizeDownToDeg, and targetMinimumPx are combined to compute a minimum screen-height px. The max across blocks is enforced in the Requirements page. Note that needTargetSizeDownToDeg is used solely for this resolution requirement, so you can eliminate this requirement by setting needTargetSizeDownToDeg to a large value, e.g. 10.\n\n2. ADJUST VIEWING DISTANCE OF EACH BLOCK. needScreenHeightDeg is also used at the beginning of each block, to reduce  viewing distance, if necessary, so that the screen will have (at least) the specified height in deg. Default is zero, which is ignored. This depends on screen height in cm, which is unknown until size calibration. \n\nSee needScreenWidthDeg for details.                                                     ",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "needScreenHeightUpToDeg",
    availability: "now",
    example: "",
    explanation: "Obsolete. Use needScreenHeightDeg instead.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "needScreenWidthDeg",
    availability: "now",
    example: "30",
    explanation:
      "🕑 needScreenWidthDeg (default 0) allows you to specify the minimum screen width in deg for this condition. This is used in two way, first, in the Requirements page, to reject a computer screen that doen't have enough pixels, and second, at the beginning of each block to reduce viewing distance, if necessary, to provide the requested angular screen width.\n\n1. REQUIRE SCREEN PIX ON REQUIREMENTS PAGE. EasyEyes computes the required screen resolution enforced by the Requirements page. For each block, needScreenWidthDeg, needScreenHeightDeg, needTargetSizeDownToDeg, and targetMinimumPx are combined to compute minimum screen-width px and screen-height pix. The max  of each across blocks is enforced in the Requirements page. Note that needTargetSizeDownToDeg is used solely for this resolution requirement, so you can eliminate this requirement by setting needTargetSizeDownToDeg to a large value, e.g. 10.\n     EasyEyes ignores any conditions disabled by setting conditionEnabledBool=FALSE. Similarly EasyEyes ignores any block disabled by virtue of having all its conditions disabled. \n     EasyEyes uses, from the experiment spreadsheet, one logical parameter conditionEnabledBool and four numerical parameters: targetMinimumPx, needTargetSizeDownToDeg, needScreenWidthDeg, and needScreenHeightDeg. For each block, EasyEyes first computes max of the required pixel density (px/deg) across enabled conditions:\nminPxPerDeg = max(targetMinimumPx/needTargetSizeDownToDeg) \nacross enabled conditions in the block. Then it computes max of the required screen subtense (deg) across enabled conditions in each block:\nminScreenHeightDeg=max(needScreenHeightDeg)\nand\nminScreenWidthDeg=max(needScreenWidthDeg)\nFrom these three variables, minPxPerDeg, minScreenHeightDeg, minScreenWidthDeg, EasyEyes computes the min screen resolution (px), for each block:\nminScreenWidthPx=minPxPerDeg*tand(minScreenWidthDeg/2)/tand(1/2)\nminScreenHeightPx=minPxPerDeg*tand(minScreenHeightDeg/2)/tand(1/2)\nwhere tand is a tangent function that accepts an angle in deg, i.e. tand(x) = tan(x*pi/180).\nThe required resolution for the experiment is the max required resolution max(minScreenWidthPx) and max(minScreenHeightPx) across all enabled blocks. These requirements are declared and enforced on the Requirements page, which rejects any computer screen with insufficient resolution.\n\n2. ADJUST VIEWING DISTANCE OF EACH BLOCK. The EasyEyes compiler requires viewingDistanceDesiredCm to be the same across conditions in a block, but allows it to differ across blocks. needScreenWidthDeg is used, at the beginning of each block, to reduce viewing distance below viewingDistanceDesiredCm, if necessary, so that the screen will have at least the requested width in deg. Default is zero, which is ignored. \nmaxViewingDistanceCm = screenWidthCm/(2*tand(needScreenWidthDeg/2)),\nwhere tand is a tangent function that accepts an angle in deg, i.e. tand(x) = tan(x*pi/180).\nSet the block's viewing distance to min(maxViewingDistanceCm, viewingDistanceDesiredCm).\n\n3. PRACTICAL ADVICE. Modern displays have a lot of pixels, so you might be tempted to do all your testing at one viewing distance. However, no display on the market has enough pixels for you to use the same viewing distance to measure foveal acuity (with needTargetSizeDownToDeg=0.03) and peripheral crowding (with needScreenWidthDeg=30). The solution is to use a block with long viewing distance to measure foveal acuity (needTargetSizeDownToDeg=0.03), and another block, with short viewing distance, to measure peripheral vision (with needScreenWidthDeg=30).\n\n3. TEST SOFTWARE. The TestScreenResolution.xlsx spreadsheet emulates the EasyEye Requirements Page computation of required screen resolution (px).",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "needScreenWidthUpToDeg",
    availability: "now",
    example: "",
    explanation: "Obsolete. Use needScreenWidthDeg instead.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "needTargetSizeDownToDeg",
    availability: "now",
    example: "0.05",
    explanation:
      "🕑 needTargetSizeDownToDeg (default 1 deg) allows you to state the smallest target size you need in this condition. This is used solely in the Requirements page, to reject screens that don't have enough pixels. The screen must satisfy each block's needed: needTargetSizeDownToDeg, targetMinimumPx, needScreenHeightDeg, and needScreenWidthDeg. The parameters are are combined in each block to compute the screen resolution needed by that block,\nneededScreenHeightPx = targetMinimumPx * needScreenHeightDeg / needTargetSizeDownToDeg\nneededScreenWidthPx = targetMinimumPx * needScreenWidthDeg / needTargetSizeDownToDeg\nThe max of each across all blocks is enforced in the Requirements page. \n\nNote that needTargetSizeDownToDeg is used solely for this resolution requirement, so you can eliminate this requirement by setting needTargetSizeDownToDeg to a large value, e.g. 10.\n\nFor more details see: needScreenHeightDeg.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "notes",
    availability: "now",
    example: "",
    explanation:
      "notes provides a place in the experiment spreadsheet to add comments about the condition that you want preserved in the data file. Ignored by EasyEyes, and saved with results.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "questionAndAnswer@@",
    availability: "now",
    example: "AFTERLIFE|No|Is there life after death?|Yes|No|Maybe",
    explanation:
      'questionAndAnswer01 ... questionAndAnswer99 each consist of several strings, separated by vertical bars |, that specify: \nnickname, \ncorrectAnswer (may be empty), \na question to be asked, \nand perhaps several possible answers.  \nIMPORTANT: To use questionAndAnswer you MUST set targetTask to questionAndAnswer. The compiler will soon enforce this.\nThe nickname is used solely to name the column of responses in the saved data. The correctAnswer may be omitted, in which case the vertical bars before and after it will be contiguous. The nickname and question are required; the correct answer and possible answers are optional. If no possible answers are specified, then the question accepts a free-form text answer. If multiple answers are specified, then they are offered to the participant as multiple-choice alternatives, a button devoted to each one. Specifying just one answer is currently an error, but this may change in a future enhancement. (We might use the single-answer field to specify the single-answer type, e.g. logical, numerical, integer, text.)\nIMPORTANT: You can have many questionAndAnswer in one condition, e.g.  questionAndAnswer01, questionAndAnswer02, questionAndAnswer03, but the block may not include any other condition. The EasyEyes compiler will soon enforce this.\n• FREE-FORM: Provide just a nickname, an empty correctAnswer, and a question, no answer. For example, "DESCRIPTION||Describe the image that you are seeing right now?" The participant is invited to type their answer into a text box.\n• MULTIPLE CHOICE: Provide a nickname, a correctAnswer, a question, and at least two possible answers. The participant must click on one. For example:\nFRUIT|apple|Which of the following is a fruit?|house|sky|apple|father|country\nBEAUTY||How much beauty do you get from this image right now?|1|2|3|4|5|6|7\nor\nKIND||What kind of image is it?|figurative painting|abstract painting|photograph\n\nEasyEyes supports questionAndAnswer01 ... questionAndAnswer99, i.e. you can have up to 99 questions in one block. The questions you use must start with the ending 01 and cannot skip numbers.  You can have any number of blocks, each with up to 99 new questions.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "questionAnswer@@",
    availability: "now",
    example: "AFTERLIFE|No|Is there life after death?|Yes|No|Maybe",
    explanation:
      "🕑 questionAnswer01 ... questionAnswer99 each parameter asks a question and gets a reply. You provide a long string to the parameter consisting of several substrings separated by vertical bars |, like this:\nquestionAnswer01     nickname|question|value1|answer1|value2|answer2 ...\nThe substrings are:\nnickname is used as the column title in the results CSV file.\nquestion is presented to the participant.\nvalue is a number to be associated with the immediately following answer. If omitted it defaults to zero.\nanswer a text string.\n\nYou provide zero or several answers, each with a optional value. When a value is omitted, the vertical bars remain. The default is zero. Assign values as you please. When only one of the answers is correct, you might assign value 1 to the correct answer and let the rest be zero.\nAWAKE|You are?||asleep|1|awake\n\nThe nickname is used solely to name the two columns (nickname and nickname.value) of responses in the saved data. The nickname and question are required; the allowed answers (each with optional value) are optional. The default answer value is zero. If no answers are provided, then the question accepts a free-form text answer. If multiple answers are provided, then they are offered to the participant as multiple-choice alternatives, a button devoted to each one. You can use questionAnswerRowBool to arrange the answers in a row, rather than the column default. Values are not revealed to the participant. Specifying just one answer is currently an error, but this may change in a future enhancement. [We might use the single-answer field to specify type of the single answer type, e.g. logical, numerical, integer, text.]\n\nHISTORY. questionAnswer is new and replaces the old, and now-deprecated, questionAndAnswer, which had a slightly different syntax. \n\nTo use questionAnswer, the condition MUST set targetTask=questionAnswer; the compiler will soon enforce this.  EasyEyes supports questionAndAnswer01 ... questionAndAnswer99, i.e. you can have up to 99 questions in one condition. The questions you use must start with the ending 01 and cannot skip numbers.  Any number of conditions can each have up to 99 questions. [I don't know whether we currently support having several questionAnswer condtions in one block; we should.] The parameters questionAnswerShuffleQuestionsBool and questionAnswerShuffleAnswersBool allow you to randomize the order of questions and answers.\n\nEXAMPLES\nFREE-FORM: Provide just a nickname and a question, no answer. For example, \nDESCRIPTION|What is your impression of the painting?\nThe participant is invited to type their answer into a text box.\nMULTIPLE CHOICE: Provide a nickname, a question, and at least two possible answers (each may have a value). The participant must click on one of the answers. For example:\nFRUIT|Which of the following is a fruit?|0|house|0|sky|1|apple|0|father|0|country\nBEAUTY|How much beauty do you get from this image right now?||1||2||3||4||5||6||7\nor\nKIND|What kind of image is it?||figurative painting||abstract painting||photograph\n\nLANGUAGE AND ALIGNMENT. If the text direction of the language is left-to-right then the question and answers (whether in a row or column) are left aligned, otherwise they are right-aligned.\n\nOUTPUT. EasyEyes will produce two columns for each question: NICKNAME and NICKNAME.value, where NICKNAME stands for the nickname provided to QuestionAnswer. The NICKNAME column records what the participant typed or selected. The NICKNAME.value column reports its value. WHen there is no answer then there is no NICKNAME.value column.\n\nUSE THESE PARAMETERS TO SET OPTIONS\nquestionAnswerRowBool (default FALSE) if TRUE then lay out the several answers in a row, rather than a column.\nquestionAnswerShuffleAnswersBool (default FALSE) if TRUE then randomize order of answers for each question.\nquestionAnswerShuffleQuestionsBool (default FALSE) if TRUE then randomize order of the questions in this block.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "questionAnswerRowBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 questionAnswerRowBool (default FALSE) modifies questionAnswer. If TRUE then lay out the several answers horizontally in a row, rather than vertically in a column (default).",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "questionAnswerShuffleAnswersBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 questionAnswerShuffleAnswersBool (default FALSE) modifies questionAnswer. If TRUE then randomize the order of the answers for each question.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "questionAnswerShuffleQuestionsBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 questionAnswerShuffleQuestionsBool (default FALSE) modifies questionAnswer. If TRUE then randomize the order of the questions in this condition.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "readingCorpus",
    availability: "now",
    example: "the-phantom-tollbooth.txt",
    explanation:
      "⭑ readingCorpus (no default is the filename of a text file that has already been uploaded to Pavlovia. The text file should be a book's worth of readable text. We typically use \"The phantom tollbooth\" a popular American children's book with a reading age of 10+ years for interest and 12+ years for vocabulary. We retain punctuation, but discard chapter and paragraph breaks. \n     After EasyEyes reads in the corpus text, it does two analyses to facilitate its use.\n1. CONCORDANCE. Prepare a concordance. This is a two-column table. The first column is a unique list of all the corpus words. The second column is frequency, i.e. the number of times that the word appears in the corpus. For this purpose we should ignore capitalization and leading and trailing punctuation. The table is sorted by decreasing frequency.\n2. WORD INDEX. Use a regex search to make a one-column  list of the index, in the corpus, of every word. For this purpose, a word consists of an alphanumeric character plus all leading and trailing non-whitespace characters.\nIMPORTANT: Currently, leaving the readingCorpus field blank causes a fatal error in EasyEyes when that condition runs. We plan to add a compiler check to detect the problem at compile time, before your study runs.\n",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "readingCorpusEndlessBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 readingCorpusEndlessBool (default FALSE). We simulate an infinite corpus by simulating an endless series of copies of the corpus glued together. If we're using a shuffled corpus then each copy is independently shuffled.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "readingCorpusShuffleBool",
    availability: "now",
    example: "",
    explanation:
      'readingCorpusShuffleBool (default FALSE), when TRUE requests that the condition be run from a shuffled copy of the corpus that is created and shuffled at the beginning of the block and discarded at the end of the block. If several interleaved conditions use the same readingCorpus and set readingCorpusShuffleBool=TRUE, then each uses its own independently shuffled copy. For shuffling, each string of non-whitespace characters is a "word", and every string of whitespace characters is replaced by a space. The word order is shuffled in the copy, which is used for all trials of this condition in this block. (HMM. I\'D LIKE TO REMOVE TRAILING PUNCTUATION, BUT THIS WOULD DAMAGE ABBREVIATIONS LIKE DR. AND INC.)',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "readingDefineSingleLineSpacingAs",
    availability: "now",
    example: "nominalSize",
    explanation:
      "🕑 readingDefineSingleLineSpacingAs (default nominalSize) selects a definition of single line spacing (baseline to baseline) of the text to be read. The actual line spacing in deg will be the output parameter readingLinespacingDeg, which is the product of the single linespacing and readingMultipleOfSingleLineSpacing. However, we convert readingLinespacingDeg to readingLineSpacingPx in the center of the text box, and use a fixed value of readingLineSpacingPx throughout the text box.\nIMPLEMENTED\n• font defines single line spacing as the default PsychoJS line spacing for this font and size, which can be enormous in fonts with large flourishes. \nNOT YET IMPLEMENTED\n• nominalSize is the industry standard, which defines single line spacing as the nominal point size at which we are rendering the font. E.g. single spaced 12 pt Helvetica has 12 pt line spacing.\n• explicit defines single line spacing as readingSingleLineSpacingDeg.\n• twiceXHeight defines single line spacing as twice the font's x-height. (Many fonts, e.g. Times New Roman, have x-height equal to half their nominal size. For those fonts, nominalSize and twiceXHeight will produce the same line spacing.)\nNote that the calculation of readingLineSpacingPx needs to be done fresh for each text object because it may depend on font, font size, and screen location, which can change from trial to trial. We use the center of the text object as the reference location for converting between deg and px.",
    type: "categorical",
    default: "nominalSize",
    categories: "nominalSize, explicit",
  },
  {
    name: "readingFirstFewWords",
    availability: "now",
    example: "It was a dark and stormy night",
    explanation:
      '⭑ readingFirstFewWords (default "") specifies the beginning of the reading in the corpus by its first few words, a string. The matching is exact, including case and punctuation. Default is the empty string, in which case we read from the beginning of the corpus. The EasyEyes compiler flags an error if a nonempty string is not found in the corpus. If the (nonempty) string appears more than once in the corpus, EasyEyes will randomly pick among the instances, independently for each reading. Thus, for an English-language corpus, one might reasonably set readingFirstFewWords to "The ", to begin each reading at a randomly chosen sentence that begins with "The ".',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "readingLinesPerPage",
    availability: "now",
    example: "8",
    explanation:
      "⭑ readingLinesPerPage (default 4) is the number of lines of text per page.",
    type: "numerical",
    default: "4",
    categories: "",
  },
  {
    name: "readingMaxCharactersPerLine",
    availability: "now",
    example: "57",
    explanation:
      "Use readingLineLength instead, and set readingLineLenghtUnit=character.",
    type: "obsolete",
    default: "57",
    categories: "",
  },
  {
    name: "readingLineLength",
    availability: "now",
    example: "57",
    explanation:
      '🕑 readingLineLength (default 57) is the maximum line length in units specified by readingLineLengthUnit. Line breaking is based on maxPixPerLine, which is computed from readingLineLength.\n1. If readingLineLengthUnit==="character", then we compute an average character width as the width in pixels of fontCharacterSet divided by the number of characters in that string. The maximum line length (px) is the product of readingLineLength and that average character width (px):\n     maxPixPerLine = readingLineLength*averageCharacterWidthPx\n2. If readingLineLengthUnit==="deg", then we convert the xy deg of the two ends of the line of text to xy px, then set\n      maxPixPerLine = the width, i.e difference in x coordinate.\n3. If readingLineLengthUnit==="pt", then \n     maxPixPerLine = pxPerCm*2.54*readingLineLength/72\n\nTypographers reckon that text is easiest to read in a column that is 8-10 words wide. Average English word length is 5 characters. Adding the space between words yields 6 characters per word. Multiplying 8-10 by 6 yields 48 to 60 letter widths per line. Line breaking without hyphenation will produce an average line length about half a word less than the max. To get an average line length of 9 words, set the max to 9.5 words, or 9.5*6 = 57 characters.  \n\nTEXT PLACEMENT. We want text placement for ordinary reading to cope with a wide range of sizes of window and text block. We want the text placement to have consistent margins from page to page, independent of the actual text. So, using only the provided parameters, EasyEyes computes the expected width and height of the block of text, and centers that rect in the window. The expected width of the text block is \nreadingBlockWidthPx = maxPixPerLine, \nwhose computation is explained above. The expected height of the text block is \nreadingBlockHeightPx = readingLinespacingPx*readingLinesPerPage\nCenter that invisible rect in the window. The baseline of the first line of text is fontAscenderPt below the top of the rect, where\nfontAscenderPt=fontNominalSizePt * fontBoundingBoxReNominalRect(3)\n(You’ll need to convert the pt to px.) The subscript (3) is meant to select the last element of the rect, which should correspond to the top of the bounding rect. Left-to-right languages begin at the left. Right-to-left languages begin at the right.\n\nTEXT PLACEMENT DEPENDS SOLEY ON WINDOW SIZE, font, AND reading* PARAMETERS, INDEPENDENT OF THE TEXT ITSELF. Occasionally the corpus will run out, providing fewer lines than requested by readingLinesPerPage. Do NOT re-center based on the reduced number of lines. Placement is based on the parameters, independent of the text itself.',
    type: "numerical",
    default: "57",
    categories: "",
  },
  {
    name: "readingLineLengthCharacters",
    availability: "now",
    example: "57",
    explanation:
      "Use readingLineLength instead, and set readingLineLenghtUnit=character.",
    type: "obsolete",
    default: "57",
    categories: "",
  },
  {
    name: "readingLineLengthUnit",
    availability: "now",
    example: "57",
    explanation:
      "🕑 readingLineLengthUnit (default character) is the unit for readingLineLength. Allowed values are character, deg, and pt.",
    type: "categorical",
    default: "character",
    categories: "character, deg, pt",
  },
  {
    name: "readingMultipleOfSingleLineSpacing",
    availability: "now",
    example: "1.2",
    explanation:
      '🕑 Set the line spacing (baseline to baseline) to be this multiple of "single" line spacing, which is set by readingDefineSingleLineSpacingAs. 1.2 is the default in many typography apps, including Adobe inDesign.',
    type: "numerical",
    default: "1.2",
    categories: "",
  },
  {
    name: "readingNominalSizeDeg",
    availability: "now",
    example: "3",
    explanation:
      'readingNominalSizeDeg (default 1) sets the nominal size of the text in deg, provided readingSetSizeBy=="nominalDeg". It sets the font\'s point size to the product readingNominalSizeDeg*pxPerDeg.',
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "readingNominalSizePt",
    availability: "now",
    example: "3",
    explanation:
      'readingNominalSizePt (default 12) sets the nominal point size of the text, provided readingSetSizeBy=="nominalPt". One "point" is 1/72 inch.',
    type: "numerical",
    default: "12",
    categories: "",
  },
  {
    name: "readingNumberOfPossibleAnswers",
    availability: "now",
    example: "3",
    explanation:
      '⭑ readingNumberOfPossibleAnswers (default 4) is the number of possible answers for each question (which of these words did you read just now?). Only one of the possible answers is right. The rest are "foils". The foils have approximately the same frequency in the corpus as the target.',
    type: "integer",
    default: "5",
    categories: "",
  },
  {
    name: "readingNumberOfQuestions",
    availability: "now",
    example: "4",
    explanation:
      '⭑ After the participant reads a passage, EasyEyes will ask readingNumberOfQuestions (default 3), each on a new screen, to assess retention. Each retention question offers several words and asks the participant which word (the target) was in the passage just read. The other words (foils) were not in that passage but do appear in the corpus. The target word is presented with enough foils to offer N=readingNumberOfPossibleAnswers. The words are arranged in alphabetical order below the question. The participant responds by clicking on the chosen word. It\'s "forced choice"; the participant must click a word. We give a "correct" beep if the answer is right. We repeat this several times, as specified by readingNumberOfQuestions.\n     IGNORE FIRST & LAST PAGES. Performance on the first and last pages of the passage might not be representative because timing of the space bar press might be less regular, and primacy and recency would make words on those pages more memorable. So we analyze only the middle pages, excluding the first and last both from the estimate of reading speed and the retention test. [Thus each word in the corpus is read and tested, read and not tested, or not read.]\n     CONCORDANCE. As explained in readingCorpus, we will, once, compute a concordance, the frequency of every word in the corpus. It is a two-column table (word and number of instances in the corpus), sorted by frequency. \n     CANDIDATES FOR TARGET. For a given passage, each question uses a different target word. We pick candidate target words randomly from the passage just read  (in which many words appear more than once), and check each for suitability. We reject some candidates, so we keep picking candidates until we have accepted the desired number, readingNumberOfQuestions. As potential target or foil words we reject any strings in the concordance that include a hyphen.\n     CHOOSE FOILS. We pick a random integer from 1 to N to determine the rank order frequency of the target among the foils. We reduce the concordance by striking out all the words that were read (whether to be tested or not), except the target, which remains. As our answer set, we take N consecutive words from the reduced concordance, including the target, chosen so that the target has the randomly specified frequency rank (1 to N). If the target frequency is so high or low that the reduced concordance lacks N successive words with the target at the designated rank order, then we reject that target and pick another, using the same random rank. The passage read will typically have hundreds of words, so there are lots of candidate targets for the retention questions.\n      \n\n\n',
    type: "integer",
    default: "3",
    categories: "",
  },
  {
    name: "readingPages",
    availability: "now",
    example: "4",
    explanation:
      "⭑ readingPages (default 4) is the number of pages to be read. The CSV file reports the number of characters and number of seconds for each page.",
    type: "numerical",
    default: "4",
    categories: "",
  },
  {
    name: "readingSpacingDeg",
    availability: "now",
    example: "0.5",
    explanation:
      "⭑ readingSpacingDeg (default 0.5) sets the average center-to-center letter spacing, provided readingSetSizeBy is spacingDeg. It sets the point size of the text to make this approximately the average center-to-center spacing (deg) of neighboring characters in words displayed. In fact, we adjust so that the width of the fontCharacterSet string divided by the number of numbers in the string equals readingSpacingDeg.",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "readingSingleLineSpacingDeg",
    availability: "now",
    example: "2",
    explanation:
      "readingSingleLineSpacingDeg (default 1) set the single line spacing in deg, but only if readingDefineSingleLineSpacingAs==explicit. Otherwise it's ignored.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "readingSetSizeUnit",
    availability: "now",
    example: "nominalPt",
    explanation:
      '🕑 ⭑ readingSetSizeUnit (default spacingDeg) pairs with readingSetSize to specify the size of the text to be read. "Typographer\'s point" is abbreviated "pt", and 1 pt = 1/72 inch. "x-height" is a metric property of text, the height of the lowercase x. Unlike x-height, when you typeset a particular font (e.g. Helvetica) at a particular font "size" (e.g. 12 pt), all metrics of the typeset characters vary across fonts, because typographic tradition allows the type designer to choose an arbitrary size for (say) 12 pt type. All other sizes are proportional. Here we call the typeset size (e.g. 12 pt) "nominal"; it\'s a length in pts. \n• nominalPt sets the font\'s point size to readingSetSize.\n• nominalDeg sets the font\'s point size so that the nominal size, in deg, equals readingSetSize. The formula is \nnominalPt = (72/2.54)*2*tan(0.5*readingSetSize*3.14159/180)*viewingDistanceCm. \n• xHeightPt sets the font\'s point size to achieve the x-height (the height of lowercase x), in pt, specified by readingSetSize. \n• xHeightDeg sets the font\'s point size to achieve the x-height (the height of lowercase x), in deg, specified by readingSetSize.\n• spacingPt sets the font\'s point size so that the average letter-center-to-letter-center spacing (pt) is approximately readingSetSize. In fact, we adjust font size so that the width of the fontCharacterSet string, in pt, divided by the string length in characters equals readingSetSize.\n• spacingDeg sets the font\'s point size so that the specified average letter-center-to-letter-center spacing (deg) is approximately readingSetSize.  In fact, we adjust point size so that the width of the fontCharacterSet string divided by the string length in chracters equals readingSetSize.',
    type: "categorical",
    default: "spacingDeg",
    categories:
      "nominalPt, nominalDeg, xHeightPt, xHeightDeg, spacingPt, spacingDeg",
  },
  {
    name: "readingSetSizeBy",
    availability: "now",
    example: "nominalPt",
    explanation:
      "⭑ readingSetSizeBy (default spacingDeg) determines how you specify the size of the text to be read. \"Typographer's point\" is abbreviated \"pt\", and 1 pt=1/72 inch. x-height is a well-defined text property. However, when you typeset a named font (e.g. Helvetica) at a particular font size (e.g. 12 pt), every metric of the typeset characters varies across fonts, because typographic industry conventions allow the type designer an arbitrary size scale factor, so here we call the typeset size (e.g. 12 pt), the \"nominal\" type size.\n• nominalPt sets the font's point size to readingNominalSizePt.\n• nominalDeg sets the font's point size to subtend readingNominalSizeDeg. The formula is \nnominalPt = (72/2.54)*2*tan(0.5*readingNominalSizeDeg*3.14159/180)*viewingDistanceCm.\n• xHeightPt sets the font's point size to achieve the x-height (the height of lowercase x) specified by readingXHeightPt \n• xHeightDeg sets the font's point size to achieve the x-height (the height of lowercase x) specified by readingXHeightDeg.\n• spacingPt sets the font's point size to achieve the specified average letter-center-to-letter-center spacing readingSpacingPt.\n• spacingDeg sets the font's point size to achieve the specified average letter-center-to-letter-center spacing readingSpacingDeg.",
    type: "categorical",
    default: "spacingDeg",
    categories:
      "nominalPt, nominalDeg, xHeightPt, xHeightDeg, spacingPt, spacingDeg",
  },
  {
    name: "readingSetSize",
    availability: "now",
    example: "",
    explanation:
      "🕑 ⭑ readingSetSize (default 0.5) is the desired value, with units set by readingSetSizeUnit. Together they determine the size of the text to be read. ",
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "readingSpacingPt",
    availability: "now",
    example: "0.5",
    explanation:
      "readingSpacingPt (default 12) sets the average center-to-center letter spacing, provided readingSetSizeBy is spacingPt. It sets the point size of the text to make this approximately the average center-to-center spacing (deg) of neighboring characters in words displayed. In fact, we adjust so that the width of the fontCharacterSet string divided by the number of numbers in the string equals readingSpacingPt.",
    type: "numerical",
    default: "12",
    categories: "",
  },
  {
    name: "readingTargetMaxWordFrequency",
    availability: "now",
    example: "0.3",
    explanation:
      "readingTargetMaxWordFrequency. When reading, it is hard to notice or remember common words, so we exclude common words as the target for retention testing. When selecting a target, we keep drawing candidate targets randomly from the passage that was read until we find one that's acceptable. We reject any candidate target whose frequency in the corpus exceeds **readingTargetMaxWordFrequency**.\n     DEFAULT VALUE. In the classic Kucera and Francis concordance,\nhttps://en.wikipedia.org/wiki/Brown_Corpus\nthe words _water, think, night_ have frequencies about 430*10^-6, which would be a good cut off for a large corpus. That's about 1 in 2326, so this criterion excludes every word in any corpus with fewer than 2,326 words.",
    type: "numerical",
    default: "4.30E-04",
    categories: "",
  },
  {
    name: "readingXHeightDeg",
    availability: "now",
    example: "0.5",
    explanation:
      'If readingSetSizeBy is "xHeightDeg", then set the font\'s point size to achieve this specified x-height (the height of lowercase x). ',
    type: "numerical",
    default: "0.5",
    categories: "",
  },
  {
    name: "readingXHeightPt",
    availability: "now",
    example: "0.5",
    explanation:
      'If readingSetSizeBy is "xHeightPt", then set the font\'s point size to achieve this specified x-height (the height of lowercase x) in typographic "points" (1/72 inch). ',
    type: "numerical",
    default: "6",
    categories: "",
  },
  {
    name: "responseAllowedEarlyBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 When responseAllowedEarlyBool is TRUE, the participant can respond at any time after target onset. When FALSE, the participant can only repond after target offset. For demos and debugging, it is handy to set responseAllowedEarlyBool to TRUE with a long targetDurationSec (e.g. 999) so that the stimulus stays up while you examine it, yet you can quickly click through several stimuli to see the progression. Note that enabling early response while clicked responses are allowed forces EasyEyes to show the characterSet early, since clicking requires something to click on. And if responseRequiresCharacterSetBool is TRUE then setting responseAllowedEarlyBool TRUE will force early display of the characterSet regardless of which response modalities are enabled.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseCharacterHasMedialShapeBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "⭑ When using an Arabic font, responseCharacterHasMedialShapeBool TRUE (the default) to show each character (available response choice) in medial (i.e. with connectors) instead of isolated form (no connectors). This has the intended effect with Arabic, and has no effect in the Roman alphabet. Still untested with other alphabets. In Arabic, ligatures respond to the neighboring letters. When we identify crowded Arabic letters in typographic mode, the target character is displayed in medial shape (i.e. connected) as a stimulus. If responseCharacterHasMedialShapeBool is TRUE (the default) then the response screen also shows each response letter in its medial shape. If FALSE, then the response letter is shown in its isolated shape (i.e. disconnected). Having the target letter change shape between stimulus and response screens may make it harder to identify, especially by less fluent readers. To achieve this, when responseCharacterHasMedialShapeBool is TRUE we precede the response character by a Tarweel joiner character (U+0640) and follow it by a zero-width joiner (ZWJ) character (U+200D). For more on these characters in Arabic typesetting see https://www.w3.org/TR/alreq/#h_joining_enforcement",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseClickedBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ responseClickedBool (default TRUE). Allow participant to respond at every occasion by clicking (e.g. clicking the target letter in the fontCharacterSet). When ready for stimulus, allow clicking fixation instead of hitting SPACE. The various response modes are not exclusive. Enable as many as you like. And simulateParticipantBool can provide responses too. Note that, just for initiating the trial, responseMustTrackContinuouslyBool overrides other responseXXX settings so that the only way to initiate the trial is by tracking with the cursor; it has no effect on other screens, including the stimulus response at the end of the trial. ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseEscapeOptionsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "❌ THIS DESIGN DID NOT ANTICIPATE THAT, WHEN IN FULL-SCREEN MODE, THE BROWSER RESERVES THE ESCAPE KEY FOR EXITING FROM FULL-SCREEN MODE. WE'LL HAVE TO PICK ANOTHER KEY FOR SKIPPING AHEAD. Once debugged, responseEscapeOptionsBool will be TRUE by default. If FALSE, then we follow the PsychJS behavior, and any press of ESCAPE immeditaely ends testing and takes the participant to the debrief form (if requested). If TRUE, then ESCAPE offers two or three options. The miidest option is to continue from where ESCAPE was presssed, deleting any trial for which the response was not yet collected. The middle option is only presented if we suppose that we're testing the scientist, not a typical participant. This option skips to the next block. The last option ends testing and goes to debriefing (if requested). Our rule for supposing that the participant is the scientist is either that the Prolific URL parameters are absent or we are in Prolific Preview mode.\n     If responseEscapeOptionsBool is TRUE, then, at any prompt, the participant can hit <escape> to be asked whether to cancel the trial (hit space), the block (hit return), or the whole experiment (hit escape again).",
    type: "obsolete",
    default: "",
    categories: "",
  },
  {
    name: "responseMustClickCrosshairBool",
    availability: "now",
    example: "",
    explanation:
      "⚠ responseMustClickCrosshairBool (default FALSE) requires the participant to click the crosshair in order to initiate the trial. For initiating a trial, responseMustClickCrosshairBool overrides the settings of responseTypedBool and responseClickedBool; it has no effect on other screens, including the stimulus response at the end of the trial.  It turns out that this is not a good way to get fixation of the crosshair at the moment of target presentation. We discovered that some participants learn to plan BOTH the hand and eye movements at once: the manual click of the crosshair and the eye movement to fixate the target, so they end up with their eye on the target at target onset. If you want good fixation use responseMustTrackContinuouslyBool instead. We're not sure what this might be good for, so we're leaving it for the time being. If it turns out to be an attractive nuisance we may remove it.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseMustTrackContinuouslyBool",
    availability: "now",
    example: "",
    explanation:
      "⭑ responseMustTrackContinuouslyBool (default FALSE), when TRUE, imposes a special way of initiating a trial that is designed to yield good fixation. For each trial, it selects a random-length waiting interval by taking a fresh random sample from the uniform distribution over the range responseMustTrackMinSec to responseMustTrackMaxSec. The motion is controlled by markingFixationMotionRadiusDeg and markingFixationMotionSpeedDegPerSec.  responseMustTrackContinuouslyBool requires that the cursor tip be in the hotspot (within markingFixationHotSpotRadiusDeg of the crosshair center) for the entire waiting interval.  Whenever the cursor is outside the hotspot, the software resets the waiting process, first waiting for the cursor to enter the hotspot, which begins a new waiting interval (whose duration is a fresh random sample). For initiating a trial, responseMustTrackContinuouslyBool overrides the settings of responseTypedBool and responseClickedBool; it has no effect on other screens, including the stimulus response at the end of the trial. We submitted an article to Journal of Vision about the excellent fixation achieved with responseMustTrackContinuouslyBool. (Kurzawski et al. submitted 2023).",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseMustTrackMaxSec",
    availability: "now",
    example: "",
    explanation:
      "When responseMustTrackCrosshairBool=TRUE, the participant’s required tracking time to get target presentation is a random sample from the interval responseMustTrackMinSec to responseMustTrackMaxSec. The EasyEyes compiler requires that\nresponseMustTrackMaxDelaySec ≥ responseMustTrackMinDelaySec ≥ 0.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "responseMustTrackMinSec",
    availability: "now",
    example: "",
    explanation:
      "When responseMustTrackCrosshairBool=TRUE, the participant’s required tracking time to get target presentation is a random sample from the interval responseMustTrackMinSec to responseMustTrackMaxSec. The EasyEyes compiler requires that\nresponseMustTrackMaxDelaySec ≥ responseMustTrackMinDelaySec ≥ 0.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "responseNegativeFeedbackBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "When responseNegativeFeedbackBeepBool (default FALSE) is TRUE, after a mistaken response, provide negative feedback (sound is a pure 500 Hz tone for 0.5 sec at amplitude 0.05; word is wrong). Default is FALSE, as we typically give only positive feedback.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responsePositiveFeedbackBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "When responsePositiveFeedbackBool (default TRUE) is TRUE, after each correct response, provide positive feedback (sound is a pure 2000 Hz tone for 0.05 sec at amplitude 0.05; word is RIGHT). WORKING FOR SOUND TASKS; NOT YET IMPLEMENTED FOR VISION TASKS.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responsePurrWhenReadyBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "When responsePurrWhenReadyBool (default FALSE) is TRUE, play a purring sound to alert the observer while we await their response. Pure 200 Hz tone indefinitely at amplitude 1. Stop purring when they respond.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseSkipTrialButtonBool",
    availability: "now",
    example: "",
    explanation:
      'responseSkipTrialButtonBool (default FALSE) displays a button visible only before trial is initiated that, when pressed, skips the trial. We are exploring the difficulty of many variants on the cursor tracking of the moving crosshair and anticipate that some conditions will be impossible, so we want to offer the participant a way to move on. The button will say "Skip Trial" (international phrase T_skipTrial) and will be big in the upper right corner of the screen. You might also consider using responseTimeoutSec.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseSpokenBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 responseSpokenBool allows participant to respond  verbally at every occasion, e.g. by verbally naming the target. The various response modes are not exclusive. Enable as many as you like. But responseMustClickCrosshairBool overrides all other settings.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseSpokenToExperimenterBool",
    availability: "now",
    example: "",
    explanation:
      "If responseSpokenToExperimenterBool=TRUE (default FALSE) and targetKind=rsvpReading then an experimenter sits next to the child participant. The child sees the RSVP stimulus and reads the words aloud. The experimenter’s task is to score, right or wrong, the child’s report of each target word. This needs to be discreet to avoid discouraging the child. The experimenter listens to the child, and uses the keyboard to report to EasyEyes whether each word was read correctly. Once the child finishes speaking, the experimenter can press the SHIFT key at any time to see the next unscored target word. Ignore the up and down arrow keys until the SHIFT is touched. Once the SHIFT has been touched, keep showing the next unscored word until there are none left to show; then proceed. The response screen shows one tiny circle per word.  For each word,  the experimenter uses the up arrow key to say “right” and the down arrow key to say “wrong”. When the experimenter hits an up or down arrow key a circle turns green (right) or pink (wrong). The experimenter does this for each word. There’s no way to go back or change the answers.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseTimeoutSec",
    availability: "now",
    example: "",
    explanation:
      "responseTimeoutSec (default 86400, i.e. a day) automatically skips the trial if the participant doesn't initiate it within the timeout interval. We need timeout to handle the situation where EasyEyes requires cursor tracking of the crosshair to initiate the trial, but the participant can't keep up, possibly because the hot spot is too small, or the motion is too fast or curvy. Instead of remaining stuck there, we want the participant to proceed to the rest of the trials and finish the test. You might also consider using responseSkipTrialButtonBool.",
    type: "numerical",
    default: "86400",
    categories: "",
  },
  {
    name: "responseTypedBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'responseTypedBool allows the participant to respond at every occasion by pressing a key in the keyboard/keypad. The various response modes are not exclusive. Enable as many as you like. Note that, just for initiating the trial, responseMustTrackContinuouslyBool overrides other responseXXX settings so that the only way to initiate the trial is by tracking with the cursor. OVERRRIDE: Setting simulateParticipantBool to TRUE or showGrid to other than "disabled" enables type as a response method, regardles of the setting of responseTypedBool. \n',
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "responseTypedEasyEyesKeypadBool",
    availability: "now",
    example: "FALSE",
    explanation:
      '❌ responseTypedEasyEyesKeypadBool (default FALSE) = TRUE allows participant to provide any "typed" response by pressing a key in the EasyEyes keypad. responseMustTrackCrosshairBool enables/disables the keypad independently for each block. If any block uses the keypad, the keypad is connected (by pointing camera at QR code) at the beginning of the experiment. The various response modes (responseClickBool responseTypeBool and  are not exclusive. Enable as many as you like, but, for initiating a trial, responseMustTrackCrosshairBool overrides all other settings. \nThe SPACE and RETURN keys get the bottom row, each taking half the row. The rest of the keys are laid out in a regular grid, using the largest possible key size. Each key (except SPACE and RETURN) has the aspect ratio specified by responseTypedEasyEyesKeypadWidthOverHeight. The smartphone connection is established at the beginning of the experiment, before nudging begins. \nPROGRAMMER: All tasks accept text (if responseTypedBool=TRUE) regardless of source (keyboard or keypad). The availability of the keypad is controlled by this switch, but centrally, not by conditionals in the code for each task.\nGus April 14, 2023: Planned improvements:\n1. Support arbitrary fonts\n2. Make sure it works with targetKinds other than “letter”\n3. Add a visual indication on the keypad when disabled (currently we are ignoring responses from the threshold.js side when they aren’t allowed) \n4. Display a message when the keypad is no longer needed and the participant can put their phone away.\n\nDenis\'s requests:\n1. I paused for many minutes and when I came back the keypad announced loss of connection, but offered no way to restore it. Presumably both the phone and the computer know the connection was lost. In this situation, I suggest we hide the keypad, say "Connection lost." and offer a "Reconnect" button.\n2. EasyEyes compiler should require that all conditions of a block must have the same TRUE/FALSE value of responseTypedEasyEyesKeypadBool.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "responseTypedKeypadWidthOverHeight",
    availability: "now",
    example: "",
    explanation:
      "responseTypedKeypadWidthOverHeight (default 1) is the aspect ratio of each key in the keypad, except the Space and Return keys, which together occupy the bottom row, each occupying half the row.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "rsvpReadingFlankerCharacterSet",
    availability: "now",
    example: "x",
    explanation:
      "rsvpReadingFlankerCharacterSet is a possibly empty (the default) string of characters. If empty then there are no flankers. If nonempty then the target is surrounded with independent random samples from this string. Thus, if the string is only one character then the flankers are all the same character.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "rsvpReadingFlankTargetWithLettersBool",
    availability: "now",
    example: "",
    explanation:
      "❌ OBSOLETE. RETAINED SOLELY FOR REPLICATION OF BUG REPORTED IN TRELLO CARD. https://trello.com/c/xKZaBnEV",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "rsvpReadingNumberOfIdentifications",
    availability: "now",
    example: "",
    explanation:
      "rsvpReadingNumberOfIdentifications\nAdded December 18, 2023. Still awaiting documentation here.",
    type: "numerical",
    default: "3",
    categories: "",
  },
  {
    name: "rsvpReadingNumberOfResponseOptions",
    availability: "now",
    example: "3",
    explanation:
      "[FUTURE: delete this and use the existing readingNumberOfPossibleAnswers instead.] rsvpReadingNumberOfResponseOptions is the number of different words (only one of which is correct) provided as possible responses (in alphabetical order) when targetKind is rsvpReading. The foils have approximately the same frequency in the corpus as the target. This parameter is used only when responseSpokenToExperimenterBool is FALSE.\nNEW BEHAVIOR: When rsvpReadingNumberOfResponseOptions==0 don't ask any questions.",
    type: "numerical",
    default: "6",
    categories: "",
  },
  {
    name: "rsvpReadingNumberOfWords",
    availability: "now",
    example: "6",
    explanation:
      "⭑ rsvpReadingNumberOfWords specifies how many words are shown during each rsvpReading trial. Currently must be consistent across rsvpReading conditions within a block due to implementation restrictions. Let us know if that's a problem.",
    type: "numerical",
    default: "6",
    categories: "",
  },
  {
    name: "rsvpReadingRequireUniqueWordsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "If rsvpReadingRequireUniqueWordsBool is TRUE, only select words for the target sequence and foil words which have not yet been used as a target or foil. If FALSE, draw words directly from the corpus, even if those words have already been used in this condition.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "saveCursorTrackingBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 saveCursorTrackingBool (default FALSE), during each trial of this condition, records the time and x,y pixel position of the crosshair and cursor plus boolean presence/absence of the target (6 numbers per sample) at a frequency set by saveCursorTrackingHz. The time stamp is floating point absolute time in sec. The record should begin when EasyEyes starts moving the crosshair and tracking the cursor, and should end at target offset.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "saveCursorTrackingHz",
    availability: "now",
    example: "",
    explanation:
      "🕑 saveCursorTrackingHz (default 60) specifies the rate at which the cursor and crosshair position are sampled. Has no effect when saveCursorTrackingBool==FALSE.",
    type: "numerical",
    default: "60",
    categories: "",
  },
  {
    name: "screenColorRGBA",
    availability: "now",
    example: "",
    explanation:
      '⭑ screenColorRGBA (default 0.94,0.94,0.94,1, i.e. 94% white) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify the color of the screen background for each condition. "RGB" are the red, green, and blue channels; "A" controls opacity (0 to 1). 0,0,0,1 is black and 1,1,1,1 is white. This is used to set the background of the rest of the screen, e.g. to match the background of a movie. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA.',
    type: "text",
    default: "0.92,0.92,0.92,1",
    categories: "",
  },
  {
    name: "screenshotBool",
    availability: "now",
    example: "TRUE",
    explanation:
      '🕑 screenshotBool requests saving a full-screen screenshot of each stimulus and response display of this condition, plus each instruction display of the block. (Currently all instruction displays belong to the block, not to any condition.) Each filename should be E.B.C.TA.png, where E stands for the experiment name, B stands for the block number, C stands for the condition number, T stands for the trial number of the condition in the block, and A is "s" for stimulus or "r" for response. If the display is instructional then A is "i", C is 0, and T is a counter that starts at 1 at the beginning of the block. screenshotBool is condition-specific, but if several conditions enable it, EasyEyes still saves only one copy of each instructional screen. Screenshots are useful for debugging and to show the stimuli in talks and papers. It is expected that taking screenshots will severely degrade timing, so it should not be requested while a participant is being tested in earnest. Instead the scientist will test herself (or use simulateParticipantBool) to collect the images she needs.\n     Can we save these files to a "Screenshots" folder in the participant computer\'s Downloads folder or in the experiment repository on Pavlovia? ',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "setResolutionPxPerCm",
    availability: "now",
    example: "25",
    explanation:
      "🕑 setResolutionPxPerCm sets display resolution to allow us to study perception and readability of text rendered with low pixel density. We just render on a smaller canvas and expand that for display on the participant's (high resolution) screen. In use, it will be a lot like using System Preferences: Display to set resolution, but will allow much lower resolutions. Ignored if value is empty or zero. For reference, the 2022 MacBook Pro screens have 98 px/cm. It is an error for both setResolutionPxPerCm and setResolutionPxPerDeg to be nonzero. If both are zero/empty then we use the screen in whatever resolution it's in.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "setResolutionPxPerDeg",
    availability: "now",
    example: "4",
    explanation:
      "🕑 setResolutionPxPerDeg sets display resolution to allow us to study perception and readability of text rendered with low pixel density. We just render on a smaller canvas and expand that for display on the participant's (high resolution) screen. Ignored if value is empty or zero. It is an error for both setResolutionPxPerCm and setResolutionPxPerDeg to be nonzero. If both are zero/empty then we use the screen in whatever resolution it's in.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "showBackGrid",
    availability: "now",
    example: "",
    explanation:
      "❌ showBackGrid, only until we display the target, displays a square grid as a static background. Grid center is midway between two gridlines.  It accepts five arguments as comma separated values:\nspacingDeg, thicknessDeg, lengthDeg, xCenterPx, yCenterPx, \nspacingDeg (default 0.5) is the center-to-center line spacing in both x and y.\nthicknessDeg (default 0.03) is the line thickness.\nlengthDeg (default 1000, i.e. whole screen) is the length of each grid line.\nxCenterPx and yCenterPx (default middle of screen) are the pixel coordinates of the grid center. ",
    type: "text",
    default: "0.5,0.03,1000",
    categories: "",
  },
  {
    name: "showBeepButtonOnBlockInstructionBool",
    availability: "now",
    example: "",
    explanation:
      "🕑 showBeepButtonOnBlockInstructionBool (default TRUE) shows a Beep button in the upper right corner of the block-instruction page. Typically every trial beeps when the response was correct, so it's good to give the participant a chance to get the sound working before beginning the block. However, some tasks, e.g. rating, do not use sound at all, and then the Beep button is superfluous.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "showBoundingBoxBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "showBoundingBoxBool (default FALSE). For debugging, setting showBoundingBoxBool=TRUE displays the bounding box around the target character (if spacing is ratio) or flanker-target-flanker triplet (if spacing typographic). We display the getBoundingBox method from psychojs, using tight=true. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showCharacterSetBoundingBoxBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "showCharacterSetBoundingBoxBool displays the bounding box of the whole fontCharacterSet.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showCharacterSetForAllResponsesBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "showCharacterSetForAllResponsesBool (default FALSE). It's obvious that identifying a letter by clicking requires display of a character set to click on. However, sometimes we show a foreign characterSet with Roman labels, to enable use of a Roman keyboard, or the scientist may just want the actual letter shapes to be visible while the participant types. This flag tells EasyEyes to display the fontCharacterSet whenever the participant is responding.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showCharacterSetWhere",
    availability: "now",
    example: "bottom",
    explanation:
      'showCharacterSetWhere (default bottom) can be bottom, top, left, or right. After a trial, this shows the observer the allowed responses. If the target was a letter then the possible letters are called the "characterSet". If the target is a gabor, the characterSet might display all the possible orientations, each labeled by a letter to be pressed.',
    type: "categorical",
    default: "bottom",
    categories: "none, bottom, top, left, right",
  },
  {
    name: "showCharacterSetWithLabelsBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 showCharacterSetWithLabelsBool (default FALSE). For foreign or symbol characterSets, we add Roman labels that the observer can type on an ordinary (Roman) keyboard.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showConditionNameBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ showConditionNameBool (default FALSE). If TRUE, then display condition name as text at lower-left corner, or, if showTargetSpecsBool is TRUE, above target specs. See showTargetSpecsBool. The point size of condition-name text should be 1.4x bigger than we use for target specs. We have several text messages that stack up in the lower left corner. If all four are present, then showText on top, above showConditionNameBool, above showExperimentNameBool, above showTargetSpecsBool.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showCounterBool",
    availability: "now",
    example: "TRUE",
    explanation:
      '⭑ showCounterBool. If TRUE display something like,"Trial 31 of 120. Block 2 of 3. At 32 cm." (The trailing part about distance is included only if showViewingDistanceBool is TRUE.) The trial counter counts all trials in the block, which may have several conditions. If the block has three conditions with 40 blocks each, then there are 120 trials in the block. ',
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "showCounterWhere",
    availability: "now",
    example: "bottomRight",
    explanation:
      "showCounterWhere (default bottomRight). Can be bottomLeft, bottomCenter, or bottomRight. This location is used for both the trial count AND the viewing distance. ",
    type: "categorical",
    default: "bottomRight",
    categories: "bottomLeft, bottomRight, bottomCenter",
  },
  {
    name: "showDot",
    availability: "now",
    example: "",
    explanation:
      '❌showDot displays a static dot. It accepts several arguments as comma separated values.\nxPix, yPix, diameterDeg, colorRGBA\nxPix and yPix (default middle of screen) are pixel coordinate of the grid center.  Pixel instead of visual coordinates because fixation may be moving. We use Apple screen coordinates so origin is upper left corner of screen.\ndiameterDeg (default 0.5) is the dot diameter.\ncolorRGBA (default black) is four comma separated values. 0,0,0,1 is black, 1,1,1,1 is white. The fourth number "A" is alpha, controlling transparency.',
    type: "text",
    default: ",,0.5,0,0,0,1",
    categories: "",
  },
  {
    name: "showExperimentNameBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "🕑 showExperimentNameBool (default FALSE) is useful when making screenshots to show the experimentName (i.e. the name of the Pavlovia repository, e.g. crowding3). It should go in the lower left corner. We have several text messages that stack up there. If all four are present, then showText on top, above showConditionNameBool, above showExperimentNameBool, above showTargetSpecsBool.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showFPSBool",
    availability: "now",
    example: "",
    explanation: "❌ Obsolete, but EasyEyes crashes if we remove it.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showGazeBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "showGazeBool shows a red dot indicating latest estimated gaze position. (It is delayed by processing time.)",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showGazeNudgerBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "After recording the participant's trial response, if showGazeNudgerBool is TRUE and abs(gazeMeasuredXDeg) > thresholdAllowedGazeXErrorDeg then EasyEyes displays a red arrow going from the recorded gaze position (gazeMeasuredXDeg, gazeMeasuredYDeg) to the crosshair and a popup window mentioning that the estimated gaze position was too far from the crosshair.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showGrid",
    availability: "now",
    example: "deg",
    explanation:
      "⭑ showGrid (default is disabled) displays a full-screen grid that aids visual checking of location and size (both live and in screen shots). [pt & inch NOT YET IMPLEMENTED.] Set showGrid to:\n• 'none' for no grid\n• 'disabled' to prevent any grid\n• 'px' for a pixel grid\n• 'pt' for a typographic \"points\" grid (72 pt per inch)\n• 'cm' for a centimeter grid\n• 'inch' for an inch grid\n• 'mmV4' for a cortical grid, \n• 'deg' or 'degDynamic' for a degrees grid. When the crosshair moves, the 'degDynamic' grid moves with it, and the 'deg' grid does not. 'degDynamic' specifies degrees relative to the (possibly) moving crosshair. 'deg' specifies degrees relative to the nominal fixation, which is the fixed point that the moving crosshair circles around.\n\nUnless 'disabled', repeatedly pressing the backquote key (below ESCAPE on a macOS keyboard) cycles through all states except disabled: none, px, cm, pt, inch, deg, degDynamic, mmV4. The 'px', 'cm', 'pt', and 'inch' grids have their origin at lower left. The 'deg', 'degDynamic', and 'mmV4' grids have their origin at fixation. \n\nCAUTION: The grids are for stimulus checking, not human testing. The visual grid is likely to mask your stimulus, and drawing the grid can take time, especially when the crosshair moves, which might compromise stimulus timing (lateness and wrong duration). So turn off grids when you check timing or collect human data.",
    type: "categorical",
    default: "disabled",
    categories: "px, pt, cm, in, deg, degDynamic, mmV4, none, disabled",
  },
  {
    name: "showImage",
    availability: "now",
    example: "",
    explanation:
      'showImage (no default) accepts the filename of an image, including the extension, which is shown centered as large as possible with all image pixels visible, against a screenColorRGBA background. The image remains until dismissed. Accept the RETURN key if typing is enabled (responseTypedBool==TRUE). If clicking is enabled (responseClickedBool==TRUE), superimpose a "Proceed" button near bottom middle, and accept a click of the Proceed button. In either case, proceed to next block. Often both will be enabled. Typing on the keypad is equivalent to typing on the keyboard. The compiler requires that the image has previously been uploaded to the Pavlovia EasyEyesResources repo by submission through the "Select file" button. NOTE: the text for the "Proceed" button name is the international phrase T_proceed.  The commands showConditionNameBool, showCounterBool, showViewingDistanceBool, and showTargetSpecsBool are supported as usual.\nAccepts image file extentions: PNG, JPG, JPEG, and SVG.\n\nWe use it to present a storybook narrative when testing children. \n\nUse screenColorRGBA to specify the color of any visible background (when image doesn\'t fill screen). Use instructionFontColorRGBA to set the color of any text produced by showConditionNameBool, showCounterBool and showViewingDistanceBool, and showTargetSpecsBool.\n\nWhen both responseClickedBool=responseTypedBool=FALSE the compiler should report that as an error.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "showParameters",
    availability: "now",
    example: "",
    explanation:
      "🕑 showParameters (no default) accepts a comma-separated list of parameter names. Its display is in the style of showTargetSpecsBool, but it allows the scientist to specify which parameters to display. All the parameters are displayed at the left edge of the screen, bottom-aligned, one per row, each with its value. At the moment, we only allow input parameters, but we will extend this list to include internal parameters.",
    type: "categorical",
    default: "",
    categories: "",
  },
  {
    name: "showPercentCorrectBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "⭑ If showPercentCorrectBool (default TRUE) is TRUE for any condition in this block, then, at the end of the block, EasyEyes presents a pop-up window reporting the overall percent correct (acrosss all conditions for which showPercentCorrectBool is TRUE) in that block. The participant dismisses the window by hitting RETURN or clicking its Proceed button. This feature was requested by maybe a third of the participants who sent comments. Adults like this, and we routinely include it. Experts say this should not be used with children as they might be discouraged by getting a low percent. For children the messages should be reliably encouraging, regardless of actual performance level.",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "showProgressBarBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "⭑ showProgressBarBool (default FALSE) is meant for children. When TRUE, EasyEyes displays a vertical green bar that tracks the trial count for the block (or experiment? I can't remember). The outline goes from bottom to top of the screen and it gradually fills up with green liquid, empty at zero trials, and filled to the top after the last trial of the block (or experiment? I can't remember). Sometimes we call the green liquid spaceship fuel for Jamie the astronaut.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showTakeABreakCreditBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "showTakeABreakCreditBool (default FALSE). MANY PARTICIPANTS REPORT LIKING THIS. Intended for long blocks, over 50 trials. Participants seem to spontaneously pause betwen blocks to catch their breath and blink their eyes, but they don't do it within a long block, and they may complain that they feel stressed and that their eyes hurt (they sting because they didn't blink during the block, which dries out the cornea), so we added this feature to force a break every so often. If showTakeABreakCreditBool (default FALSE) then display the value of takeABreakCredit as a graphical icon next to the trial counter. A black box that gradually fills, from the bottom up, with glowing green. Empty for zero and full for 1. The box is currently centered at bottom of screen, but we plan to make it contiguous to the trial counter display.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showTargetSpecsBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "CURRENTLY CRASHES. showTargetSpecsBool (default FALSE). For debugging. If TRUE, showTargetSpecsBool (default FALSE) displays various target parameters, including size and spacing, in lower left corner, similar to the trial/block counter. We have several text messages that stack up in the lower left corner. If all four are present, then showText on top, above showConditionNameBool, above showExperimentNameBool, above showTargetSpecsBool.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "showText",
    availability: "now",
    example: "Click the crosshair.",
    explanation:
      "🕑 showText (no default). Display the provided text (no default) as a left-aligned string. It'd be great to allow basic MD formatting.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "showViewingDistanceBool",
    availability: "now",
    example: "FALSE",
    explanation:
      '⭑ showViewingDistanceBool (default FALSE). If TRUE display something like "Trial 31 of 120. Block 2 of 3. At 32 cm." (The trial and block counters appear only if showCounterBool is TRUE.) Without distance tracking, this is a subtle reminder to the participant of the distance they are supposed to be at. With distance tracking, it allows both the participant and the experimenter to monitor the dynamic viewing distance. It\'s updated only once or twice per trial, to avoid drawing attention away from the stimulus.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "simulateParticipantBool",
    availability: "now",
    example: "FALSE",
    explanation:
      "⭑ simulateParticipantBool (default FALSE). Use the software model specifed by simulationModel to generate observer responses. The test runs without human intervention. SIDE EFFECT: Setting simulateParticipantBool to TRUE enables typed responses, regardless of the setting of responseTypedBool. Implemented for targetKind: letter, repeatedLetter, and rsvp targetKind. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "simulateWithDisplayBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "simulateWithDisplayBool (default TRUE). If TRUE, then display the stimuli as though a participant were present. If FALSE, then skip display to run as fast as possible. ",
    type: "boolean",
    default: "TRUE",
    categories: "",
  },
  {
    name: "simulationBeta",
    availability: "now",
    example: "3",
    explanation:
      "simulationBeta (default 2.3). Used by the Weibull observer model. Usually, you'll want this to match thresholdBeta.",
    type: "numerical",
    default: "2.3",
    categories: "",
  },
  {
    name: "simulationDelta",
    availability: "now",
    example: "0.01",
    explanation:
      "simulationDelta (default 0.01). Used by the Weibull observer model. Usually, you'll want this to match thresholdDelta.",
    type: "numerical",
    default: "0.01",
    categories: "",
  },
  {
    name: "simulationModel",
    availability: "now",
    example: "blind",
    explanation:
      "⭑ simulationModel (default ideal). For debugging and checking, it is often helpful to simulate the observer. simulationModel can be: \n• right: Always right.\n• wrong: Always wrong.\n• blind: This model presses a random response key. \n• ideal: This model does the same task as the human, picking the best response (i.e. maximizing expected proportion correct) given the stimulus. The ideal knows the target probabilities and the noise statistics. Its threshold is a useful point of reference in analyzing human data. Without noise, the ideal will always be right. Since noise hasn't yet been implemented in EasyEyes, for now, this model just gives the right answer.\n• weibull: This model gets the trial right with a probability given by the Weibull function, which is frequently fit to human data. The QUEST staircase asssumes the Weibull model, so QUEST should accurately estimate its (unknown to Quest) threshold, when the rest of the QUEST parameters match: simulationBeta, simulationDelta. Both use the same gamma=1/fontCharacterSet.len. https://psychopy.org/api/data.html#psychopy.data.QuestHandler\nIn MATLAB, the Weibull model observer is: \nfunction response=SimulateWeibull(q,tTest,tActual)\n   t=tTest-tActual+q.epsilon;\n   P=q.delta*q.gamma+(1-q.delta)*(1-(1-q.gamma)*exp(-10.^(q.beta*t)));\n   response= P > rand(1);\nend\nresponse=1 means right, and response=0 means wrong. \nP=probability of a correct response\nq is a struct holding all the Weibull parameters. \nq.beta=simulationBeta\nq.delta=simulationDelta\nq.epsilon is set (once) so that P=thresholdProportionCorrect when tTest-tActual=0. \nq.gamma=probability of blindly guessing the correct answer, =1/fontCharacterSet.len.\ntTest is the stimulus intensity level (usually log10 of physical parameter).\ntActual=log10(simulationThreshold) is the true threshold of the simulation.\nrand(1) returns a random sample from the uniform distribution from 0 to 1.\nThe source code for our simulation model is here:\nhttps://github.com/EasyEyes/threshold/blob/a9ea5a6c64d3c5ff0aacfc01c86b6a5aecf64369/components/simulatedObserver.js",
    type: "categorical",
    default: "ideal",
    categories: "right, wrong, blind, weibull, ideal",
  },
  {
    name: "simulationThreshold",
    availability: "now",
    example: "0",
    explanation:
      "simulationThreshold (default 2). The actual threshold of the simulated observer in linear units (not log). We test the implementation of Quest by testing how well it estimates simulationThreshold.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "soundGainDBSPL",
    availability: "now",
    example: "13",
    explanation:
      'soundGainDBSPL (default 125) is the assumed louspeaker gain (dB SPL) at 1000 Hz from digital sound (inDb) to physical sound (outDbSpl),\noutDbSpl=inDb+soundGainDbSpl.\nThe "level" of a sound vector is 10*log(P) dB, where the power is P=mean(S^2), and S is the sound vector. The scientist will normally set calibrate1000HzDBSPLBool=TRUE to measure soundGainDBSPL on the participant\'s computer at several sound levels at 1000 Hz, and calibrateAllHzDBSPLBool=TRUE for the other frequencies. If calibrate1000HzDBSPLBool=FALSE then EasyEyes uses soundGainDBSPL as the default. Running with calibrate1000HzDBSPLBool=TRUE calibrates at 1000 Hz and sets soundGainDBSPL to fit what was measured at 1000 Hz. Running calibrateAllHzDBSPLBool measures the impulse response, computes the inverse impulse response (over some range, perhaps 250 to 8000 Hz), normalizes filter amplitude to have unit gain at 1000 Hz, and installs that filter. Thus, in that case, soundGainDBSPL will be correct for all frequencies (over some range like 250 to 8000 Hz).',
    type: "numerical",
    default: "125",
    categories: "",
  },
  {
    name: "spacingDeg",
    availability: "now",
    example: "",
    explanation:
      "spacingDeg (default 2) specifies the spacing, in degrees, center-to-center from target to a flanker. This input value is ignored when you use Quest to measure the spacing threshold. If spacingDirection is tangential then spacingDeg is spacing to either flanker, as the spacings are equal. If spacingDirection is radial then then spacingIsOuterBool (default FALSE) determines whether spacingDeg is the spacing from target to outer (or inner) flanker.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "spacingDirection",
    availability: "now",
    example: "radial",
    explanation:
      'spacingDirection (default radial). When eccentricity is nonzero then spacingDirection can be horizontal, vertical, horizontalAndVertical, radial, tangential, or radialAndTangential. When eccentricity is zero then spacingDirection can be horizontal, vertical, or horizontalAndVertical. The "...And..." options display four flankers, distributed around the target. It is an error to request radial or tangential  or radialAndTangential spacingDirection at eccentricity zero, because they are undefined there.',
    type: "categorical",
    default: "radial",
    categories:
      "horizontal, vertical, horizontalAndVertical, radial, tangential, radialAndTangential",
  },
  {
    name: "spacingIsOuterBool",
    availability: "now",
    example: "TRUE",
    explanation:
      "spacingIsOuterBool (default FALSE). When spacingDirection is radial, there are two flankers, inner and outer. In general each has a different (center to center) spacing to the target. To replicate CriticalSpacing data, when thresholdPameter is spacing, spacingSymmetry is cortex, and spacingRelationToSize is ratio or typographic, spacingIsOuterBool (default FALSE) determines whether target size is based on inner (FALSE) or outer (TRUE) spacing. ",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "spacingOverSizeRatio",
    availability: "now",
    example: "1.4",
    explanation:
      "⭑ spacingOverSizeRatio (default 1.4) specifies the ratio of spacing (in deg, center of target to center of inner flanker) to size (in deg, can be width or height as specified by targetSizeIsHeightBool). Ignored unless spacingRelationToSize is ratio. In that case, target size is spacing/spacingOverSizeRatio.",
    type: "numerical",
    default: "1.4",
    categories: "",
  },
  {
    name: "spacingRelationToSize",
    availability: "now",
    example: "ratio",
    explanation:
      '⭑ spacingRelationToSize (default ratio) can be none, ratio, or typographic. When thresholdParameter is "spacing", spacingRelationToSize specifies how target size depend on center-to-center target-flanker spacing. And when thresholdParameter is "size", spacingRelationToSize specifies how spacing depend on size.\n• none means no dependence. Size and spacing are set independently. \n• ratio means accept the thresholdParameter (which is either size or spacing) and adjust the other parameter to satisfy the specified spacingOverSizeRatio. There are two flankers, inner and outer. In general each has a different (center to center) spacing to the target. "ratio" refers to the ratio of spacing to target size. Set spacingIsOuterBool to choose whether size scales with inner  (FALSE) or outer (TRUE) spacing.\n• typographic prints the triplet (flanker, target, flanker) as a (horizontal) string (horizontally) centered on the specified target eccentricity. By "horizontal" and "vertical", we just mean the orientation of the baseline, and orthogonal to it. ("Vertically," the fontCharacterSet bounding box is centered on the eccentric location, and all letters in the string are on same baseline.) If thresholdParameter is "spacing" then the font size of string is adjusted so that the width of the string is 3× specified spacing. Works with both left-to-right and right-to-left fonts. [If thresholdParameter is "size" then EasyEyes adjusts the font size of the string to achieve the specified target size.] ',
    type: "categorical",
    default: "ratio",
    categories: "none, ratio, typographic",
  },
  {
    name: "spacingSymmetry",
    availability: "now",
    example: "screen",
    explanation:
      '⭑ spacingSymmetry (default retina) can be screen, retina, or cortex. This is ignored unless radial eccentrity is nonzero and spacingDirection is radial, which means that the target lies between two flankers, all on a radial line. The "inner" flanker is closer to fixation than the target. The "outer" flanker is farther than the target. We refer to the center-to-center spacing from target to inner and outer flankers as the inner and outer spacings. Parameter spacingDeg specifies the outer spacing. spacingSymmetry affects only the inner spacing, which is calculated to make the two flanker spacings symmetric in one of three ways: at the screen (i.e. equal in pixels), at the retina (i.e. equal in deg), or at the cortex, i.e.  log(outer+eccDeg + 0.15)-log(eccDeg + 0.15)=log(eccDeg + 0.15)-log(eccDeg-inner + 0.15), where eccDeg is the target\'s radial eccentricity in deg. To check the spacing symmetry, you may want to show a corresponding grid by setting parameter showGrid to px or cm (for screen), deg (for retina), and mm (for cortex).',
    type: "categorical",
    default: "retina",
    categories: "screen, retina, cortex",
  },
  {
    name: "takeABreakMinimumDurationSec",
    availability: "now",
    example: "2",
    explanation:
      "takeABreakMinimumDurationSec (default 2). The minimum duration when EasyEyes takes a break. The main purpose of the break is to blink, so 2 sec is enough. See takeABreakTrialCredit.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "takeABreakTrialCredit",
    availability: "now",
    example: "0.05",
    explanation:
      'takeABreakTrialCredit sets the value that accrues from performing each trial of this condition. See showTakeABreakBool for explanation. Set it to zero for no breaks. The block\'s running total, regardless of condition, is kept in the internal parameter takeABreakCredit, which is zero at the beginning of each block. When takeABreakCredit exceeds 1, EasyEyes immediately subtracts 1 and takes a break. \nTHE BREAK\nEasyEyes displays a pop-up window with a dark surround, "Good work! Please take a brief break to relax and blink." Responses (except ESCAPE) and viewing-distance nudging are suspended for the time specified by takeABreakMinimumDurationSec. Then EasyEyes reenables responses, adds a Proceed button, and adds text, "To continue hit Proceed or RETURN." The participant can take as long as they need. When they hit Proceed (or RETURN), EasyEyes closes the pop up window, reenables the nudger (if it was formerly active), and resumes testing. ',
    type: "numerical",
    default: "0.05",
    categories: "",
  },
  {
    name: "targetBoundingBoxHorizontalAlignment",
    availability: "now",
    example: "center",
    explanation:
      'targetBoundingBoxHorizontalAlignment (default center). When computing the characterSet bounding box as the union of the bounding box of each letter, align the bounding boxes horizontally by "center" or "origin". The bounding boxes are always vertically aligned by baseline.',
    type: "categorical",
    default: "center",
    categories: "center, origin",
  },
  {
    name: "targetColorRGBA",
    availability: "now",
    example: "",
    explanation:
      'targetColorRGBA (default 0,0,0,1 i.e. black) is a comma-separated list of four numbers (each ranging from 0 to 1) that specify traget color for each condition. "RGB" are the red, green, and blue channels; "A" controls opacity (0 to 1). 0,0,0,1 is black and 1,1,1,1 is white. For Venier, screenColorRGBA="0,0,0,1" sets the background black, and targetColorRGBA="1,1,1,1" sets the target white, markingColorRGBA=”1,1,1,1” sets the fixation mark white, and instructionFontColorRGBA=”1,1,1,1” set the instructions white. The ColorRGBA controls include fontColorRGBA, instructionFontColorRGBA, markingColorRGBA, screenColorRGBA, and targetColorRGBA. ',
    type: "text",
    default: "0,0,0,1",
    categories: "",
  },
  {
    name: "targetContrast",
    availability: "now",
    example: "",
    explanation:
      "targetContrast (default 1) is the desired luminance contrast of the target. For letters we use Weber contrast, \nc=(LLetter-LBackground)/LBackground. \nA white letter has contrast +1; a black letter has contrast -1.\nFor gabors, we use Michelson contrast, \nc=(LMax-LMin)/(LMax+LMin).\nFor scientist-supplied images, the image is presented faithfully when targetContrast is 1, and scaled in contrast proportionally when targetContrast is not 1.\nNOTE: Until we shift to using HDR movies, contrast is only accurate for values of -1, 0, and 1.",
    type: "numerical",
    default: "-1",
    categories: "",
  },
  {
    name: "targetCyclePerDeg",
    availability: "now",
    example: "",
    explanation:
      "targetCyclePerDeg (default 0) is the target spatial frequency in cycles per deg. Sine of zero is zero and cosine of zero is 1, so if you're using zero targetCyclePerDeg to get a Gaussian blob, then set targetPhaseDeg to 90.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetDelaySec",
    availability: "now",
    example: "",
    explanation:
      "targetDelaySec (default 0) delays presentation of the target in a movie. By default, time is zero at the middle of the movie. EasyEyes will subtract targetDelaySec from that default to produce the time coordinate used to compute the target (and envelope). This is unlike targetPhaseTemporalDeg which affects only the target, not the envelope.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetDurationSec",
    availability: "now",
    example: "0.15",
    explanation:
      "⭑ targetDurationSec (default 0.15) is the duration of target presentation. For demos and debugging, it is handy to set responseAllowedEarlyBool to TRUE with a long targetDurationSec (e.g. 999) so that the stimulus stays up while you examine it, yet you can quickly click through several stimuli to see the progression. Set responseAllowedEarlyBool to FALSE if you want to allow response only after target offset.",
    type: "numerical",
    default: "0.15",
    categories: "",
  },
  {
    name: "targetEccentricityXDeg",
    availability: "now",
    example: "10",
    explanation:
      "⭑ targetEccentricityXDeg (default 0) is the x location of the target center, relative to fixation. The target center is defined as the center of the bounding box for the letters in the fontCharacterSet. (See targetBoundingBoxHorizontalAlignment.)",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetEccentricityYDeg",
    availability: "now",
    example: "0",
    explanation:
      "⭑ targetEccentricityYDeg (default 0) is the y location of the target center, relative to fixation.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetGapDeg",
    availability: "now",
    example: "",
    explanation:
      "targetGapDeg (default 10/60=0.167) vertical gap separating the upper and lower Vernier lines.",
    type: "numerical",
    default: "0.167",
    categories: "",
  },
  {
    name: "targetHz",
    availability: "now",
    example: "",
    explanation:
      "targetHz (default 0) is the target temporal frequency in Hz. Not to be confused with the movie's frame rate, movieHz, which is independent.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetImageFolder",
    availability: "now",
    example: "faces",
    explanation:
      "🕑 targetImageFolder (empty default) names a folder of images (each file must have extension APNG, AVIF, GIF, JPEG, JPG, JP2, PNG, SVG, or WebP) that may be used when targetKind==image. (JPG is just an abbreviation of the JPEG extension; JP2 indicates JPEG 2000.) On each trial, the target image is sampled randomly, without replacement, from the images in the image folder. (\"Without replacement\" considers all the trials of this condition of this block. Other conditions and blocks are independent.) The folder is submitted as a zip archive to the EasyEyes drop box, and saved in the EasyEyesResources repository of the scientist's Pavlovia account. To be clear: The scientist creates a suitably named folder full of images, and zips that; the zip archive inherits the name of the folder. Each file in the folder must have one of the allowed image-file extensions. Different files can have different extensions. No subfolders are allowed. An experiment uses the folder by setting targetImageFolder to the name of the zip archive, without the extension.\n\nEach image with embedded icc color profile will be color managed. 10-bit rendering and HDR are automatic, but require use of 16-bit png or jpeg2000. Parameters allow the scientist to specify eccentricity, size, and duration. When the images have diverse size the scientist can instead specify image pixels per degree. \nCOLOR MANAGEMENT. The browser's color-managed rendering will take into account the ICC color profiles of the image and display. For accurate image rendering, each image should have an embedded ICC color profile. (The informal convention of assuming an sRGB profile when none is embedded seems too unreliable, across browsers, for research-grade stimuli.) \n\nHDR. A large proportion of computer displays produced in recent years support 10 bits per color channel, and most browsers now use the 10 bits when displaying HDR (High dynamic range) images using the HTML <img> tag. Several Netflix engineers studied how to achieve 10-bit display on current browsers using available image formats. \nhttps://netflixtechblog.com/enhancing-the-netflix-ui-experience-with-hdr-1e7506ad3e8\nThey recommend using 16-bit PNG or JPEG 2000. 16-bit PNG is supported by the several browsers we tested. As of September 2022, Safari was the only browser supporting JPEG 2000.\nhttps://caniuse.com/jpeg2000\nSurprisingly, another web page claims that JPEG2000 is also supported by Chrome and Firefox.\nhttps://fileinfo.com/extension/jp2\n\n[FUTURE: Instead of the zip archive, we could also allow our submit box to accept a folder, which it copies, including all the directly enclosed files.]",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "targetKind",
    availability: "now",
    example: "letter",
    explanation:
      '⭑ targetKind (default letter) specifies the kind of target.\n• letter On each trial, the target is a randomly selected character from the fontCharacterSet displayed in the specified font.\n• repeatedLetter. Display many copies of two targets, alternating across the screen. The observer reports both. Thus each presentation gets two responses, which count as two trials. The two target letters alternate for as many lines as fit on the screen and within targetRepeatsMaxLines. The last character at both ends of each line is targetRepeatsBorderCharacter. Neighboring lines are complementary so that the nearest letter from one line to a neighboring line is the other target.  David Regan and colleagues (1992) reported that in testing foveal acuity of patients with poor fixation (e.g. nystagmus) it helps to have a "repeat-letter format" eye chart covered with letters of the same size, so that no matter where the eye lands, performance is determined by the letter nearest to the point of fixation, where acuity is best. We here extend that idea to crowding. We cover some part of the screen with an alternating pattern of two letters, like a checkerboard, so that the letters can crowd each other, and ask the observer to report both letters. Again, we expect performance to be determined by the letters nearest to the (unpredictable) point of fixation, where crowding distance is least. HORIZONTALLY, the two targets alternate, forming a line, and size and spacing are specified in the usual way. VERTICALLY. If there is more than one line, then the line spacing (baseline to baseline) is the product of spacingOverSizeRatio and the height of the bounding box of fontCharacterSet.\nIMPORTANT: As of February, 2021, we need to set fontPadding=4 (very high) in order to avoid clipping of the letters when we use the Pelli font. Such a high padding may cause errors in target latency and duration. EasyEyes reports targetMeasuredLatenessSec and targetMeasuredDurationSec in the CSV file. Such errors typically matter only when targetDurationSec is a fraction of a second.\n• vernier Two vertical lines separated by a fixed vertical targetGapDeg and a variable horizontal targetOffsetDeg.\n• gabor A gabor is the product of a Gaussian and a sinewave. As a function of space, the sinewave produces a grating, and the Gaussain vignettes it to a specific area, without introducing edges. Gabors are a popular stimulus in vision research because they have compact frequency and location.\n• image An image is randomly drawn, without replacement (for this condition in this block) from a folder whose name is specified by targetImageFolder. The image is displayed at the target eccentricity with the target size. The image aspect ratio is preserved.\n• movie EasyEyes uses javascript movieComputeJS, provided by the scientist to compute an HDR movie, newly generated for each trial, and allows targetTask to be identify or detect.\n• reading Measure reading speed and retention. Uses specified font and writing direction (fontLeftToRightBool). readingXXX parameters specify corpus and starting point, control font size (usually via letter-to-letter spacing in deg), number of characters per line, and number of lines per page, and determine how many alternatives in each retention question and how many retention questions. The set of alternatives consists of a target word and foils that have approximately the same frequency in the corpus. IMPORTANT: conditionTrials is ignored when targetKind==reading. \n• rsvpReading Flashes several words with Quest-controlled word duration. The parameter responseSpokenToExperimenterBool determines whether the trial\'s scoring is "spoken" (for children) or "silent" (for adults). In "silent" scoring, the participant sees a horizontal row of lines, each representing a shown word. Below each line is a list of possible words, including the correct one. The participant must select a word in each column to continue. readingXXX parameters specify how many alternatives for each word and how many retention questions. The set of alternatives consists of a target word and foils that have approximately the same frequency in the corpus.  In "spoken" scoring we assume that an experimenter sits next to the child participant, who reads the presented words aloud. Once the child has read the words aloud, the experimenter presses the SHIFT key to see the actual words, to guide scoring of what the child said. For each word, the experimenter presses either the up arrow for correct or down arrow for wrong. Supports fontLeftToRightBool for, e.g., Arabic.\n• sound A sound is randomly drawn, without replacement (for this condition in this block) from a folder whose name is specified by targetSoundFolder. The target sound is played for its full duration at level targetSoundDBSPL with a masker sound randomly selected from the maskerSoundFolder played at level maskerDBSPL. Also, in the background, we play targetSoundNoise at level targetSoundNoiseDBSPL.\n• vocoderPhrase. The targetSoundFolder and maskerSoundFolder each contain a hierarchy of folders containing 16-channel sound files. Each sound file is named for a word and contains the original or processed sound of that word (except that the file called "GoTo.wav" in fact contains the two words "go to"). The top level of folders in targetSoundFolder and maskerSoundFolder are folders of sounds produced by several talkers. Currently the talkers (Talker11, Talker14, Talker16, and Talker18) are all female. On each trial the target and masker are randomly assigned different talkers (never equal). Within each talker\'s folder are several loose word files (Now.wav, GoTo.wav, and Ready.wav), and several category folders (CallSign, Color, Number) that each contain several word files. Each trial follows text phrases provided in the parameters targetSoundPhrase and maskerSoundPhrase. Each phrase consists of a series of explicit words and category names, with each category name preceded by #. Currently the targetSoundPhrase is "Ready Baron GoTo #Color #Number Now", and the maskerSoundPhrase is "Ready #CallSign GoTo #Color #Number Now". The target and masker phrases are played at the same time, aligning the temporal midpoint of both words in each target-masker pair by symmetrically padding both ends of the briefer word with zeroes to make it the same length as the longer word. Each explicit word in each script is played every time. On each trial, each word category, marked by #, is replaced by a randomly selected word from that category folder, except that target and masker are always different from each other when either is drawn from a category.  On each trial, the target and masker phrases are combined by randomly taking targetSoundChannels (default 9) of the 16 channels of every word in the target phrase, and the remaining 16-targetSoundChannels channels from the masker words. The channel selection is consistent for all the words in the phrase, and new for each trial. targetSoundDBSPL specifies the sound level of the combined targetSoundChannels channels taken from each target word. Similarly maskerSoundDBSPL specifies the sound level of the combined 16-targetSoundChannels channels taken from each masker word. Also, we play targetSoundNoise at level targetSoundNoiseDBSPL. The Zhang et al. (2021) paper mentions a noise control, in which the masker is white noise that has been filtered into 16 bands and windowed into word-length durations. The scientist achieves this simply by providing a maskerSoundFolder made up of these 16-channel noises, each derived from a word. \nRESPONSE. After playing the phrase, EasyEyes displays two columns, one for each category word in the targetSoundPhrase. The observer must select one word in each column in order to proceed to the next trial. (This is forced choice.) We score the trial as right only if both responses are right. That overall right/wrong response is provided to QUEST, which controls the targetSoundDBSPL.⭑ ',
    type: "categorical",
    default: "letter",
    categories:
      "letter, gabor, vernier, movie, sound, vocoderPhrase, reading, rsvpReading, repeatedLetters",
  },
  {
    name: "targetLengthDeg",
    availability: "now",
    example: "",
    explanation:
      "targetLengthDeg (default 1) is the length of each line in the Vernier target.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "targetMinimumPix",
    availability: "now",
    example: "8",
    explanation:
      "targetMinimumPix (default 8) specifies enough pixels for decent rendering of this target. This refers to size (in pixels) as specified by targetSizeIsHeightBool.",
    type: "numerical",
    default: "8",
    categories: "",
  },
  {
    name: "targetOffsetDeg",
    availability: "now",
    example: "",
    explanation:
      "targetOffsetDeg (default 0.1) the horizontal offset between two vertical Vernier lines that are colinear at zero offset. The two lines split the offset. They are displaced in opposite directions, each by half targetOffsetDeg. Displacement direction is random for each trial.",
    type: "numerical",
    default: "0.1",
    categories: "",
  },
  {
    name: "targetOrientationDeg",
    availability: "now",
    example: "",
    explanation:
      "targetOrientationDeg (default 0) is the orientation of the target, clockwise from vertical.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetPhaseSpatialDeg",
    availability: "now",
    example: "",
    explanation:
      "targetPhaseSpatialDeg (default 0) is the target spatial phase in degrees.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetPhaseTemporalDeg",
    availability: "now",
    example: "",
    explanation:
      "targetPhaseTemporalDeg (default 0) is the target temporal phase in degrees.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "targetRepeatsBorderCharacter",
    availability: "now",
    example: "$",
    explanation:
      "targetRepeatsBorderCharacter (default \"$\"). When targetKind=repeatedLetters, then targetRepeatsBorderCharacter specifies the character to use to make the outer border. This character has letters on only one side, so it's less crowded. So we don't want to give the game away by putting a target letter here.",
    type: "text",
    default: "$",
    categories: "",
  },
  {
    name: "targetRepeatsMaxLines",
    availability: "now",
    example: "3",
    explanation:
      "targetRepeatsMaxLines (default 3) can be 1, 3, 4, 5, … . This is relevant only when targetKind=repeatedLetters. targetRepeatsMaxLines specifies the desired number of lines, but fewer lines may be displayed if limited by screen height. We recommend 1 and 3. Small children are alarmed by the repeatedLetters display if there are many lines, and this alarm is minimized by using no more than 3 lines. If there is more than one line, then the line spacing (baseline to baseline) is the product of spacingOverSizeRatio and the height of the bounding box of fontCharacterSet. The programmer reports that the two-line display produced by targetRepeatsMaxLines=2 is wrong, but we don't expect to ever use that case, so we moved on to more pressing issues. Please let us know if you need the 2-line case.",
    type: "numerical",
    default: "3",
    categories: "",
  },
  {
    name: "targetSafetyMarginSec",
    availability: "now",
    example: "0.5",
    explanation:
      "IMPORTANT: At the moment, only the OFFSET portion of this parameter is implemented. IMPORTANT: Currently targetSafetyMarginSec only affects the after-target delay, from target offset to response screen onset. The participant cannot respond until that interval ends. targetSafetyMarginSec has no effect on the before-target delay. Use markingOffsetBeforeTargetOnsetSecs to control the delay between trial onset and display of the target.\n****************************\nEasyEyes guarantees a blank time of targetSafetyMarginSec before and after the target presentation to minimize forward and backward masking of the target by instructions and other non-stimulus elements, including the characterSet and nudger. \n     OFFSET: After target offset, EasyEyes waits targetSafetyMarginSec before presenting instructions and the characterSet. (Nudging isn't allowed until after the participant responds.)\n\n🕑\n     ONSET: Since target onset is almost immediately after trial initiation, initiation of a trial is disabled until targetSafetyMarginSec has passed since the nudger and instructions were erased. \n     Instruction contrast c will be determined by the ratio r of cursor-to-crosshair distance to characterSet-to-crosshar distance. \n          c=max(0, 2r-1). \nThus, as the cursor moves from the response characterSet to the crosshair, the instruction contrast will initally be 1 when the cursor is at the characterSet (r=1), will linearly fall to reach zero halfway to the crosshair (r=0.5), and remain at zero the rest of the way to the crosshair (r=0). ",
    type: "numerical",
    default: "0.7",
    categories: "",
  },
  {
    name: "targetSizeDeg",
    availability: "now",
    example: "5",
    explanation:
      "Ignored unless needed. Size is either height or width, as specified by targetSizeIsHeightBool. Height and width are based on the union of the bounding boxes of all the letters in fontCharacterSet. ",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "targetSizeIsHeightBool",
    availability: "now",
    example: "FALSE",
    explanation:
      'targetSizeIsHeightBool (default FALSE) defines "size" as height (TRUE) or width (FALSE). This parameter is ignored when setting size by spacing.',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "targetSoundChannels",
    availability: "now",
    example: "7",
    explanation:
      "When the target sound file has more than one channel, targetSoundChannels specified how many (randomly selected) channels are used to create the target stimulus. Typically the rest of the channels are taken from the masker sound file.",
    type: "integer",
    default: "9",
    categories: "",
  },
  {
    name: "targetSoundDBSPL",
    availability: "now",
    example: "20",
    explanation:
      'If targetKind is "sound", targetSoundDBSPL specifies desired target sound level in dB SPL. However, to avoid clipping of the waveform, EasyEyes imposes a maximum on this level to prevent the digital sound waveform from exceeding the range ±1. ',
    type: "numerical",
    default: "20",
    categories: "",
  },
  {
    name: "targetSoundFolder",
    availability: "now",
    example: "sounds",
    explanation:
      "⭑ The name of a zip archive of sound files (each file can be in WAV or AAC format), to be used when targetKind==sound. The zip archive is submitted to the EasyEyes drop box, and saved in the Pavlovia account in the Folders folder. The name of the zip archive, without the extension, must match the value of targetSoundFolder. [FUTURE: We could also allow our submit box to accept a folder, which it copies, including all the directly enclosed files.]\n    For speech in noise (targetKind - sound and targetTask- identify) and tone in melody (targetKind- sound and targetTask- detect) experiments, the sound files must be directly inside the zip files and not in another folder within the zip files. Please refer to the example files.\n    Both WAV and AAC sound files can include multiple channels. Because of browser limitations, EasyEyes can use only up to 8 channels per file. AAC files are much more compact (about 10% the bytes as WAV, depending on data rate) but lossy. AAC files are as compact as MP3 files, with much better sound quality. We suggest starting with WAV, and switching to AAC only if you experience an undesirably long delay in loading your sounds. Switching to AAC will reduce your loading time ten-fold (or more, depending on data rate), but may reduce the sound quality slightly.",
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "targetSoundNoiseBool",
    availability: "now",
    example: "TRUE",
    explanation:
      'If targetKind is "sound", and targetSoundNoiseBool is TRUE, then add noise to the target. The noise is zero mean Gaussian white noise, clipped at ±2 SD. Any reported SD is after clipping. Use a 10 ms squared sine ramp at onset and a 10 ms squared cosine ramp at offset. We could add a parameter to request leaving the noise on continuously. ',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "targetSoundNoiseClockHz",
    availability: "now",
    example: "20000",
    explanation: "The clock rate of the auditory noise.",
    type: "numerical",
    default: "20000",
    categories: "",
  },
  {
    name: "targetSoundNoiseDBSPL",
    availability: "now",
    example: "20",
    explanation:
      "The desired noise level in dB SPL. The default (-999) is interpreted as no noise.",
    type: "numerical",
    default: "-999",
    categories: "",
  },
  {
    name: "targetSoundNoiseOffsetReTargetSec",
    availability: "now",
    example: "0.5",
    explanation: "Positive when noise ends after the target ends.",
    type: "numerical",
    default: "0.3",
    categories: "",
  },
  {
    name: "targetSoundNoiseOnsetReTargetSec",
    availability: "now",
    example: "-0.5",
    explanation: "Positive when noise starts after the target starts.",
    type: "numerical",
    default: "-0.3",
    categories: "",
  },
  {
    name: "targetSoundPhrase",
    availability: "now",
    example: "",
    explanation:
      'targetSoundPhrase (default empty string) is a text phrase that is used when targetKind is 16ChannelSound. The phrase consists of a series of words and category names, with each category name preceded by #. Currently the targetSoundPhrase is "Ready Baron GoTo #Color #Number Now". Every word must appear as a sound file with that name, and every category must appear as a folder with that name, both in the current talker folder in the targetSoundFolder.',
    type: "text",
    default: "",
    categories: "",
  },
  {
    name: "targetSpaceConstantDeg",
    availability: "now",
    example: "",
    explanation:
      "targetSpaceConstantDeg (default practially infinite) is the 1/e radius of the Gaussian envelope in deg.",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "targetTask",
    availability: "now",
    example: "identify",
    explanation:
      '⭑ targetTask (default UNDEFINED). Can be one or more of the following categories, separated by commas,\n• identify is forced-choice categorization of the target among known possibilities, e.g. a letter from a characterSet or an orientation among several. \n• questionAndAnswer The participant is asked a question, using the obsolete questionAndAnswerXXX parameter.\n• questionAnswer The participant is asked a question, using the new questionAnswerXXX parameter.\n• detect In yes-no detection, we simply ask "Did you see the target?". In two-alternative forced choice detection, we might display two intervals, only one of which contained the target, and ask the observer which interval had the target: 1 or 2? We rarely use detection because it needs many more trials to measure a threshold because its guessing rate is 50%, whereas identifying one of N targets has a guessing rate of only 1/N.\n🕑 \n• rate. The participant is invited to rate on a scale of 1 to 7. The targetKind can be reading, image, or sound.',
    type: "categorical",
    default: "UNDEFINED",
    categories:
      "UNDEFINED, identify, detect, questionAndAnswer, questionAnswer",
  },
  {
    name: "targetThicknessDeg",
    availability: "now",
    example: "",
    explanation:
      "targetThicknessDeg (default 5/60=0.083) is the stroke thickness of Vernier target.",
    type: "numerical",
    default: "0.083",
    categories: "",
  },
  {
    name: "targetTimeConstantSec",
    availability: "now",
    example: "",
    explanation:
      "targetTimeConstantSec (default practically infinite) is the time for the temporal Gaussian envelope modulating target contrast to drop from 1 to 1/e.",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "targetWhenSec",
    availability: "now",
    example: "0",
    explanation:
      "🕑 targetWhenSec (default 0) indicates how much later the middle time of the target occurs relative to the middle of the movie.",
    type: "numerical",
    default: "0",
    categories: "",
  },
  {
    name: "thresholdAllowedDurationRatio",
    availability: "now",
    example: "1.5",
    explanation:
      "thresholdAllowedDurationRatio. QUEST receives the trial's response only if measured duration is in the range [targetDurationSec/r targetDurationSec*r], where r=thresholdAllowedDurationRatio. r must be greater than 1. Bad durations are common on slow computers. Using _compatibleProcessorCoresMinimum to require at least 6 cores has more or less eliminated the bad durations. (Also see conditionTrials.)",
    type: "numerical",
    default: "1.5",
    categories: "",
  },
  {
    name: "thresholdAllowedGazeRErrorDeg",
    availability: "now",
    example: "4",
    explanation:
      "thresholdAllowedGazeRErrorDeg. QUEST receives the trial's response only if the measured gaze position during target presentation has a radial eccentricity in deg less than or equal to thresholdAllowedGazeRErrorDeg. (Also see conditionTrials.)",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "thresholdAllowedGazeXErrorDeg",
    availability: "now",
    example: "4",
    explanation:
      "thresholdAllowedGazeXErrorDeg. QUEST receives the trial's response only if the measured gaze position during target presentation has an xDeg eccentricity whose absolute value is less than or equal to thresholdAllowedGazeXErrorDeg. (Also see conditionTrials.)",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "thresholdAllowedGazeYErrorDeg",
    availability: "now",
    example: "4",
    explanation:
      "thresholdAllowedGazeYErrorDeg. QUEST receives the trial's response only if the measured gaze position during target presentation has a Y eccentricity whose absolute value is less than or equal to  thresholdAllowedGazeYErrorDeg. (Also see conditionTrials.)",
    type: "numerical",
    default: "1.00E+10",
    categories: "",
  },
  {
    name: "thresholdAllowedLatenessSec",
    availability: "now",
    example: "",
    explanation:
      "thresholdAllowedLatenessSec. QUEST receives the trial's response only if measured target lateness (relative to requested latency) is less than or equal to thresholdAllowedLatenessSec. Excess lateness is common on slow computers. Using _needProcessorCoresMinimum to require at least 6 cores helps a lot, but Maria Pombo's testing with latency of huge lacey fonts (Ballet and Zapfino with fontMaxPx=600) required 12 cores to practically eliminate excessive lateness. Typically QUEST begins each block at the largest possible size (i.e. fontMaxPx, with default 600) and quickly descends to smaller size, and only the largest size is a risk for lateness. (Also see conditionTrials.)",
    type: "numerical",
    default: "0.1",
    categories: "",
  },
  {
    name: "thresholdBeta",
    availability: "now",
    example: "2.3",
    explanation:
      'QUEST sets the "steepness" of the Weibull psychometric function to thresholdBeta.',
    type: "numerical",
    default: "2.3",
    categories: "",
  },
  {
    name: "thresholdDelta",
    availability: "now",
    example: "0.01",
    explanation:
      "thresholdDelta (default 0.01) is the probability of a wrong answer when way above threshold. QUEST sets the asymptote of the Weibull psychometric function to 1-thresholdDelta.",
    type: "numerical",
    default: "0.01",
    categories: "",
  },
  {
    name: "thresholdGamma",
    availability: "now",
    example: "0.5",
    explanation:
      "thresholdGamma (default is empty which is filled in at runtime as explained below) is a parameter of the psychometric function used by QUEST. thresholdGamma is the probability of correct or yes response when the target is at zero strength. In an identification task with n equally-probable possibilities, one should set gamma to 1/n. Currently thresholdGamma defaults to 0.5 (which is appropriate for two-alternative forced choice), unless targetKind=letter.  In that case, if all the letters are unique, then n=length(fontCharacterSet), and the default value for thresholdGamma is 1/n. The various targetTasks and targetKinds should each have different default values of gamma, but currently thresholdGamma always default to 0.5 unless targetKind=letter. If you leave thresholdGamma empty then you'll get the default. If you set thresholdGamma to a numerical probability then that number will overrule the default. NOTE: You are allowed to have repeated letters in fontCharacterSet to give the letters unequal frequency. In that case, the default value of thresholdGamma is set to the probability of the most common letter being the right letter. For example, if fontCharacterSet='AAB', then the default value of thresholdGamma is 2/3.",
    type: "numerical",
    default: "",
    categories: "",
  },
  {
    name: "thresholdGuess",
    availability: "now",
    example: "1",
    explanation:
      "⭑ thresholdGuess is your best guess for threshold, in linear units. (Unlike thresholdGuessLogSd, which is logarithmic.) Used to prime QUEST by providing a prior PDF, which is specified as a Gaussian as a function of the log threshold parameter. Its mean is the log of your guess, and its SD (in log units) is specifed below. We typically take our guess from our standard formulas for size and spacing threshold as a function of eccentricity.",
    type: "numerical",
    default: "1",
    categories: "",
  },
  {
    name: "thresholdGuessLogSd",
    availability: "now",
    example: "2",
    explanation:
      "thresholdGuessLogSd (default 2) specifies what standard deviation (in log units) you want Quest to assume for your threshold guess. Better to err on the high side, so you don't exclude actual cases. Used by QUEST. Sets the standard deviation of the prior PDF as a function of log of the threshold parameter.",
    type: "numerical",
    default: "2",
    categories: "",
  },
  {
    name: "thresholdParameter",
    availability: "now",
    example: "",
    explanation:
      '⭑ thresholdParameter (no default) designates an input parameter (e.g. targetSizeDeg or spacingDeg) that will be controlled by Quest to find the threshold at which criterion performance is attained.  \n• "spacingDeg" (formerly "spacing") varies center-to-center spacing of target and neighboring flankers. \n• "targetSizeDeg" (formerly "size") varies target size. \n• "targetDurationSec" varies target duration.\n• "targetContrast" awaits HDR10 support.\n•  "targetEccentricityXDeg"  may be added in the future.\n• "targetSoundDBSPL" (formerly "soundLevel")  varies target sound level.\n• "targetSoundNoiseDBSPL" varies noise sound level. Not yet implemented.\nNOTE: EasyEyes formerly supported the short crossed-out nicknames (size, spacing, and soundLevel), but we removed them so that only an actual input parameter name (listed in the first column of this Glossary) is allowed as a value of thresholdParameter. ',
    type: "categorical",
    default: "",
    categories:
      "spacingDeg, targetSizeDeg, targetOffsetDeg, targetDurationSec, targetContrast, targetSoundDBSPL, targetSoundNoiseDBSPL, targetOffsetDeg",
  },
  {
    name: "thresholdProcedure",
    availability: "now",
    example: "QUEST",
    explanation:
      'thresholdProcedure (default QUEST) can be QUEST or none. We may add Fechner\'s "method of constant stimuli". Note that when rendering we restrict the threshold parameter to values that can be rendered without artifact, i.e. not too small to have enough pixels to avoid jaggies and not too big for target (and flankers in spacing threshold) to fit entirely on screen. The response returned to QUEST is accompanied by the true value of the threshold parameter, regardless of what QUEST suggested.',
    type: "categorical",
    default: "QUEST",
    categories: "none, QUEST",
  },
  {
    name: "thresholdProportionCorrect",
    availability: "now",
    example: "0.7",
    explanation:
      'thresholdProportionCorrect (default 0.7) is used by QUEST, which calls it "pThreshold". This is the threshold criterion. In Methods you might say that "We defined threshold as the intensity at which the participant attained 70% correct." This corresponds to setting thresholdProportionCorrect to 0.7.\nPsychoJS code:\nhttps://github.com/kurokida/jsQUEST/blob/main/src/jsQUEST.js\nhttps://github.com/psychopy/psychojs/blob/2021.3.0/src/data/QuestHandler.js',
    type: "numerical",
    default: "0.7",
    categories: "",
  },
  {
    name: "thresholdRepeatBadBlockBool",
    availability: "now",
    example: "TRUE",
    explanation:
      '🕑 thresholdRepeatBadBlockBool (default FALSE). If true, and this condition\'s threshold is "bad" (see below), then the block will be run again (only once even if again bad). The criterion for "bad" is that QuestSD>0.25. Several conditions in a block may make this request and be bad, but we still repeat the block only once. When we add a block, we should adjust the trial/block counter to reflect the change. (The 0.25 criterion is right for 35 trials, beta=2.3, and many possible targets. Later i\'ll write a more general formula and provide a way for the scientist to specify an arbitrary criterion value of QuestSD.)',
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "viewingDistanceAllowedRatio",
    availability: "now",
    example: "1.3",
    explanation:
      "viewingDistanceAllowedRatio (default 1.1) must be greater than or equal to zero and specifies a tolerance interval around the desired viewing distance D = viewingDistanceDesiredCm. If viewingDistanceAllowedRatio>1, then the allowed range of viewing distance is D/viewingDistanceAllowedRatio to D*viewingDistanceAllowedRatio. If it's <1 then the allowed range of viewing distance is D*viewingDistanceAllowedRatio to D/viewingDistanceAllowedRatio. A value of 0 allows all viewing distances. Enforcement is only possible when viewing distance is tracked. In that case, testing is paused while viewing distance is outside the allowed range, and the participant is encouraged to move in or out, as appropriate, toward the desired viewing distance. We call that \"nudging\".  [Note: CSV and Excel files do not allow INF.]\n\nTHE NUDGER. When viewing distance is outside the allowed range, the nudger puts up a full-screen opaque display telling the participant to MOVE CLOSER or FARTHER, as appropriate. (This is translated to the appropriate language.) The nudge display goes away when the participant is again within the allowed range. In our experience, the viewing-distance nudger (\"Closer\", \"Farther\") quickly gets the participant to the right distance, and they soon learn to stay there so they see this display only a few times. \n     On any trial, before computing the stimulus, EasyEyes will get a fresh estimate of viewing distance, and, if the nudger is not satisfied, wait until it is. EasyEyes waits until the nudger is satisfied, i.e. the estimated viewing distance is in the allowed range specified by viewingDistanceDesiredCm and viewingDistanceAllowedRatio.\n     We protect the stimulus from nudging. The nudger will never occlude, or forward or backward mask, the stimulus. Think of the trial as beginning at the participant's request for the stimulus (by keypress or clicking or tracking the crosshair) and ending at the click (or keypress) response. This leaves a pre-trial interval from the response until the click requesting the next trial. EasyEyes nudges only before and between trials. Furthermore, to prevent forward masking, EasyEyes ignores attempts to click (or press a key) during nudging and until targetSafetyMarginSec after nudging. Accepted clicks (or keypresses) produce a click sound. Ignored attempts are silent.\n\nPRE-TRIAL INTERVAL. We allow nudging from the time of response to the previous trial (click or keypress) until the participant requests a new trial (press space bar or click or track crosshair). \n\nSTIMULUS & RESPONSE INTERVALS. The stimulus and its memory are protected by disabling nudging from the moment of the participant's request for a new trial until the observer responds. \n\nThe trial software sets the internal parameter nudgingAllowedBool to TRUE only during the pre-trial, and sets nudgingCancelsTrialBool to always be FALSE.  The scientist has no control over nudgingAllowedBool and nudgingCancelsTrialBool.\n\nFUTURE ENHANCEMENT ONCE WE CAN CANCEL TRIALS. If we acquire the possibility of canceling a trial, then we could allow nudging during the stimulus interval, and immediately cancel that trial. Once a trial has been canceled we do NOT wait for a response. Instead, we proceed directly to draw the crosshair for the next trial. Canceling a trial is not trivial. We need to put this trial's condition back into the list of conditions to be run, and that list needs to be reshuffled, so the participant won't know what the next trial will be. I suppose that what happened will be obvious to the participant, so we don't need to explain that the trial was canceled. I see two stages of implementation. First the trial software needs to provide and update two flags: nudgingAllowedBool and nudgingCancelsTrialBool. The current version of MultistairHandler doesn't cope with trial cancelation. For now, the trial software sets nudgingAllowedBool to TRUE only during the pre-trial interval, and sets nudgingCancelsTrialBool to always be FALSE. Once we know how to cancel a trial, during the stimulus interval we'll set both nudgingAllowedBool and nudgingCancelsTrialBool to TRUE. ",
    type: "numerical",
    default: "1.1",
    categories: "",
  },
  {
    name: "viewingDistanceAllowedPreciseBool",
    availability: "now",
    example: "",
    explanation:
      "viewingDistanceAllowedPreciseBool (default FALSE) when TRUE shows the actual viewing distance with 1% precision, e.g. 20.3 cm, instead of the default integer precision, e.g. 23 cm. The high-precision display is useful when checking accuracy of the distance tracking.",
    type: "boolean",
    default: "FALSE",
    categories: "",
  },
  {
    name: "viewingDistanceDesiredCm",
    availability: "now",
    example: "45",
    explanation:
      "⭑ If viewingDistanceDesiredCm is nonzero (default 50), then it specifies the desired viewing distance. If head tracking is enabled, then stimulus generation will be based on the actual viewing distance of each trial. Without head tracking, we estimate the viewing distance at the beginning of the experiment, and later again at the beginning of any new block with a different desired viewing distance. The EasyEyes compiler should require that all conditions within a block have the same desired viewing distance.\n     The output CSV data file reports viewingDistanceCm. If head tracking is enabled, then stimulus generation will be based on the actual viewing distance of each trial. Without head tracking, we estimate the viewing distance at the beginning of the experiment, and later again at the beginning of any new block with a different desired viewing distance. \n     Use viewingDistanceAllowedRatio to control nudging. Nudging is very handy. We find that, with nudging, observers quickly learn to stay in the allowed range, with hardly any perceived effort. \n     To check the accuracy of viewing distance tracking online, set calibrateDistanceCheckBool=TRUE. To check locally, set viewingDistanceNudgingBool=TRUE, possibly with a tight tolerance viewingDistanceAllowedRatio=1.01, as while OUTSIDE the allowed range the nudger provides a live report of measured viewing distance, which you can check with your tape measure.",
    type: "numerical",
    default: "50",
    categories: "",
  },
  {
    name: "viewingDistanceNudgingBool",
    availability: "now",
    example: "",
    explanation:
      "viewingDistanceNudgingBool is obsolete. Use viewingDistanceDesiredCm and viewingDistanceAllowedRatio to control nudging.",
    type: "obsolete",
    default: "",
    categories: "",
  },
  {
    name: "viewMonitorsXYDeg",
    availability: "now",
    example: "",
    explanation:
      '🕑 viewMonitorsXYDeg x1,y1; x2,y2; x3,y3 accepts one or more xy coordinates, one per monitor, each of which specifies an xy eccentricity in deg. The default is no eccentricities, which disables this parameter. The block will be skipped, and an error flagged, if the computer does not have enough monitors.. It\'s ok to have more monitors than needed.\n     EasyEyes will suppose that the scientist probably, but not necessarily, wants the first eccentricity on the main monitor, e.g. the screen that the EasyEyes window first opens on. As a web app, I think that EasyEyes cannot directly measure how many monitors are available. It will display several small windows on the main screen, which each ask to be dragged to the appropriate monitor, e.g. "Drag me to the left monitor." or "Drag me to the middle monitor." or "Drag me to the right monitor.".\n     When using viewMonitorsXYDeg, we will typically have three monitors, and we’ll request three eccentricities. For example:\nviewMonitorsXYDeg 0,0; -60,0; 60,0\nor\nviewMonitorsXYDeg 0,0; 0,-60; 0,60\nThe first example is for testing the horizontal meridian; the second is for the vertical meridian. Each request asks EasyEyes to place three monitors, one for each eccentricity, with the monitor’s screen orthogonal to the observer’s line of sight (from the nearer eye) at the specified eccentricity. The point in the plane of the screen where the nearer eye\'s sight line is orthogonal to the flat screen. We refer to it as the screen’s nearest point.  The monitor should be placed so that the nearest point is at the specified viewingDistanceDesiredCm and eccentricity, and as near as possible to the screen center, while avoiding monitor collisions.\n     When viewMonitorsXYDeg provides N eccentricities, demanding N monitors. EasyEyes needs to know the size (width and height) and margins of each monitor. The first time, it will display N little windows on the main screen and ask the participant to drag each window to the monitor it belongs on. Then it will ask the participant to measure (in cm) and type in the each screen\'s width, height, and margins. It will save this, so for subsequent blocks of the same experiment there is minimal fuss.\n\nARGUMENT PARSING, CHECKED BY COMPILER: There can be zero or more xy coordinates, separated by semicolons. Each coordinate consists of two comma-separated numbers. Each number must be in the range ±180 deg. The tokens are numbers, commas, and semicolns. Spaces between tokens are ignored. So are leading and trailing spaces. Missing numbers are a fatal error. \n\nFUTURE: We plan to add general support for vectors and matrices. Syntax will be like MATLAB in using commas to separate elements in a row, and semicolons to separate rows. Thus viewMonitorsXYDeg will accept a 2×N matrix. with 2 elements per row, and any number of rows.',
    type: "text",
    default: "",
    categories: "",
  },
];

export const SUPER_MATCHING_PARAMS: string[] = [
  "questionAndAnswer@@",
  "questionAnswer@@",
];
