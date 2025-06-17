import {
  ERROR_CREATING_TYPEKIT_KIT,
  FONT_FILES_MISSING_WEB,
  TYPEKIT_FONTS_MISSING,
} from "./errorMessages";
import { typekit } from "./global";

export const webFontChecker = async (
  requestedFontListWeb: string[],
): Promise<any> => {
  const errorList: any[] = [];
  for (let i = 0; i < requestedFontListWeb.length; i++) {
    const response = await fetchWebFont(
      requestedFontListWeb[i].replace(/\s/g, "+").replace(/(\r\n|\n|\r)/gm, ""),
    );
    if (!response) {
      errorList.push(requestedFontListWeb[i]);
    }
  }

  if (errorList.length > 0) return FONT_FILES_MISSING_WEB("font", errorList);
  else return errorList;
};

const fetchWebFont = async (font: string) => {
  const url = `https://fonts.googleapis.com/css?family=${font}`;
  return await fetch(url)
    .then((response) => {
      return true;
    })
    .catch((error) => {
      return false;
    });
};
const createNewKit = async (
  requestedTypekitFonts: string[],
  experimentName: string,
): Promise<boolean> => {
  // https://typekit.com/api/v1/json/kits?name=Example&domains=*
  // kit name will be the experimentName + timestamp
  const kitName = `${experimentName}-${Date.now()}`;
  try {
    const domains = ["localhost", "run.pavlovia.org"];
    // post request to create a new kit
    const response = await fetch(
      `https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/https://typekit.com/api/v1/json/kits?name=${kitName}&domains=${domains.join(
        ",",
      )}`,
      {
        method: "POST",
        headers: {
          usetypekittoken: "true",
        },
      },
    ).then((response) => {
      return response.json();
    });

    if (response.kit) {
      // read "kit" from response. Read "id" from "kit"
      const kit = response.kit;
      const kitId = kit.id;
      typekit.kitId = kitId;

      // create a new font family for each font in requestedTypekitFonts
      // https://typekit.com/api/v1/json/kits/:kitID/families/:familyID
      for (let i = 0; i < requestedTypekitFonts.length; i++) {
        const fontFamily = requestedTypekitFonts[i];
        const response = await fetch(
          `https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/https://typekit.com/api/v1/json/kits/${kitId}/families/${fontFamily}`,
          {
            method: "POST",
            headers: {
              usetypekittoken: "true",
            },
          },
        ).then((response) => {
          return response.json();
        });
        // save css_names from response.family
        typekit.fonts.set(fontFamily, response.family.css_names[0]);
      }

      //publish the kit at kits/:kit/publish
      await fetch(
        `https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/https://typekit.com/api/v1/json/kits/${kitId}/publish`,
        {
          method: "POST",
          headers: {
            usetypekittoken: "true",
          },
        },
      ).then((response) => {
        return response.json();
      });
      return true;
    } else return false;
  } catch (error) {
    console.log("error", error);
    return false;
  }
};

const doesTypeKitFontFamilyExist = async (
  fontFamily: string,
): Promise<boolean> => {
  //https://typekit.com/api/v1/json/families/:familyID
  // if 404 return false
  // if 200 return true

  try {
    const response = await fetch(
      `https://easyeyes-cors-proxy-1cf4742aef20.herokuapp.com/https://typekit.com/api/v1/json/families/${fontFamily}`,
      {
        headers: {
          usetypekittoken: "true",
        },
      },
    );

    return response.status === 200;
  } catch (error) {
    return false;
  }
};

export const processTypekitFonts = async (
  requestedTypekitFonts: string[],
  experimentName: string,
) => {
  const missingFontList: string[] = [];
  for (let i = 0; i < requestedTypekitFonts.length; i++) {
    const fontFamily = requestedTypekitFonts[i];
    const doesFontFamilyExistBool =
      await doesTypeKitFontFamilyExist(fontFamily);
    if (!doesFontFamilyExistBool) {
      missingFontList.push(fontFamily);
    }
  }

  if (missingFontList.length > 0)
    return TYPEKIT_FONTS_MISSING("font", missingFontList);
  else {
    const createNewKitBool = await createNewKit(
      requestedTypekitFonts,
      experimentName,
    );
    if (!createNewKitBool) return ERROR_CREATING_TYPEKIT_KIT();
    return missingFontList;
  }
};
