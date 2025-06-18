import {
  ERROR_CREATING_TYPEKIT_KIT,
  FONT_FILES_MISSING_WEB,
  TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION,
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
): Promise<[boolean, string[]]> => {
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
      const fontsWithErrors: string[] = [];
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
        if (response.errors) {
          fontsWithErrors.push(fontFamily);
          continue;
        }
        // save css_names from response.family
        typekit.fonts.set(fontFamily, response.family.css_names[0]);
      }
      if (fontsWithErrors.length > 0) return [false, fontsWithErrors];
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
      return [true, []];
    } else return [false, []];
  } catch (error) {
    return [false, []];
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
  typekitFontColumnMap: Record<string, { columns: string[]; blocks: number[] }>,
  experimentName: string,
) => {
  const missingFontList: Record<
    string,
    { columns: string[]; blocks: number[] }
  > = {};
  if (requestedTypekitFonts.length === 0) return [];
  for (let i = 0; i < requestedTypekitFonts.length; i++) {
    const fontFamily = requestedTypekitFonts[i];
    const doesFontFamilyExistBool =
      await doesTypeKitFontFamilyExist(fontFamily);
    if (!doesFontFamilyExistBool) {
      missingFontList[fontFamily] = {
        columns: typekitFontColumnMap[fontFamily].columns,
        blocks: typekitFontColumnMap[fontFamily].blocks,
      };
    }
  }

  if (Object.keys(missingFontList).length > 0)
    return TYPEKIT_FONTS_MISSING("font", missingFontList);
  else {
    const [createNewKitBool, fontsWithErrors] = await createNewKit(
      requestedTypekitFonts,
      experimentName,
    );
    if (fontsWithErrors.length > 0) {
      const fontList: Record<string, { columns: string[]; blocks: number[] }> =
        {};
      for (let i = 0; i < fontsWithErrors.length; i++) {
        fontList[fontsWithErrors[i]] = {
          columns: typekitFontColumnMap[fontsWithErrors[i]].columns,
          blocks: typekitFontColumnMap[fontsWithErrors[i]].blocks,
        };
      }
      return TYPEKIT_FONT_ONLY_AVAILABLE_WITH_SUBSCRIPTION("font", fontList);
    }
    if (!createNewKitBool) return ERROR_CREATING_TYPEKIT_KIT();
    return missingFontList;
  }
};
