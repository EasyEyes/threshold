interface Glossary {
  [parameter: string]: { [field: string]: string | string[] };
}

interface Window {
  GLOSSARY: Glossary;
  GLOSSARY_FULL: Glossary;
  SUPER_MATCHING_PARAMS: string[];
}
