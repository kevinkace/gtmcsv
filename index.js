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
            csv : [[ "tag id", "name", "triggers", "last updated", "code" ]],
            fileData
        }));
    })
    .then((dataObjs) => {
        dataObjs.forEach((dataObj) => {
            const json = JSON.parse(dataObj.fileData);
            const tags = json.containerVersion.tag;

            tags
                .sort((tagA, tagB) =>
                    parseInt(tagA.fingerprint, 10) - parseInt(tagB.fingerprint, 10) > 0 ? -1 : 1
                )
                .forEach((tag) => {
                    const date = new Date(parseInt(tag.fingerprint, 10)).toString().split(" GMT")[0];
                    let triggers = (tag.firingTriggerId || [])
                        .map((triggerId) => {
                            let trigger;

                            json.containerVersion.trigger.some((trig) => {
                                if(trig.triggerId !== triggerId) {
                                    return false;
                                }

                                trigger = trig.name;
                            });

                            return trigger;
                        }).join("\n");
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
                        triggers,
                        date,
                        code
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
