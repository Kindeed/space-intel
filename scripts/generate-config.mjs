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

let hasDrift = false;

for (const [yamlFile, jsonFile] of configPairs) {
  const jsonPath = resolve(configDir, jsonFile);
  const generated = await generatedJsonFromYaml(yamlFile);

  if (checkOnly) {
    const current = await readFile(jsonPath, 'utf8');

    if (current !== generated) {
      console.error(`${jsonFile} is out of sync with ${yamlFile}`);
      hasDrift = true;
    }

    continue;
  }

  await writeFile(jsonPath, generated);
  console.log(`generated ${jsonFile}`);
}

if (hasDrift) {
  process.exitCode = 1;
}
