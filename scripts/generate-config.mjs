import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const checkOnly = process.argv.includes('--check');
const configDir = resolve('config');
const configPairs = [
  ['sources.yaml', 'sources.generated.json'],
  ['companies.yaml', 'companies.generated.json'],
  ['topics.yaml', 'topics.generated.json'],
  ['curations.yaml', 'curations.generated.json'],
];

async function generatedJsonFromYaml(yamlFile) {
  const yamlText = await readFile(resolve(configDir, yamlFile), 'utf8');
  return `${JSON.stringify(parse(yamlText) ?? {}, null, 2)}\n`;
}

async function processConfigPair([yamlFile, jsonFile]) {
  const jsonPath = resolve(configDir, jsonFile);
  const generated = await generatedJsonFromYaml(yamlFile);

  if (checkOnly) {
    const current = await readFile(jsonPath, 'utf8');

    if (current !== generated) {
      return { drift: true, message: `${jsonFile} is out of sync with ${yamlFile}` };
    }

    return { drift: false, message: null };
  }

  await writeFile(jsonPath, generated);
  return { drift: false, message: `generated ${jsonFile}` };
}

const results = await Promise.all(configPairs.map(processConfigPair));

for (const result of results) {
  if (!result.message) {
    continue;
  }

  if (result.drift) {
    console.error(result.message);
  } else {
    console.log(result.message);
  }
}

if (results.some((result) => result.drift)) {
  process.exitCode = 1;
}
