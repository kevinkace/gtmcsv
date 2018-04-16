"use strict";

const fs = require("fs");
const path = require("path");
const util = require("util");
const rfp = util.promisify(fs.readFile);
const wfp = util.promisify(fs.writeFile);

const glob = require("glob-promise");
const csv = require("csv-string");

let files;

glob("./data/*.json")
    .then((f) => {
        files = f;

        console.log(`Found ${f.length} files`);
        console.log(JSON.stringify(f, null, 2));

        return Promise.all(f.map((file) => rfp(file, "utf8")));
    })
    .then((fileDatas) =>
        // create obj for each file, append data
        fileDatas.map((fileData) => ({
            csv : [[ "tag id", "name", "triggers", "last updated", "code" ]],
            fileData
        }))
    )
    .then((dataObjs) => {
        dataObjs.forEach((dataObj, idx) => {
            const json = JSON.parse(dataObj.fileData);
            const tags = json.containerVersion.tag;

            if(!tags) {
                console.log(`No tags found in ${files[idx]}`);

                return;
            }

            console.log(`Found ${tags.length} tags`);

            tags
                .sort((tagA, tagB) =>
                    parseInt(tagA.fingerprint, 10) - parseInt(tagB.fingerprint, 10) > 0 ? -1 : 1
                )
                .forEach((tag) => {
                    const date = new Date(parseInt(tag.fingerprint, 10)).toString().split(" GMT")[0];

                    let code;
                    let triggers = (tag.firingTriggerId || [])
                        .map((triggerId) => {
                            let trigger;

                            (json.containerVersion.trigger || []).some((trig) => {
                                if(trig.triggerId !== triggerId) {
                                    return false;
                                }

                                trigger = trig.name;
                            });

                            return trigger;
                        }).join("\n");

                    (tag.parameter || []).some((param) => {
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
        Promise.all(dataObjs.map((dataObj, idx) => {
            const base = `${path.parse(files[idx]).name}.csv`;

            console.log(`Writing ${files[idx]}`);

            return wfp(`./csv/${base}`, csv.stringify(dataObj.csv));
        }))
    )
    .then(() => {
        console.log("DONE!");
    });
