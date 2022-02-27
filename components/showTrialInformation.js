/* ----------------------------- Condition Name ----------------------------- */

export const showConditionName = (
  showConditionNameBool,
  showTargetSpecsBool,
  conditionName,
  targetSpecs,
  conditionNameToShow
) => {
  if (showConditionNameBool) {
    conditionName.setText(conditionNameToShow);
    if (showTargetSpecsBool) {
      conditionName.setPos([
        -window.innerWidth / 2,
        targetSpecs.getBoundingBox(true).height,
      ]);
    } else {
      conditionName.setPos([-window.innerWidth / 2, -window.innerHeight / 2]);
    }

    conditionName.setAutoDraw(true);
  }
};

export const updateConditionNameConfig = (
  conditionNameConfig,
  updateForTargetSpecs,
  targetSpecs = null
) => {
  if (updateForTargetSpecs && targetSpecs) {
    conditionNameConfig.x = -window.innerWidth / 2;
    conditionNameConfig.y = targetSpecs.getBoundingBox(true).height;
  } else {
    conditionNameConfig.x = -window.innerWidth / 2;
    conditionNameConfig.y = -window.innerHeight / 2;
  }
};
