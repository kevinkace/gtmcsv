"use strict";

const fs = require("fs");
const util = require("util");
const rfp = util.promisify(fs.readFile);
const wfp = util.promisify(fs.writeFile);

const glob = require("glob-promise");
const csv = require("csv-string");

glob("./data/*.json")
    .then((files) =>
        Promise.all(files.map((file) => rfp(file, "utf8")))
    )
    .then((fileDatas) => {
        // let csvArr =
        return fileDatas.map((fileData) => ({
            csv : [[ "tag id", "name", "code", "triggers", "last upated" ]],
            fileData
        }));
    })
    .then((dataObjs) => {
        dataObjs.forEach((dataObj) => {
            const json = JSON.parse(dataObj.fileData);
            const tags = json.containerVersion.tag;

            tags.forEach((tag) => {
                const date = new Date(parseInt(tag.fingerprint)).toString().split(" GMT")[0];
                let code;

                tag.parameter.some((param) => {
                    if(param.type !== "TEMPLATE") {
                        return false;
                    }

                    code = param.value;

                    return true;
                });

                dataObj.csv.push([
                    tag.tagId,
                    tag.name,
                    code,
                    (tag.firingTriggerId || []).join("\n"),
                    date
                ]);
            });
        });

        return dataObjs;
    })
    .then((dataObjs) =>
        Promise.all(dataObjs.map((dataObj, idx) =>
            wfp(`./file-${idx}.csv`, csv.stringify(dataObj.csv))
        ))
    );
