import { analyze } from "../shared/risk.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const cases = JSON.parse(await readFile(new URL("../tests/fixtures/evaluation.json", import.meta.url), "utf8"));
let tp=0,fp=0,tn=0,fn=0;
const rows=cases.map(item=>{const start=performance.now();const result=analyze(item.url,item.counts);const durationMs=performance.now()-start;const detected=result.score>30;if(item.risky&&detected)tp++;else if(item.risky)fn++;else if(detected)fp++;else tn++;return {...item,...result,durationMs};});
const report={dataset:"Synthetic controlled indicators. Not a real-world phishing benchmark.",n:rows.length,tp,fp,tn,fn,precision:tp/(tp+fp)||0,recall:tp/(tp+fn)||0,falsePositiveRate:fp/(fp+tn)||0,rows};
await mkdir(new URL("../test-results/",import.meta.url),{recursive:true});await writeFile(new URL("../test-results/evaluation.json",import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,rows:undefined},null,2));
