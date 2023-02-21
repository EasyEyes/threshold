# EasyEyes Threshold

📖 [**Manual**](https://docs.google.com/document/d/e/2PACX-1vTTrqaSyva2afVupLchBjfTHc_YW5jAbEexGbudXMJ9xMKPBDA3nxQmHXa4wjnAoSVabeEA8T9CGIMa/pub)<br />
📝 [**Parameter Glossary**](https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8QswX_5h_oNS2Ly6VgoONGIxJHqDFjdZqWY_HUxH2Nr_LNkGDBL8FXz74l9BxVNR2AIXGhHir9GAd/pub?gid=1287694458&single=true&output=pdf)<br />
🌏 [**Webapp**](https://easyeyes.app/experiment/) (beta)

A PsychoJS-based experiment generator for the measuring various psychometric thresholds, e.g., crowding. Please visit [https://easyeyes.app/experiment](https://easyeyes.app/experiment/) for more instructions.

## Development

To clone this repo, use

```shell
git clone --recurse-submodules https://github.com/EasyEyes/threshold.git
```

Then, run the following for the initial setup

```shell
npm install
npm run build
```

To develop based on a specific experiment table, use

```shell
npm run examples [tableName].[xlsx] # you may also run `npm run examples` to prepare for all tables in your examples/tables folder
npm start -- --name=[tableName] # start hot-reload development
```

You may then open Live Server (a VSCode extension) to preview lively. You need to rerun `npm run examples [your table name]` every time you edit the HTML file.

## PsychoJS Version

We build EasyEyes Threshold with PsychoJS `2022.1.3`.
