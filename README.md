# crowding

A PsychoPy (soon PsychoJS) implementation of crowding threshold measurement experiment.

![Process](./media/process.png)

## Example CSV File

```
block,label,startVal,startValSd,minVal,maxVal,font,eccentricityXDeg,eccentricityYDeg,direction,durationS,trialsDesired
1,right,0.3,2,-1,1.3,sloan,10,0,tangential,1,5
1,left,0.3,2,-1,1.3,sloan,-10,0,radial,1,5
2,right,0.3,2,-1,1.3,sloan,10,0,tangential,3,1
2,left,0.3,2,-1,1.3,sloan,-10,0,radial,3,1
2,left,0.3,2,-1,1.3,sloan,-10,0,radial,1,5
3,right,0.3,2,-1,1.3,sloan,10,1,tangential,1,5
```

A **CSV file** named `stairDefinitions.csv` must be placed at the same directory as the PsychoPy file. The program will take care of the rest.

## PsychoPy Version

`2021.2.1`.
