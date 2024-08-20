const json = require('./res.json')
const { writeFileSync, mkdirSync } = require('node:fs')
// const Buffer = require('Buffer')

console.log(json)


const entries = json.log.entries

for (const item of entries) {
  const path = item.request.url.replace('https://res.wqop2018.com/partner/hzdy/gbzwb/H5_gbzwb/8_1/web-mobile', '.')
  const content = item.response.content.text

  // Create ./tmp/a/apple, regardless of whether ./tmp and ./tmp/a exist.
  const dirPath = path.split('/').slice(0, -1).join('/')
  mkdirSync(dirPath, { recursive: true });

  try {
    if (item.response.content.encoding === 'base64') {
      const buffer = Buffer.from(content, 'base64');
      writeFileSync(path, buffer, { encoding: 'base64'});
    } else {
      writeFileSync(path, content);
    }
    console.log('The "data to append" was appended to file!');
  } catch (err) {
    /* Handle the error */
  } 
}